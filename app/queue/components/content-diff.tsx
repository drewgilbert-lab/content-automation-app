"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { KnowledgeDetail } from "@/lib/knowledge-types";
import { cn } from "@/lib/utils";
import { VisualDiff } from "./visual-diff";

interface ProposedContent {
  name?: string;
  content?: string;
  tags?: string[];
  subType?: string;
  revenueRange?: string;
  employeeRange?: string;
}

interface ContentDiffProps {
  currentObject: KnowledgeDetail;
  proposedContent: ProposedContent;
}

const METADATA_FIELDS: {
  key: keyof ProposedContent;
  label: string;
}[] = [
  { key: "name", label: "Name" },
  { key: "subType", label: "Sub Type" },
  { key: "revenueRange", label: "Revenue Range" },
  { key: "employeeRange", label: "Employee Range" },
];

function TagsDiff({
  currentTags,
  proposedTags,
}: {
  currentTags: string[];
  proposedTags: string[];
}) {
  const added = proposedTags.filter((t) => !currentTags.includes(t));
  const removed = currentTags.filter((t) => !proposedTags.includes(t));
  const unchanged = currentTags.filter((t) => proposedTags.includes(t));

  if (added.length === 0 && removed.length === 0) return null;

  return (
    <div>
      <p className="text-body font-medium text-text-secondary">Tags</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {removed.map((tag) => (
          <span
            key={`rm-${tag}`}
            className="rounded bg-status-danger-bg px-2 py-0.5 text-caption text-status-danger line-through"
          >
            {tag}
          </span>
        ))}
        {unchanged.map((tag) => (
          <span
            key={`eq-${tag}`}
            className="rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary"
          >
            {tag}
          </span>
        ))}
        {added.map((tag) => (
          <span
            key={`add-${tag}`}
            className="rounded bg-status-success-bg px-2 py-0.5 text-caption text-status-success"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ContentDiff({
  currentObject,
  proposedContent,
}: ContentDiffProps) {
  const [viewMode, setViewMode] = useState<"unified" | "side-by-side">(
    "unified",
  );

  const metadataChanges = METADATA_FIELDS.filter((field) => {
    const proposed = proposedContent[field.key];
    if (proposed === undefined) return false;
    const current = currentObject[field.key as keyof KnowledgeDetail] ?? "";
    return proposed !== current;
  });

  const hasTagChanges =
    proposedContent.tags !== undefined &&
    (proposedContent.tags.length !== currentObject.tags.length ||
      proposedContent.tags.some((t) => !currentObject.tags.includes(t)));

  const hasMetadataChanges = metadataChanges.length > 0 || hasTagChanges;

  return (
    <div className="space-y-6">
      <div className="rounded-card border border-border-default bg-surface-card p-6">
        <h3 className="text-label uppercase tracking-widest text-text-muted mb-4">
          Metadata Changes
        </h3>
        {hasMetadataChanges ? (
          <div className="space-y-4">
            {metadataChanges.map((field) => (
              <div key={field.key}>
                <p className="text-body font-medium text-text-secondary">
                  {field.label}
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-body text-status-danger line-through">
                    {String(
                      currentObject[field.key as keyof KnowledgeDetail] ?? "—",
                    )}
                  </span>
                  <ArrowRight className="h-4 w-4 text-text-muted" />
                  <span className="text-body text-status-success">
                    {String(proposedContent[field.key] ?? "—")}
                  </span>
                </div>
              </div>
            ))}
            {hasTagChanges && (
              <TagsDiff
                currentTags={currentObject.tags}
                proposedTags={proposedContent.tags!}
              />
            )}
          </div>
        ) : (
          <p className="text-body text-text-muted">No metadata changes</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-caption text-text-muted">View:</span>
        <button
          onClick={() => setViewMode("unified")}
          className={cn(
            "rounded px-2.5 py-1 text-caption font-medium transition-colors",
            viewMode === "unified"
              ? "bg-surface-active text-text-primary"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          Unified
        </button>
        <button
          onClick={() => setViewMode("side-by-side")}
          className={cn(
            "rounded px-2.5 py-1 text-caption font-medium transition-colors",
            viewMode === "side-by-side"
              ? "bg-surface-active text-text-primary"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          Side by Side
        </button>
      </div>

      <VisualDiff
        original={currentObject.content}
        modified={proposedContent.content ?? currentObject.content}
        mode={viewMode}
      />
    </div>
  );
}
