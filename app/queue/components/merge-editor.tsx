"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import DiffMatchPatch from "diff-match-patch";

const dmp = new DiffMatchPatch();

interface MergeEditorProps {
  currentContent: string;
  submissionId: string;
  onDiscard: () => void;
  onSaved: () => void;
}

type DiffTuple = [number, string];

function computeDiff(original: string, edited: string): DiffTuple[] {
  const diffs = dmp.diff_main(original, edited);
  dmp.diff_cleanupSemantic(diffs);
  return diffs;
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

  const diffs = useMemo(() => {
    if (!editedText) return [];
    return computeDiff(currentContent, editedText);
  }, [currentContent, editedText]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">AI Merge Editor</h3>
          <p className="mt-1 text-sm text-gray-400">
            {streaming
              ? "Generating merged content..."
              : streamComplete
                ? "Review the merged result below. Edit as needed, then save or discard."
                : ""}
          </p>
        </div>
        {streaming && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" />
            Streaming
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: tracked-changes diff view */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h4 className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-500">
            Tracked Changes
          </h4>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap break-words text-sm leading-relaxed">
            {diffs.length > 0 ? (
              diffs.map((diff, i) => {
                const [op, text] = diff;
                if (op === DiffMatchPatch.DIFF_INSERT) {
                  return (
                    <span
                      key={i}
                      className="bg-green-500/20 text-green-300"
                    >
                      {text}
                    </span>
                  );
                }
                if (op === DiffMatchPatch.DIFF_DELETE) {
                  return (
                    <span
                      key={i}
                      className="bg-red-500/20 text-red-400 line-through"
                    >
                      {text}
                    </span>
                  );
                }
                return <span key={i}>{text}</span>;
              })
            ) : (
              <span className="text-gray-500">
                {streaming ? "Waiting for merge output..." : "No changes"}
              </span>
            )}
          </div>
        </div>

        {/* Right: editable textarea */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h4 className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-500">
            Merged Content (Editable)
          </h4>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            disabled={streaming}
            rows={24}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 font-mono text-sm text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none disabled:opacity-60"
            placeholder={streaming ? "Generating..." : "Merged content will appear here"}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-green-500/20" />
          Added
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-red-500/20" />
          Removed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-6 rounded bg-gray-800" />
          Unchanged
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={streaming || saving || !editedText.trim()}
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Merged Content"}
        </button>
        <button
          onClick={onDiscard}
          disabled={saving}
          className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 hover:border-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
