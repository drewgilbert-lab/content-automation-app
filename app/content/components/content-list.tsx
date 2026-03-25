"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  type ContentListItem,
  type ContentStatus,
  getContentSourceChannelLabel,
} from "@/lib/content-types";
import { CONTENT_TYPES, getContentTypeLabel } from "@/lib/skill-types";
import { StatusBadge } from "./status-badge";

type TabValue = "all" | ContentStatus;

const TABS: { label: string; value: TabValue }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
  { label: "In Review", value: "in_review" },
  { label: "Approved", value: "approved" },
  { label: "Published", value: "published" },
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

function matchesStatusTab(item: ContentListItem, tab: TabValue): boolean {
  if (tab === "all") return true;
  if (tab === "draft") {
    return item.status === "draft" || item.status === "rejected";
  }
  return item.status === tab;
}

export function ContentList({ items }: { items: ContentListItem[] }) {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState("");

  const filtered = useMemo(() => {
    let result = items.filter((item) => matchesStatusTab(item, activeTab));

    if (contentTypeFilter) {
      result = result.filter((item) => item.contentType === contentTypeFilter);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [items, activeTab, search, contentTypeFilter]);

  return (
    <div className="mt-10 space-y-6">
      <div className="flex gap-1 rounded-lg bg-surface-card p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
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

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search by title or tag..."
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
      </div>

      <p className="text-body text-text-muted">
        {filtered.length} {filtered.length === 1 ? "item" : "items"}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-border-default bg-surface-card px-6 py-12 text-center">
          <p className="text-text-muted">No content found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <ContentRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContentRow({ item }: { item: ContentListItem }) {
  const visibleTags = item.tags.slice(0, 2);
  const extraTagCount = Math.max(0, item.tags.length - 2);
  const showSource =
    item.sourceChannel && item.sourceChannel !== "direct_upload";

  return (
    <Link
      href={`/content/${item.id}`}
      className="flex items-center gap-4 rounded-card border border-border-default bg-surface-card px-5 py-4 transition-colors hover:border-border-default/80"
    >
      <div className="min-w-0 flex-1">
        <span className="font-medium text-text-primary">{item.title}</span>
      </div>
      <StatusBadge status={item.status} size="sm" className="shrink-0" />
      <span className="shrink-0 rounded bg-status-info-bg border border-border-focus/50 px-2 py-0.5 text-caption text-hg-blue-bright">
        {getContentTypeLabel(item.contentType)}
      </span>
      {showSource ? (
        <span className="shrink-0 rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary">
          {getContentSourceChannelLabel(item.sourceChannel!)}
        </span>
      ) : null}
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        {visibleTags.map((tag) => (
          <span
            key={tag}
            className="rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary"
          >
            {tag}
          </span>
        ))}
        {extraTagCount > 0 ? (
          <span className="text-caption text-text-secondary">
            +{extraTagCount}
          </span>
        ) : null}
      </div>
      <span className="ml-auto shrink-0 text-caption text-text-muted">
        {formatDate(item.createdAt)}
      </span>
    </Link>
  );
}
