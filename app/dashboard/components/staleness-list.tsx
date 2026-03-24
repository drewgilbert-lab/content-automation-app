"use client";

import Link from "next/link";
import { Badge } from "@/app/components/ui/badge";
import type { KnowledgeType } from "@/lib/knowledge-types";
import { TypeBadge } from "@/app/knowledge/components/type-badge";

interface StalenessItem {
  id: string;
  name: string;
  type: KnowledgeType;
  updatedAt: string;
  label: "Never Reviewed" | "Stale";
}

interface StalenessListProps {
  neverReviewed: { id: string; name: string; type: KnowledgeType; updatedAt: string }[];
  stale: { id: string; name: string; type: KnowledgeType; updatedAt: string }[];
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StaleBadge({ label }: { label: "Never Reviewed" | "Stale" }) {
  return (
    <Badge variant={label === "Never Reviewed" ? "warning" : "danger"}>
      {label}
    </Badge>
  );
}

export function StalenessList({ neverReviewed, stale }: StalenessListProps) {
  const nrIds = new Set(neverReviewed.map((o) => o.id));
  const deduped = stale.filter((o) => !nrIds.has(o.id));

  const items: StalenessItem[] = [
    ...neverReviewed.map((o) => ({ ...o, label: "Never Reviewed" as const })),
    ...deduped.map((o) => ({ ...o, label: "Stale" as const })),
  ];

  items.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

  if (items.length === 0) {
    return (
      <div className="rounded-card border border-border-default bg-surface-card p-6">
        <p className="text-sm text-text-secondary">
          All objects are up to date. No stale or unreviewed items found.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border-default bg-surface-card overflow-hidden">
      <div className="divide-y divide-border-default">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/knowledge/${item.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-surface-input/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <StaleBadge label={item.label} />
              <TypeBadge type={item.type} />
              <span className="text-sm text-text-secondary truncate">{item.name}</span>
            </div>
            <span className="ml-3 shrink-0 text-xs text-text-muted">
              {formatDate(item.updatedAt)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
