"use client";

import { useState } from "react";
import type { KnowledgeDetail } from "@/lib/knowledge-types";
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
      <p className="text-sm font-medium text-gray-300">Tags</p>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {removed.map((tag) => (
          <span
            key={`rm-${tag}`}
            className="rounded bg-red-900/40 px-2 py-0.5 text-xs text-red-300 line-through"
          >
            {tag}
          </span>
        ))}
        {unchanged.map((tag) => (
          <span
            key={`eq-${tag}`}
            className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
          >
            {tag}
          </span>
        ))}
        {added.map((tag) => (
          <span
            key={`add-${tag}`}
            className="rounded bg-green-900/40 px-2 py-0.5 text-xs text-green-300"
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
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
          Metadata Changes
        </h3>
        {hasMetadataChanges ? (
          <div className="space-y-4">
            {metadataChanges.map((field) => (
              <div key={field.key}>
                <p className="text-sm font-medium text-gray-300">
                  {field.label}
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-sm text-red-400 line-through">
                    {String(
                      currentObject[field.key as keyof KnowledgeDetail] ?? "—",
                    )}
                  </span>
                  <span className="text-gray-600">→</span>
                  <span className="text-sm text-green-300">
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
          <p className="text-sm text-gray-500">No metadata changes</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">View:</span>
        <button
          onClick={() => setViewMode("unified")}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            viewMode === "unified"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Unified
        </button>
        <button
          onClick={() => setViewMode("side-by-side")}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            viewMode === "side-by-side"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-gray-300"
          }`}
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
