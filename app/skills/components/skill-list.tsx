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

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by name, description, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
        />
        <select
          value={contentTypeFilter}
          onChange={(e) => setContentTypeFilter(e.target.value)}
          className="rounded-lg border border-border-default bg-surface-input px-3 py-2.5 text-body text-text-primary focus:border-border-focus focus:outline-none"
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
          className="rounded-lg border border-border-default bg-surface-input px-3 py-2.5 text-body text-text-primary focus:border-border-focus focus:outline-none"
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
      <p className="text-body text-text-muted">
        {filtered.length} {filtered.length === 1 ? "skill" : "skills"}
      </p>

      {/* Skill list */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-border-default bg-surface-card px-6 py-12 text-center">
          <p className="text-text-muted">No skills found.</p>
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
      className={`flex items-center gap-4 rounded-card border px-5 py-4 transition-colors ${
        skill.deprecated
          ? "border-border-default/60 bg-surface-card/60 opacity-60"
          : "border-border-default bg-surface-card hover:border-border-default/80"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-text-primary">{skill.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-micro ${
              skill.active && !skill.deprecated
                ? "bg-status-success-bg border border-status-success/30 text-status-success"
                : "bg-surface-input border border-border-default text-text-secondary"
            }`}
          >
            {skill.deprecated ? "Deprecated" : skill.active ? "Active" : "Inactive"}
          </span>
          <span className="text-caption text-text-muted">v{skill.version}</span>
        </div>
        <p className="mt-0.5 truncate text-body text-text-secondary">{skill.description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {skill.contentType.slice(0, 2).map((ct) => (
          <span
            key={ct}
            className="rounded bg-status-info-bg border border-border-focus/50 px-2 py-0.5 text-micro text-hg-blue-bright"
          >
            {getContentTypeLabel(ct)}
          </span>
        ))}
        {skill.contentType.length > 2 && (
          <span className="text-caption text-text-muted">
            +{skill.contentType.length - 2}
          </span>
        )}
      </div>
      {skill.category && (
        <span className="shrink-0 rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary">
          {getCategoryLabel(skill.category)}
        </span>
      )}
      <span className="shrink-0 text-caption text-text-muted">
        {formatDate(skill.updatedAt)}
      </span>
    </Link>
  );
}
