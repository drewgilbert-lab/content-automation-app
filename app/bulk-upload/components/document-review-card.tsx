"use client";

import { useState } from "react";
import type { ClassificationResult, SuggestedRelationship } from "@/lib/classification-types";
import type { KnowledgeType } from "@/lib/knowledge-types";
import { VALID_TYPES, getTypeLabel } from "@/lib/knowledge-types";
import { TypeBadge } from "@/app/knowledge/components/type-badge";
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
      className={`rounded-xl border bg-gray-900 p-4 ${
        classification.needsReview ? "border-amber-500/20" : "border-gray-800"
      }`}
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
          <select
            value={classification.objectType}
            onChange={handleTypeChange}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600"
          >
            {VALID_TYPES.map((t) => (
              <option key={t} value={t}>
                {getTypeLabel(t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Name</label>
          <input
            type="text"
            value={classification.objectName}
            onChange={handleNameChange}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-600"
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
        <button
          type="button"
          onClick={() => setPreviewExpanded(!previewExpanded)}
          className="text-sm text-gray-400 hover:text-white"
        >
          Content Preview {previewExpanded ? "Show less" : "Show more"}
        </button>
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
        <button
          type="button"
          onClick={() => onReclassify(index)}
          disabled={reclassifying}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {reclassifying ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : null}
          Reclassify
        </button>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
