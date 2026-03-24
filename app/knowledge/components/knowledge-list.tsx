"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { type KnowledgeListItem, type KnowledgeType, getTypeLabel } from "@/lib/knowledge-types";
import { TypeBadge } from "./type-badge";

const TABS: { label: string; value: KnowledgeType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Personas", value: "persona" },
  { label: "Segments", value: "segment" },
  { label: "Use Cases", value: "use_case" },
  { label: "Business Rules", value: "business_rule" },
  { label: "ICPs", value: "icp" },
];

const TYPE_ORDER: KnowledgeType[] = [
  "persona",
  "segment",
  "use_case",
  "business_rule",
  "icp",
];

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function KnowledgeList({ objects }: { objects: KnowledgeListItem[] }) {
  const [activeTab, setActiveTab] = useState<KnowledgeType | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let items = objects;

    if (activeTab !== "all") {
      items = items.filter((o) => o.type === activeTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return items;
  }, [objects, activeTab, search]);

  const grouped = useMemo(() => {
    if (activeTab !== "all") return null;
    const map = new Map<KnowledgeType, KnowledgeListItem[]>();
    for (const obj of filtered) {
      const list = map.get(obj.type) ?? [];
      list.push(obj);
      map.set(obj.type, list);
    }
    return TYPE_ORDER.filter((t) => map.has(t)).map((t) => ({
      type: t,
      items: map.get(t)!,
    }));
  }, [filtered, activeTab]);

  return (
    <div className="mt-10 space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-surface-card p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-md px-3 py-1.5 text-body font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-surface-active text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or tag..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
      />

      {/* Result count */}
      <p className="text-body text-text-muted">
        {filtered.length} {filtered.length === 1 ? "object" : "objects"}
      </p>

      {/* Object list */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-border-default bg-surface-card px-6 py-12 text-center">
          <p className="text-text-muted">No knowledge objects found.</p>
        </div>
      ) : grouped ? (
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.type}>
              <h3 className="mb-3 text-label uppercase tracking-widest text-text-muted">
                {getTypeLabel(group.type)}s
              </h3>
              <div className="space-y-2">
                {group.items.map((obj) => (
                  <ObjectRow key={obj.id} obj={obj} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((obj) => (
            <ObjectRow key={obj.id} obj={obj} />
          ))}
        </div>
      )}
    </div>
  );
}

function ObjectRow({ obj }: { obj: KnowledgeListItem }) {
  return (
    <Link
      href={`/knowledge/${obj.id}`}
      className={`flex items-center gap-4 rounded-card border px-5 py-4 transition-colors ${
        obj.deprecated
          ? "border-border-default/60 bg-surface-card/60 opacity-60"
          : "border-border-default bg-surface-card hover:border-border-default/80"
      }`}
    >
      <span className="font-medium text-text-primary">{obj.name}</span>
      <TypeBadge type={obj.type} />
      {obj.deprecated && (
        <span className="rounded bg-status-warning-bg border border-status-warning/30 px-1.5 py-0.5 text-micro text-status-warning">
          Deprecated
        </span>
      )}
      <div className="flex gap-1.5">
        {obj.tags.map((tag) => (
          <span
            key={tag}
            className="rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary"
          >
            {tag}
          </span>
        ))}
      </div>
      <span className="ml-auto shrink-0 text-caption text-text-muted">
        {formatDate(obj.updatedAt)}
      </span>
    </Link>
  );
}
