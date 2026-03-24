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
        <h3 className="text-subheading text-text-primary">Replace with Proposed</h3>
        <p className="mt-1 text-body text-text-secondary">
          Review the proposed content below. Confirming will overwrite the current version entirely.
        </p>
      </div>

      {/* Warning banner */}
      <div className="rounded-lg border border-status-warning/30 bg-status-warning-bg px-4 py-3">
        <p className="text-body font-medium text-status-warning">Warning</p>
        <p className="mt-1 text-body text-status-warning">
          This will fully replace the current version with the proposed content. The existing content will be permanently overwritten and cannot be recovered.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-status-danger/30 bg-status-danger-bg px-4 py-3">
          <p className="text-body text-status-danger">{error}</p>
        </div>
      )}

      {/* Proposed content preview */}
      <div className="rounded-card border border-border-default bg-surface-card p-6">
        <h4 className="mb-4 text-label uppercase tracking-widest text-text-muted">
          Proposed Content (will become the new version)
        </h4>
        <MarkdownRenderer content={proposedContent} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="rounded-lg bg-action-primary px-5 py-2.5 text-body font-medium text-text-primary hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Replacing..." : "Confirm Replace"}
        </button>
        <button
          onClick={onDiscard}
          disabled={saving}
          className="rounded-lg border border-border-default px-5 py-2.5 text-body font-medium text-text-secondary hover:border-border-default/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
