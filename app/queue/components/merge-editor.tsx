"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { VisualDiff } from "./visual-diff";

interface MergeEditorProps {
  currentContent: string;
  submissionId: string;
  onDiscard: () => void;
  onSaved: () => void;
}

export function MergeEditor({
  currentContent,
  submissionId,
  onDiscard,
  onSaved,
}: MergeEditorProps) {
  const [editedText, setEditedText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accumulatorRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    async function runMerge() {
      setStreaming(true);
      setError(null);
      accumulatorRef.current = "";

      try {
        const res = await fetch(`/api/submissions/${submissionId}/merge`, {
          method: "POST",
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Merge failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done || cancelled) break;
          const chunk = decoder.decode(value, { stream: true });
          accumulatorRef.current += chunk;
          setEditedText(accumulatorRef.current);
        }

        if (!cancelled) {
          setStreamComplete(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Merge failed");
        }
      } finally {
        if (!cancelled) {
          setStreaming(false);
        }
      }
    }

    runMerge();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/submissions/${submissionId}/merge/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mergedContent: editedText }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Save failed");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }, [submissionId, editedText, onSaved]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-subheading text-text-primary">AI Merge Editor</h3>
          <p className="mt-1 text-body text-text-secondary">
            {streaming
              ? "Generating merged content..."
              : streamComplete
                ? "Review the merged result below. Edit as needed, then save or discard."
                : ""}
          </p>
        </div>
        {streaming && (
          <div className="flex items-center gap-2 text-body text-text-secondary">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-hg-blue" />
            Streaming
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-status-danger/30 bg-status-danger-bg px-4 py-3">
          <p className="text-body text-status-danger">{error}</p>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: tracked-changes diff view */}
        <div className="rounded-card border border-border-default bg-surface-card p-6">
          <h4 className="mb-4 text-label uppercase tracking-widest text-text-muted">
            Tracked Changes
          </h4>
          {editedText ? (
            <VisualDiff original={currentContent} modified={editedText} mode="unified" />
          ) : (
            <div className="prose prose-invert max-w-none whitespace-pre-wrap break-words text-body leading-relaxed">
              <span className="text-text-muted">
                {streaming ? "Waiting for merge output..." : "No changes"}
              </span>
            </div>
          )}
        </div>

        {/* Right: editable textarea */}
        <div className="rounded-card border border-border-default bg-surface-card p-6">
          <h4 className="mb-4 text-label uppercase tracking-widest text-text-muted">
            Merged Content (Editable)
          </h4>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            disabled={streaming}
            rows={24}
            className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-3 font-mono text-body text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none disabled:opacity-60"
            placeholder={streaming ? "Generating..." : "Merged content will appear here"}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={streaming || saving || !editedText.trim()}
          className="rounded-lg bg-action-primary px-5 py-2.5 text-body font-medium text-text-primary hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Merged Content"}
        </button>
        <button
          onClick={onDiscard}
          disabled={saving}
          className="rounded-lg border border-border-default px-5 py-2.5 text-body font-medium text-text-secondary hover:border-border-default/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
