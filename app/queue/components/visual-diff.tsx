"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import DiffMatchPatch from "diff-match-patch";

const DIFF_INSERT = 1;
const DIFF_DELETE = -1;
const DIFF_EQUAL = 0;

interface VisualDiffProps {
  original: string;
  modified: string;
  mode?: "unified" | "side-by-side";
}

type DiffTuple = [number, string];

function CollapsibleUnchanged({
  text,
  diffIndex,
}: {
  text: string;
  diffIndex: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split("\n");

  if (lines.length <= 5) {
    return <span>{text}</span>;
  }

  if (expanded) {
    return <span>{text}</span>;
  }

  const hiddenCount = lines.length - 4;
  const top = lines.slice(0, 2).join("\n");
  const bottom = lines.slice(-2).join("\n");

  return (
    <>
      <span>{top}{"\n"}</span>
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="my-1 block rounded bg-surface-input px-3 py-1 text-caption text-text-secondary hover:bg-surface-active hover:text-text-primary"
        data-collapse-key={diffIndex}
      >
        Show {hiddenCount} unchanged lines
      </button>
      <span>{bottom}</span>
    </>
  );
}

function UnifiedView({ diffs }: { diffs: DiffTuple[] }) {
  return (
    <div className="prose prose-invert max-w-none whitespace-pre-wrap break-words text-body leading-relaxed">
      {diffs.map((diff, i) => {
        const [op, text] = diff;
        if (op === DIFF_INSERT) {
          return (
            <span
              key={i}
              className="bg-status-success-bg text-status-success underline decoration-status-success/40"
            >
              {text}
            </span>
          );
        }
        if (op === DIFF_DELETE) {
          return (
            <span
              key={i}
              className="bg-status-danger-bg text-status-danger line-through"
            >
              {text}
            </span>
          );
        }
        return <CollapsibleUnchanged key={i} text={text} diffIndex={i} />;
      })}
    </div>
  );
}

function SideBySideView({ diffs }: { diffs: DiffTuple[] }) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  const handleScroll = useCallback(
    (source: "left" | "right") => {
      if (syncing.current) return;
      syncing.current = true;

      const from = source === "left" ? leftRef.current : rightRef.current;
      const to = source === "left" ? rightRef.current : leftRef.current;
      if (from && to) {
        to.scrollTop = from.scrollTop;
      }

      syncing.current = false;
    },
    [],
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-card border border-border-default bg-surface-card p-6">
        <h4 className="mb-4 text-label uppercase tracking-widest text-text-muted">
          Original
        </h4>
        <div
          ref={leftRef}
          onScroll={() => handleScroll("left")}
          className="max-h-[600px] overflow-auto prose prose-invert max-w-none whitespace-pre-wrap break-words text-body leading-relaxed"
        >
          {diffs.map((diff, i) => {
            const [op, text] = diff;
            if (op === DIFF_DELETE) {
              return (
                <span
                  key={i}
                  className="bg-status-danger-bg text-status-danger line-through"
                >
                  {text}
                </span>
              );
            }
            if (op === DIFF_EQUAL) {
              return <span key={i}>{text}</span>;
            }
            return null;
          })}
        </div>
      </div>

      <div className="rounded-card border border-border-default bg-surface-card p-6">
        <h4 className="mb-4 text-label uppercase tracking-widest text-text-muted">
          Modified
        </h4>
        <div
          ref={rightRef}
          onScroll={() => handleScroll("right")}
          className="max-h-[600px] overflow-auto prose prose-invert max-w-none whitespace-pre-wrap break-words text-body leading-relaxed"
        >
          {diffs.map((diff, i) => {
            const [op, text] = diff;
            if (op === DIFF_INSERT) {
              return (
                <span
                  key={i}
                  className="bg-status-success-bg text-status-success underline decoration-status-success/40"
                >
                  {text}
                </span>
              );
            }
            if (op === DIFF_EQUAL) {
              return <span key={i}>{text}</span>;
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
}

export function VisualDiff({
  original,
  modified,
  mode = "unified",
}: VisualDiffProps) {
  const diffs = useMemo(() => {
    if (original === modified) return [];
    const dmp = new DiffMatchPatch();
    const result = dmp.diff_main(original, modified);
    dmp.diff_cleanupSemantic(result);
    return result as DiffTuple[];
  }, [original, modified]);

  if (diffs.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-body text-text-muted">No changes</p>
        <Legend />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mode === "unified" ? (
        <UnifiedView diffs={diffs} />
      ) : (
        <SideBySideView diffs={diffs} />
      )}
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-6 text-caption text-text-muted">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-6 rounded bg-status-success-bg" />
        Added
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-6 rounded bg-status-danger-bg" />
        Removed
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-6 rounded bg-surface-input" />
        Unchanged
      </span>
    </div>
  );
}
