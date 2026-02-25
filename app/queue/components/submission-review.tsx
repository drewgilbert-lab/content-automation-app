"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SubmissionDetail, SubmissionStatus } from "@/lib/submission-types";
import {
  getStatusLabel,
  getSubmissionTypeLabel,
} from "@/lib/submission-types";
import type { KnowledgeDetail } from "@/lib/knowledge-types";
import { getTypeLabel } from "@/lib/knowledge-types";
import { MarkdownRenderer } from "@/app/knowledge/components/markdown-renderer";
import { ContentDiff } from "./content-diff";
import { MergeEditor } from "./merge-editor";

const STATUS_BADGE_CLASSES: Record<SubmissionStatus, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  deferred: "bg-orange-500/15 text-orange-400",
  accepted: "bg-green-500/15 text-green-400",
  rejected: "bg-red-500/15 text-red-400",
};

const SUBMISSION_TYPE_BADGE_CLASSES = {
  new: "bg-cyan-500/15 text-cyan-400",
  update: "bg-indigo-500/15 text-indigo-400",
} as const;

const TYPE_BADGE_CLASSES: Record<string, string> = {
  persona: "bg-blue-500/15 text-blue-400",
  segment: "bg-emerald-500/15 text-emerald-400",
  use_case: "bg-amber-500/15 text-amber-400",
  business_rule: "bg-purple-500/15 text-purple-400",
  icp: "bg-rose-500/15 text-rose-400",
};

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface ProposedContentParsed {
  name?: string;
  content?: string;
  tags?: string[];
  subType?: string;
  revenueRange?: string;
  employeeRange?: string;
}

interface SubmissionReviewProps {
  submission: SubmissionDetail;
  currentObject: KnowledgeDetail | null;
}

type ActionMode = "none" | "reject" | "defer" | "merge";

