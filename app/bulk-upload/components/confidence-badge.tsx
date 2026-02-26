"use client";

interface ConfidenceBadgeProps {
  confidence: number;
  needsReview?: boolean;
}

export function ConfidenceBadge({ confidence, needsReview = false }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);
  const isHigh = confidence >= 0.7;
  const colorClass = isHigh ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {pct}%
      {needsReview && <span className="text-[10px] opacity-80">Review</span>}
    </span>
  );
}
