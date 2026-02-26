"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { SkillListItem } from "@/lib/skill-types";
import {
  getContentTypeLabel,
  getCategoryLabel,
  CONTENT_TYPES,
  SKILL_CATEGORIES,
} from "@/lib/skill-types";

type TabValue = "all" | "active" | "inactive" | "deprecated";

const TABS: { label: string; value: TabValue }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Deprecated", value: "deprecated" },
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

export function SkillList({ skills }: { skills: SkillListItem[] }) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const filtered = useMemo(() => {
    let items = skills;

    if (activeTab === "active") {
      items = items.filter((s) => s.active && !s.deprecated);
    } else if (activeTab === "inactive") {
      items = items.filter((s) => !s.active && !s.deprecated);
    } else if (activeTab === "deprecated") {
      items = items.filter((s) => s.deprecated);
    }

    if (contentTypeFilter) {
      items = items.filter((s) => s.contentType.includes(contentTypeFilter));
    }

    if (categoryFilter) {
      items = items.filter((s) => s.category === categoryFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return items;
  }, [skills, activeTab, search, contentTypeFilter, categoryFilter]);

  return (
    <div className="mt-10 space-y-6">
      {/* Tabs */}
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

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name, description, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
        />
        <select
          value={contentTypeFilter}
          onChange={(e) => setContentTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-gray-600 focus:outline-none"
        >
          <option value="">All Types</option>
          {CONTENT_TYPES.map((ct) => (
            <option key={ct} value={ct}>
              {getContentTypeLabel(ct)}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-gray-600 focus:outline-none"
        >
          <option value="">All Categories</option>
          {SKILL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {getCategoryLabel(cat)}
            </option>
          ))}
        </select>
      </div>

      {/* Result count */}
      <p className="text-sm text-gray-500">
        {filtered.length} {filtered.length === 1 ? "skill" : "skills"}
      </p>

      {/* Skill list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 px-6 py-12 text-center">
          <p className="text-gray-500">No skills found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((skill) => (
            <SkillRow key={skill.id} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}

function SkillRow({ skill }: { skill: SkillListItem }) {
  return (
    <Link
      href={`/skills/${skill.id}`}
      className={`flex items-center gap-4 rounded-lg border px-5 py-4 transition-colors ${
        skill.deprecated
          ? "border-gray-800/60 bg-gray-900/60 opacity-60"
          : "border-gray-800 bg-gray-900 hover:border-gray-700"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{skill.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              skill.active && !skill.deprecated
                ? "bg-green-900/50 border border-green-800 text-green-400"
                : "bg-gray-800 border border-gray-700 text-gray-400"
            }`}
          >
            {skill.deprecated ? "Deprecated" : skill.active ? "Active" : "Inactive"}
          </span>
          <span className="text-xs text-gray-500">v{skill.version}</span>
        </div>
        <p className="mt-0.5 truncate text-sm text-gray-400">{skill.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {skill.contentType.slice(0, 2).map((ct) => (
          <span
            key={ct}
            className="rounded bg-blue-900/30 border border-blue-800/50 px-2 py-0.5 text-[10px] font-medium text-blue-400"
          >
            {getContentTypeLabel(ct)}
          </span>
        ))}
        {skill.contentType.length > 2 && (
          <span className="text-xs text-gray-500">
            +{skill.contentType.length - 2}
          </span>
        )}
      </div>
      {skill.category && (
        <span className="shrink-0 rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
          {getCategoryLabel(skill.category)}
        </span>
      )}
      <span className="shrink-0 text-xs text-gray-500">
        {formatDate(skill.updatedAt)}
      </span>
    </Link>
  );
}
