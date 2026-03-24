"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  type SubmissionListItem,
  type SubmissionType,
  type SubmissionStatus,
  type SourceChannel,
  VALID_SOURCE_CHANNELS,
  getStatusLabel,
  getSubmissionTypeLabel,
  getSourceChannelLabel,
} from "@/lib/submission-types";
import { getTypeLabel } from "@/lib/knowledge-types";
import type { KnowledgeType } from "@/lib/knowledge-types";

function getObjectTypeLabel(type: string): string {
  if (type === "skill") return "Skill";
  return getTypeLabel(type as KnowledgeType);
}

const SUBMISSION_TYPE_TABS: { label: string; value: SubmissionType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Update", value: "update" },
  { label: "Document Addition", value: "document_add" },
];

const TYPE_BADGE_CLASSES: Record<string, string> = {
  persona: "bg-hg-blue/15 text-hg-blue-bright",
  segment: "bg-status-success-bg text-status-success",
  use_case: "bg-status-warning-bg text-status-warning",
  business_rule: "bg-status-info-bg text-hg-blue-muted",
  icp: "bg-status-danger-bg text-status-danger",
  competitor: "bg-status-warning-bg text-status-warning",
  customer_evidence: "bg-status-success-bg text-status-success",
  skill: "bg-status-info-bg text-hg-blue-bright",
};

const STATUS_BADGE_CLASSES: Record<SubmissionStatus, string> = {
  pending: "bg-status-warning-bg text-status-warning",
  deferred: "bg-status-warning-bg text-status-warning",
  accepted: "bg-status-success-bg text-status-success",
  rejected: "bg-status-danger-bg text-status-danger",
};

const SUBMISSION_TYPE_BADGE_CLASSES: Record<SubmissionType, string> = {
  new: "bg-status-info-bg text-hg-blue-bright",
  update: "bg-status-info-bg text-status-info",
  document_add: "bg-status-success-bg text-status-success",
};

const SOURCE_CHANNEL_BADGE_CLASSES: Record<string, string> = {
  ui: "bg-surface-input/50 text-text-secondary",
  mcp: "bg-status-info-bg text-hg-blue-muted",
  bulk_upload: "bg-status-success-bg text-status-success",
  system: "bg-status-info-bg text-hg-blue-bright",
};

export function SubmissionList({
  submissions,
}: {
  submissions: SubmissionListItem[];
}) {
  const [submissionTypeTab, setSubmissionTypeTab] = useState<
    SubmissionType | "all"
  >("all");
  const [sourceFilter, setSourceFilter] = useState<SourceChannel | "all">("all");
  const [showClosed, setShowClosed] = useState(false);

  const filtered = useMemo(() => {
    let items = submissions;

    if (!showClosed) {
      items = items.filter(
        (s) => s.status === "pending" || s.status === "deferred"
      );
    }

    if (submissionTypeTab !== "all") {
      items = items.filter((s) => s.submissionType === submissionTypeTab);
    }

    if (sourceFilter !== "all") {
      items = items.filter((s) => s.sourceChannel === sourceFilter);
    }

    return items;
  }, [submissions, showClosed, submissionTypeTab, sourceFilter]);

  return (
    <div className="mt-10 space-y-6">
      {/* Tabs: submission type */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-lg border border-border-default bg-surface-card p-1">
          {SUBMISSION_TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSubmissionTypeTab(tab.value)}
              className={`rounded-md border px-3 py-1.5 text-body font-medium transition-colors ${
                submissionTypeTab === tab.value
                  ? "border-border-focus text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Show closed toggle */}
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="h-4 w-4 rounded border-border-default bg-surface-input text-hg-blue accent-hg-blue focus:ring-border-focus"
          />
          <span className="text-body text-text-secondary">Show closed</span>
        </label>
      </div>

      <div className="flex gap-1 rounded-lg border border-border-default bg-surface-card p-1">
        <button
          onClick={() => setSourceFilter("all")}
          className={`rounded-md border px-3 py-1.5 text-body font-medium transition-colors ${
            sourceFilter === "all"
              ? "border-border-focus text-text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          All Sources
        </button>
        {VALID_SOURCE_CHANNELS.map((ch) => (
          <button
            key={ch}
            onClick={() => setSourceFilter(ch)}
            className={`rounded-md border px-3 py-1.5 text-body font-medium transition-colors ${
              sourceFilter === ch
                ? "border-border-focus text-text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {getSourceChannelLabel(ch)}
          </button>
        ))}
      </div>

      {/* Result count */}
      <p className="text-body text-text-muted">
        {filtered.length}{" "}
        {filtered.length === 1 ? "submission" : "submissions"}
      </p>

      {/* Submission list */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-border-default bg-surface-card p-6">
          <p className="text-center text-text-muted">
            No submissions found.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => (
            <SubmissionRow key={sub.id} submission={sub} />
          ))}
        </div>
      )}
    </div>
  );
}

function SubmissionRow({ submission }: { submission: SubmissionListItem }) {
  return (
    <Link
      href={`/queue/${submission.id}`}
      className="flex flex-wrap items-center gap-3 rounded-card border border-border-default bg-surface-card p-6 transition-colors hover:border-border-default/80"
    >
      <span className="font-medium text-text-primary">{submission.objectName}</span>
      <span
        className={`rounded px-2 py-0.5 text-xs font-medium ${
          TYPE_BADGE_CLASSES[submission.objectType]
        }`}
      >
        {getObjectTypeLabel(submission.objectType)}
      </span>
      <span
        className={`rounded px-2 py-0.5 text-xs font-medium ${
          SUBMISSION_TYPE_BADGE_CLASSES[submission.submissionType]
        }`}
      >
        {getSubmissionTypeLabel(submission.submissionType)}
      </span>
      <span className="text-body text-text-secondary">{submission.submitter}</span>
      <span
        className={`rounded px-2 py-0.5 text-xs font-medium ${
          STATUS_BADGE_CLASSES[submission.status]
        }`}
      >
        {getStatusLabel(submission.status)}
      </span>
      {submission.sourceChannel && (
        <span className="flex items-center gap-1.5">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              SOURCE_CHANNEL_BADGE_CLASSES[submission.sourceChannel] ?? "bg-surface-input/50 text-text-secondary"
            }`}
          >
            {getSourceChannelLabel(submission.sourceChannel)}
          </span>
          {submission.sourceChannel === "mcp" && submission.sourceAppId && (
            <span className="text-caption text-text-muted">{submission.sourceAppId}</span>
          )}
        </span>
      )}
      <span className="ml-auto shrink-0 text-caption text-text-muted">
        {new Date(submission.createdAt).toLocaleDateString()}
      </span>
    </Link>
  );
}
