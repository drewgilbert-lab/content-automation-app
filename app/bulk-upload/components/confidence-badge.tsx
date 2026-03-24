"use client";

import { Badge } from "@/app/components/ui/badge";

interface ConfidenceBadgeProps {
  confidence: number;
  needsReview?: boolean;
}

export function ConfidenceBadge({ confidence, needsReview = false }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);
  const isHigh = confidence >= 0.7;

  return (
    <Badge variant={isHigh ? "success" : "warning"} className="gap-1.5">
      {pct}%
      {needsReview && <span className="text-[10px] opacity-80">Review</span>}
    </Badge>
  );
}
