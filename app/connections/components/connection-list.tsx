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
      <div className="flex gap-1 rounded-lg bg-gray-900 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-gray-300"
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
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
        />
      </div>

      <p className="text-sm text-gray-500">
        {filtered.length} {filtered.length === 1 ? "connection" : "connections"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-12 text-center">
          <p className="text-gray-500">No connected systems found.</p>
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
      className="flex items-center gap-4 rounded-lg border border-gray-800 bg-gray-900 px-5 py-4 transition-colors hover:border-gray-700"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{system.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              system.active
                ? "bg-green-900/50 border border-green-800 text-green-400"
                : "bg-gray-800 border border-gray-700 text-gray-400"
            }`}
          >
            {system.active ? "Active" : "Inactive"}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-gray-500 font-mono">
          {system.apiKeyPrefix}...
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="rounded bg-purple-900/30 border border-purple-800/50 px-2 py-0.5 text-[10px] font-medium text-purple-400">
          {formatSubscribedTypes(system.subscribedTypes)}
        </span>
        <span className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
          {getRateLimitTierLabel(system.rateLimitTier)}
        </span>
        <span className="shrink-0 text-xs text-gray-500">
          {formatDate(system.updatedAt)}
        </span>
      </div>
    </Link>
  );
}
