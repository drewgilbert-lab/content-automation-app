"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { KnowledgeType } from "@/lib/knowledge-types";
import { TypeBadge } from "@/app/knowledge/components/type-badge";

interface GapItem {
  id: string;
  name: string;
  type: KnowledgeType;
  gapDetail?: string;
}

interface GapSectionProps {
  title: string;
  items: GapItem[];
  defaultOpen?: boolean;
}

function GapSection({ title, items, defaultOpen = false }: GapSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (items.length === 0) return null;

  return (
    <div className="border-b border-border-default last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-input/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-text-muted" />
          )}
          <span className="text-sm font-medium text-text-secondary">{title}</span>
        </div>
        <span className="rounded-full bg-surface-input px-2.5 py-0.5 text-xs font-medium text-text-secondary">
          {items.length}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3">
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-surface-input/50 px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TypeBadge type={item.type} />
                  <span className="text-sm text-text-secondary truncate">
                    {item.name}
                  </span>
                  {item.gapDetail && (
                    <span className="hidden sm:inline text-xs text-text-muted">
                      {item.gapDetail}
                    </span>
                  )}
                </div>
                <Link
                  href={`/knowledge/${item.id}`}
                  className="ml-3 shrink-0 rounded-lg border border-border-default px-3 py-1 text-xs font-medium text-text-secondary hover:border-border-focus hover:text-text-primary transition-colors"
                >
                  Fix
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface GapTableProps {
  noRelationships: GapItem[];
  partialRelationships: GapItem[];
  asymmetricRelationships: GapItem[];
  icpMissingRefs: GapItem[];
  businessRulesNoSubType: GapItem[];
  customerEvidenceNoSubType: GapItem[];
}

export function GapTable({
  noRelationships,
  partialRelationships,
  asymmetricRelationships,
  icpMissingRefs,
  businessRulesNoSubType,
  customerEvidenceNoSubType,
}: GapTableProps) {
  const totalGaps =
    noRelationships.length +
    partialRelationships.length +
    asymmetricRelationships.length +
    icpMissingRefs.length +
    businessRulesNoSubType.length +
    customerEvidenceNoSubType.length;

  if (totalGaps === 0) {
    return (
      <div className="rounded-card border border-border-default bg-surface-card p-6">
        <p className="text-sm text-text-secondary">
          No relationship gaps detected. All objects are properly connected.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border-default bg-surface-card overflow-hidden">
      <GapSection
        title="No Relationships"
        items={noRelationships}
        defaultOpen={noRelationships.length > 0}
      />
      <GapSection
        title="Partial Relationships"
        items={partialRelationships}
        defaultOpen={partialRelationships.length > 0 && noRelationships.length === 0}
      />
      <GapSection
        title="Asymmetric Relationships"
        items={asymmetricRelationships}
      />
      <GapSection
        title="ICPs Missing References"
        items={icpMissingRefs}
        defaultOpen={icpMissingRefs.length > 0}
      />
      <GapSection
        title="Business Rules Missing Sub-Type"
        items={businessRulesNoSubType.map((item) => ({
          ...item,
          gapDetail: "No subType set",
        }))}
      />
      <GapSection
        title="Customer Evidence Missing Sub-Type"
        items={customerEvidenceNoSubType.map((item) => ({
          ...item,
          gapDetail: "No subType set (proof_point or reference)",
        }))}
      />
    </div>
  );
}
