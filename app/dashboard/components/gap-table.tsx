"use client";

import { useState } from "react";
import Link from "next/link";
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
    <div className="border-b border-gray-800 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{open ? "▾" : "▸"}</span>
          <span className="text-sm font-medium text-gray-300">{title}</span>
        </div>
        <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-400">
          {items.length}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3">
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <TypeBadge type={item.type} />
                  <span className="text-sm text-gray-300 truncate">
                    {item.name}
                  </span>
                  {item.gapDetail && (
                    <span className="hidden sm:inline text-xs text-gray-500">
                      {item.gapDetail}
                    </span>
                  )}
                </div>
                <Link
                  href={`/knowledge/${item.id}`}
                  className="ml-3 shrink-0 rounded-lg border border-gray-700 px-3 py-1 text-xs font-medium text-gray-300 hover:border-gray-600 hover:text-white transition-colors"
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
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <p className="text-sm text-gray-400">
          No relationship gaps detected. All objects are properly connected.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
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
