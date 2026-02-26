"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  type SubmissionListItem,
  type SubmissionType,
  type SubmissionStatus,
  getStatusLabel,
  getSubmissionTypeLabel,
} from "@/lib/submission-types";
import { getTypeLabel } from "@/lib/knowledge-types";
import type { KnowledgeType } from "@/lib/knowledge-types";

const SUBMISSION_TYPE_TABS: { label: string; value: SubmissionType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "New", value: "new" },
  { label: "Update", value: "update" },
  { label: "Document Addition", value: "document_add" },
];

const TYPE_BADGE_CLASSES: Record<KnowledgeType, string> = {
  persona: "bg-blue-500/15 text-blue-400",
  segment: "bg-emerald-500/15 text-emerald-400",
  use_case: "bg-amber-500/15 text-amber-400",
  business_rule: "bg-purple-500/15 text-purple-400",
  icp: "bg-rose-500/15 text-rose-400",
};

const STATUS_BADGE_CLASSES: Record<SubmissionStatus, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  deferred: "bg-orange-500/15 text-orange-400",
  accepted: "bg-green-500/15 text-green-400",
  rejected: "bg-red-500/15 text-red-400",
};

const SUBMISSION_TYPE_BADGE_CLASSES: Record<SubmissionType, string> = {
  new: "bg-cyan-500/15 text-cyan-400",
  update: "bg-indigo-500/15 text-indigo-400",
  document_add: "bg-teal-500/15 text-teal-400",
};

export function SubmissionList({
  submissions,
}: {
  submissions: SubmissionListItem[];
}) {
  const [submissionTypeTab, setSubmissionTypeTab] = useState<
    SubmissionType | "all"
  >("all");
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

    return items;
  }, [submissions, showClosed, submissionTypeTab]);

  return (
    <div className="mt-10 space-y-6">
      {/* Tabs: submission type */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1 rounded-lg border border-gray-800 bg-gray-900 p-1">
          {SUBMISSION_TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSubmissionTypeTab(tab.value)}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                submissionTypeTab === tab.value
                  ? "border-blue-500 text-white"
                  : "border-transparent text-gray-400 hover:text-gray-300"
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
            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-400">Show closed</span>
        </label>
      </div>

      {/* Result count */}
      <p className="text-sm text-gray-500">
        {filtered.length}{" "}
        {filtered.length === 1 ? "submission" : "submissions"}
      </p>

      {/* Submission list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <p className="text-center text-gray-500">
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
      className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-6 transition-colors hover:border-gray-700"
    >
      <span className="font-medium text-white">{submission.objectName}</span>
      <span
        className={`rounded px-2 py-0.5 text-xs font-medium ${
          TYPE_BADGE_CLASSES[submission.objectType]
        }`}
      >
        {getTypeLabel(submission.objectType)}
      </span>
      <span
        className={`rounded px-2 py-0.5 text-xs font-medium ${
          SUBMISSION_TYPE_BADGE_CLASSES[submission.submissionType]
        }`}
      >
        {getSubmissionTypeLabel(submission.submissionType)}
      </span>
      <span className="text-sm text-gray-400">{submission.submitter}</span>
      <span
        className={`rounded px-2 py-0.5 text-xs font-medium ${
          STATUS_BADGE_CLASSES[submission.status]
        }`}
      >
        {getStatusLabel(submission.status)}
      </span>
      <span className="ml-auto shrink-0 text-xs text-gray-500">
        {new Date(submission.createdAt).toLocaleDateString()}
      </span>
    </Link>
  );
}
