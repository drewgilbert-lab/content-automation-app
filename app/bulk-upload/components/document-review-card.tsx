"use client";

import { useState } from "react";
import type { ClassificationResult, SuggestedRelationship } from "@/lib/classification-types";
import type { KnowledgeType } from "@/lib/knowledge-types";
import { VALID_TYPES, getTypeLabel } from "@/lib/knowledge-types";
import { TypeBadge } from "@/app/knowledge/components/type-badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { cn } from "@/lib/utils";
import { ConfidenceBadge } from "./confidence-badge";
import { TagEditor } from "./tag-editor";

interface DocumentReviewCardProps {
  index: number;
  filename: string;
  content: string;
  wordCount: number;
  classification: ClassificationResult;
  selected: boolean;
  onToggleSelect: (index: number) => void;
  onEdit: (index: number, edits: Partial<ClassificationResult>) => void;
  onReclassify: (index: number) => void;
  onRemove: (index: number) => void;
  reclassifying?: boolean;
}

const PREVIEW_LENGTH = 500;

export function DocumentReviewCard({
  index,
  filename,
  content,
  wordCount: _wordCount,
  classification,
  selected,
  onToggleSelect,
  onEdit,
  onReclassify,
  onRemove,
  reclassifying = false,
}: DocumentReviewCardProps) {
  const [previewExpanded, setPreviewExpanded] = useState(false);

  const preview = content.slice(0, PREVIEW_LENGTH);
  const hasMore = content.length > PREVIEW_LENGTH ? content.slice(PREVIEW_LENGTH) : "";

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onEdit(index, { objectType: e.target.value as KnowledgeType });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEdit(index, { objectName: e.target.value });
  };

  const handleTagsChange = (tags: string[]) => {
    onEdit(index, { tags });
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-gray-900 p-4",
        classification.needsReview ? "border-amber-500/20" : "border-gray-800",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(index)}
            className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
          />
          <span className="truncate text-sm font-medium text-white">{filename}</span>
        </label>
        <ConfidenceBadge
          confidence={classification.confidence}
          needsReview={classification.needsReview}
        />
        <TypeBadge type={classification.objectType} />
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-xs text-gray-400">Type</label>
          <Select
            value={classification.objectType}
            onChange={handleTypeChange}
            className="px-3 py-2"
          >
            {VALID_TYPES.map((t) => (
              <option key={t} value={t}>
                {getTypeLabel(t)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Name</label>
          <Input
            type="text"
            value={classification.objectName}
            onChange={handleNameChange}
            className="px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Tags</label>
          <TagEditor
            tags={classification.tags}
            onChange={handleTagsChange}
          />
        </div>
      </div>

      <div className="mt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
          onClick={() => setPreviewExpanded(!previewExpanded)}
        >
          Content Preview {previewExpanded ? "Show less" : "Show more"}
        </Button>
        <div className="mt-2 rounded-lg bg-gray-800 p-3 text-sm text-gray-300">
          <pre className="whitespace-pre-wrap font-sans">
            {preview}
            {previewExpanded && hasMore ? hasMore : content.length > PREVIEW_LENGTH ? "…" : ""}
          </pre>
        </div>
      </div>

      {classification.suggestedRelationships?.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-medium text-gray-400">Suggested relationships</h4>
          <ul className="space-y-1 text-sm text-gray-300">
            {classification.suggestedRelationships.map((r: SuggestedRelationship, i: number) => (
              <li key={i}>
                {r.relationshipType} → {r.targetName} ({r.targetType})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex gap-2 border-t border-gray-800 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          loading={reclassifying}
          onClick={() => onReclassify(index)}
        >
          Reclassify
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-red-400 hover:text-red-300"
          onClick={() => onRemove(index)}
        >
          Remove
        </Button>
      </div>
    </div>
  );
}
