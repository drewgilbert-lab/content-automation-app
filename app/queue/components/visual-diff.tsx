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
        className="my-1 block rounded bg-gray-800 px-3 py-1 text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-300"
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
    <div className="prose prose-invert max-w-none whitespace-pre-wrap break-words text-sm leading-relaxed">
      {diffs.map((diff, i) => {
        const [op, text] = diff;
        if (op === DIFF_INSERT) {
          return (
            <span
              key={i}
              className="bg-green-500/20 text-green-300 underline decoration-green-500/40"
            >
              {text}
            </span>
          );
        }
        if (op === DIFF_DELETE) {
          return (
            <span
              key={i}
              className="bg-red-500/20 text-red-400 line-through"
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
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h4 className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-500">
          Original
        </h4>
        <div
          ref={leftRef}
          onScroll={() => handleScroll("left")}
          className="max-h-[600px] overflow-auto prose prose-invert max-w-none whitespace-pre-wrap break-words text-sm leading-relaxed"
        >
          {diffs.map((diff, i) => {
            const [op, text] = diff;
            if (op === DIFF_DELETE) {
              return (
                <span
                  key={i}
                  className="bg-red-500/20 text-red-400 line-through"
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

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h4 className="mb-4 text-xs font-medium uppercase tracking-wider text-gray-500">
          Modified
        </h4>
        <div
          ref={rightRef}
          onScroll={() => handleScroll("right")}
          className="max-h-[600px] overflow-auto prose prose-invert max-w-none whitespace-pre-wrap break-words text-sm leading-relaxed"
        >
          {diffs.map((diff, i) => {
            const [op, text] = diff;
            if (op === DIFF_INSERT) {
              return (
                <span
                  key={i}
                  className="bg-green-500/20 text-green-300 underline decoration-green-500/40"
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
        <p className="text-sm text-gray-500">No changes</p>
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
  );
}
