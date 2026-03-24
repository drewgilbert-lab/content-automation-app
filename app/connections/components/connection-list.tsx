"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { ConnectedSystemListItem } from "@/lib/connection-types";
import { getRateLimitTierLabel } from "@/lib/connection-types";

type TabValue = "all" | "active" | "inactive";

const TABS: { label: string; value: TabValue }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
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

function formatSubscribedTypes(types: string[]): string {
  if (types.length === 1 && types[0] === "*") return "All types";
  return types
    .map((t) =>
      t
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    )
    .join(", ");
}

export function ConnectionList({
  systems,
}: {
  systems: ConnectedSystemListItem[];
}) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let items = systems;

    if (activeTab === "active") {
      items = items.filter((s) => s.active);
    } else if (activeTab === "inactive") {
      items = items.filter((s) => !s.active);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }

    return items;
  }, [systems, activeTab, search]);

  return (
    <div className="mt-10 space-y-6">
      <div className="flex gap-1 rounded-lg bg-surface-card p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-surface-input text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
        />
      </div>

      <p className="text-sm text-text-muted">
        {filtered.length} {filtered.length === 1 ? "connection" : "connections"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-border-default bg-surface-card px-6 py-12 text-center">
          <p className="text-text-muted">No connected systems found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((system) => (
            <ConnectionRow key={system.id} system={system} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionRow({ system }: { system: ConnectedSystemListItem }) {
  return (
    <Link
      href={`/connections/${system.id}`}
      className="flex items-center gap-4 rounded-lg border border-border-default bg-surface-card px-5 py-4 transition-colors hover:border-border-focus"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary">{system.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-micro font-medium ${
              system.active
                ? "bg-status-success-bg border border-status-success/30 text-status-success"
                : "bg-surface-input border border-border-default text-text-secondary"
            }`}
          >
            {system.active ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-text-muted font-mono">
          {system.apiKeyPrefix}...
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="rounded bg-status-info-bg border border-status-info/30 px-2 py-0.5 text-micro font-medium text-hg-blue-muted">
          {formatSubscribedTypes(system.subscribedTypes)}
        </span>
        <span className="rounded bg-surface-input px-2 py-0.5 text-xs text-text-secondary">
          {getRateLimitTierLabel(system.rateLimitTier)}
        </span>
        <span className="shrink-0 text-xs text-text-muted">
          {formatDate(system.updatedAt)}
        </span>
      </div>
    </Link>
  );
}