export function SubmissionReview({
  submission,
  currentObject,
}: SubmissionReviewProps) {
  const router = useRouter();
  const [actionMode, setActionMode] = useState<ActionMode>("none");
  const [rejectComment, setRejectComment] = useState("");
  const [deferNote, setDeferNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let proposedContent: ProposedContentParsed = {};
  try {
    proposedContent = JSON.parse(submission.proposedContent) ?? {};
  } catch {
    proposedContent = {};
  }

  const canReview =
    submission.status === "pending" || submission.status === "deferred";

  const handleReview = useCallback(
    async (action: "accept" | "reject" | "defer") => {
      setError(null);
      setLoading(true);

      try {
        const body: Record<string, string> = { action };
        if (action === "reject" && rejectComment.trim()) {
          body.comment = rejectComment.trim();
        }
        if (action === "defer" && deferNote.trim()) {
          body.note = deferNote.trim();
        }

        const res = await fetch(`/api/submissions/${submission.id}/review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Failed to review submission");
          setLoading(false);
          return;
        }

        setActionMode("none");
        setRejectComment("");
        setDeferNote("");
        router.push("/queue");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to review submission");
        setLoading(false);
      }
    },
    [submission.id, rejectComment, deferNote, router]
  );

  const handleAccept = useCallback(() => handleReview("accept"), [handleReview]);
  const handleReject = useCallback(() => {
    if (!rejectComment.trim()) {
      setError("Comment is required when rejecting");
      return;
    }
    handleReview("reject");
  }, [handleReview, rejectComment]);
  const handleDefer = useCallback(() => handleReview("defer"), [handleReview]);

  return (
    <div className="space-y-8">
      {/* Metadata card */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
          Submission Details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-medium text-gray-300">Submitter</p>
            <p className="text-sm text-white">{submission.submitter}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Object Type</p>
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                TYPE_BADGE_CLASSES[submission.objectType] ?? "bg-gray-500/15 text-gray-400"
              }`}
            >
              {getTypeLabel(submission.objectType)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Submission Type</p>
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                SUBMISSION_TYPE_BADGE_CLASSES[submission.submissionType]
              }`}
            >
              {getSubmissionTypeLabel(submission.submissionType)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Status</p>
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                STATUS_BADGE_CLASSES[submission.status]
              }`}
            >
              {getStatusLabel(submission.status)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Object Name</p>
            <p className="text-sm text-white">{submission.objectName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">Submitted</p>
            <p className="text-sm text-gray-400">{formatDate(submission.createdAt)}</p>
          </div>
          {submission.reviewedAt && (
            <div>
              <p className="text-sm font-medium text-gray-300">Reviewed</p>
              <p className="text-sm text-gray-400">{formatDate(submission.reviewedAt)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status banners */}
      {submission.status === "rejected" && submission.reviewComment && (
        <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3">
          <p className="text-sm font-medium text-red-300">Rejection reason</p>
          <p className="mt-1 text-sm text-red-200">{submission.reviewComment}</p>
        </div>
      )}

      {submission.status === "deferred" && submission.reviewNote && (
        <div className="rounded-lg border border-yellow-800 bg-yellow-950/30 px-4 py-3">
          <p className="text-sm font-medium text-yellow-300">Deferral note</p>
          <p className="mt-1 text-sm text-yellow-200">{submission.reviewNote}</p>
        </div>
      )}

      {submission.status === "accepted" && submission.targetObjectId && (
        <div className="rounded-lg border border-green-800 bg-green-950/30 px-4 py-3">
          <p className="text-sm font-medium text-green-300">Accepted</p>
          <Link
            href={`/knowledge/${submission.targetObjectId}`}
            className="mt-1 inline-block text-sm text-green-200 underline hover:text-green-100"
          >
            View object in Knowledge Base →
          </Link>
        </div>
      )}

      {submission.status === "accepted" && !submission.targetObjectId && (
        <div className="rounded-lg border border-green-800 bg-green-950/30 px-4 py-3">
          <p className="text-sm font-medium text-green-300">Accepted</p>
          <p className="mt-1 text-sm text-green-200">
            Object was created in the Knowledge Base.
          </p>
          <Link
            href="/knowledge"
            className="mt-2 inline-block text-sm text-green-200 underline hover:text-green-100"
          >
            View Knowledge Base →
          </Link>
        </div>
      )}

      {/* Merge editor — full-width, replaces normal content and actions */}
      {actionMode === "merge" && currentObject && (
        <MergeEditor
          currentContent={currentObject.content}
          submissionId={submission.id}
          onDiscard={() => setActionMode("none")}
          onSaved={() => {
            router.push("/queue");
            router.refresh();
          }}
        />
      )}

      {/* Normal view — hidden during merge */}
      {actionMode !== "merge" && (
        <>
          {/* Content preview */}
          {submission.submissionType === "new" && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
                Proposed Content
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-300">Name</p>
                  <p className="text-sm text-white">{proposedContent.name ?? submission.objectName}</p>
                </div>
                {proposedContent.subType && (
                  <div>
                    <p className="text-sm font-medium text-gray-300">Sub Type</p>
                    <p className="text-sm text-gray-400">{proposedContent.subType}</p>
                  </div>
                )}
                {proposedContent.revenueRange && (
                  <div>
                    <p className="text-sm font-medium text-gray-300">Revenue Range</p>
                    <p className="text-sm text-gray-400">{proposedContent.revenueRange}</p>
                  </div>
                )}
                {proposedContent.employeeRange && (
                  <div>
                    <p className="text-sm font-medium text-gray-300">Employee Range</p>
                    <p className="text-sm text-gray-400">{proposedContent.employeeRange}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">Content</p>
                  <MarkdownRenderer content={proposedContent.content ?? ""} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(proposedContent.tags?.length ?? 0) > 0 ? (
                      (proposedContent.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No tags</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {submission.submissionType === "update" && currentObject && (
            <ContentDiff
              currentObject={currentObject}
              proposedContent={proposedContent}
            />
          )}

          {submission.submissionType === "update" && !currentObject && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <p className="text-sm text-gray-500">
                Current object could not be loaded. Showing proposed content only.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-300">Name</p>
                  <p className="text-sm text-white">{proposedContent.name ?? submission.objectName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">Content</p>
                  <MarkdownRenderer content={proposedContent.content ?? ""} />
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950/30 px-4 py-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          {canReview && (
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
                Actions
              </h3>

              {actionMode === "none" && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleAccept}
                    disabled={loading}
                    className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Processing…" : "Accept"}
                  </button>
                  <button
                    onClick={() => setActionMode("reject")}
                    disabled={loading}
                    className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setActionMode("defer")}
                    disabled={loading}
                    className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Defer
                  </button>
                  {submission.submissionType === "update" && currentObject && (
                    <button
                      onClick={() => setActionMode("merge")}
                      disabled={loading}
                      className="rounded-lg border border-indigo-600 bg-indigo-600/10 px-5 py-2.5 text-sm font-medium text-indigo-300 hover:bg-indigo-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Merge with AI
                    </button>
                  )}
                </div>
              )}

              {actionMode === "reject" && (
                <div className="space-y-3">
                  <textarea
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    placeholder="Required: explain why this submission is being rejected"
                    rows={4}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleReject}
                      disabled={loading || !rejectComment.trim()}
                      className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Rejecting…" : "Confirm Reject"}
                    </button>
                    <button
                      onClick={() => {
                        setActionMode("none");
                        setRejectComment("");
                        setError(null);
                      }}
                      disabled={loading}
                      className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 hover:border-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {actionMode === "defer" && (
                <div className="space-y-3">
                  <textarea
                    value={deferNote}
                    onChange={(e) => setDeferNote(e.target.value)}
                    placeholder="Optional: add a note for why this was deferred"
                    rows={3}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-gray-600 focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleDefer}
                      disabled={loading}
                      className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? "Deferring…" : "Confirm Defer"}
                    </button>
                    <button
                      onClick={() => {
                        setActionMode("none");
                        setDeferNote("");
                        setError(null);
                      }}
                      disabled={loading}
                      className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-300 hover:border-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
