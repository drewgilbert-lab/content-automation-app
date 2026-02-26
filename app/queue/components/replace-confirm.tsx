"use client";

import { useState, useCallback } from "react";
import { MarkdownRenderer } from "@/app/knowledge/components/markdown-renderer";

interface ReplaceConfirmProps {
  proposedContent: string;
  submissionId: string;
  onDiscard: () => void;
  onSaved: () => void;
}

export function ReplaceConfirm({
  proposedContent,
  submissionId,
  onDiscard,
  onSaved,
}: ReplaceConfirmProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/submissions/${submissionId}/merge/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mergedContent: proposedContent }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Replace failed");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replace failed");
      setSaving(false);
    }
  }, [submissionId, proposedContent, onSaved]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white">Replace with Proposed</h3>
        <p className="mt-1 text-sm text-gray-400">
          Review the proposed content below. Confirming will overwrite the current version entirely.
        </p>
      </div>

      {/* Warning banner */}
      <div className="rounded-lg border border-amber-700 bg-amber-950/30 px-4 py-3">
        <p className="text-sm font-medium text-amber-300">Warning</p>
        <p className="mt-1 text-sm text-amber-200">
          This will fully replace the current version with the proposed content. The existing content will be permanently overwritten and cannot be recovered.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Proposed content preview */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h4 className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-500">
          Proposed Content (will become the new version)
        </h4>
        <MarkdownRenderer content={proposedContent} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Replacing..." : "Confirm Replace"}
        </button>
        <button
          onClick={onDiscard}
          disabled={saving}
          className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 hover:border-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
