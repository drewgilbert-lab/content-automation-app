"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SubmissionDetail, SubmissionStatus } from "@/lib/submission-types";
import {
  getStatusLabel,
  getSubmissionTypeLabel,
  getSourceChannelLabel,
} from "@/lib/submission-types";
import type { KnowledgeDetail, KnowledgeType } from "@/lib/knowledge-types";
import { getTypeLabel } from "@/lib/knowledge-types";
import type { SkillDetail } from "@/lib/skill-types";
import { MarkdownRenderer } from "@/app/knowledge/components/markdown-renderer";
import { ContentDiff } from "./content-diff";
import { MergeEditor } from "./merge-editor";
import { ReplaceConfirm } from "./replace-confirm";

const STATUS_BADGE_CLASSES: Record<SubmissionStatus, string> = {
  pending: "bg-status-warning-bg text-status-warning",
  deferred: "bg-status-warning-bg text-status-warning",
  accepted: "bg-status-success-bg text-status-success",
  rejected: "bg-status-danger-bg text-status-danger",
};

const SUBMISSION_TYPE_BADGE_CLASSES: Record<string, string> = {
  new: "bg-status-info-bg text-hg-blue-bright",
  update: "bg-status-info-bg text-status-info",
  document_add: "bg-status-success-bg text-status-success",
};

const TYPE_BADGE_CLASSES: Record<string, string> = {
  persona: "bg-hg-blue/15 text-hg-blue-bright",
  segment: "bg-status-success-bg text-status-success",
  use_case: "bg-status-warning-bg text-status-warning",
  business_rule: "bg-status-info-bg text-hg-blue-muted",
  icp: "bg-status-danger-bg text-status-danger",
  skill: "bg-status-info-bg text-hg-blue-bright",
  competitor: "bg-status-warning-bg text-status-warning",
  customer_evidence: "bg-status-success-bg text-status-success",
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
  sourceFile?: string;
}

function getObjectTypeLabel(type: string): string {
  if (type === "skill") return "Skill";
  return getTypeLabel(type as KnowledgeType);
}

interface SubmissionReviewProps {
  submission: SubmissionDetail;
  currentObject: KnowledgeDetail | null;
  currentSkill?: SkillDetail | null;
}

type ActionMode = "none" | "reject" | "defer" | "merge" | "replace";

export function SubmissionReview({
  submission,
  currentObject,
  currentSkill,
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
      <div className="rounded-card border border-border-default bg-surface-card p-6">
        <h2 className="text-label uppercase tracking-widest text-text-muted mb-4">
          Submission Details
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-body font-medium text-text-secondary">Submitter</p>
            <p className="text-body text-text-primary">{submission.submitter}</p>
          </div>
          <div>
            <p className="text-body font-medium text-text-secondary">Object Type</p>
            <span
              className={`inline-block rounded px-2 py-0.5 text-caption ${
                TYPE_BADGE_CLASSES[submission.objectType] ?? "bg-surface-input/50 text-text-secondary"
              }`}
            >
              {getObjectTypeLabel(submission.objectType)}
            </span>
          </div>
          <div>
            <p className="text-body font-medium text-text-secondary">Submission Type</p>
            <span
              className={`inline-block rounded px-2 py-0.5 text-caption ${
                SUBMISSION_TYPE_BADGE_CLASSES[submission.submissionType]
              }`}
            >
              {getSubmissionTypeLabel(submission.submissionType)}
            </span>
          </div>
          <div>
            <p className="text-body font-medium text-text-secondary">Status</p>
            <span
              className={`inline-block rounded px-2 py-0.5 text-caption ${
                STATUS_BADGE_CLASSES[submission.status]
              }`}
            >
              {getStatusLabel(submission.status)}
            </span>
          </div>
          <div>
            <p className="text-body font-medium text-text-secondary">Object Name</p>
            <p className="text-body text-text-primary">{submission.objectName}</p>
          </div>
          <div>
            <p className="text-body font-medium text-text-secondary">Submitted</p>
            <p className="text-body text-text-secondary">{formatDate(submission.createdAt)}</p>
          </div>
          {submission.reviewedAt && (
            <div>
              <p className="text-body font-medium text-text-secondary">Reviewed</p>
              <p className="text-body text-text-secondary">{formatDate(submission.reviewedAt)}</p>
            </div>
          )}
          {submission.status !== "pending" && submission.reviewedBy && (
            <div>
              <p className="text-label uppercase tracking-widest text-text-muted">
                Reviewed By
              </p>
              <p className="mt-1 text-body text-text-secondary">{submission.reviewedBy}</p>
            </div>
          )}
          {submission.sourceChannel && (
            <div>
              <p className="text-body font-medium text-text-secondary">Source</p>
              <p className="text-body text-text-primary">{getSourceChannelLabel(submission.sourceChannel)}</p>
            </div>
          )}
          {submission.sourceAppId && (
            <div>
              <p className="text-body font-medium text-text-secondary">Source App</p>
              <p className="text-body text-text-primary">{submission.sourceAppId}</p>
            </div>
          )}
          {submission.sourceDescription && (
            <div className="sm:col-span-2">
              <p className="text-body font-medium text-text-secondary">Source Description</p>
              <p className="text-body text-text-secondary">{submission.sourceDescription}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status banners */}
      {submission.status === "rejected" && submission.reviewComment && (
        <div className="rounded-lg border border-status-danger/30 bg-status-danger-bg px-4 py-3">
          <p className="text-body font-medium text-status-danger">Rejection reason</p>
          <p className="mt-1 text-body text-status-danger">{submission.reviewComment}</p>
        </div>
      )}

      {submission.status === "deferred" && submission.reviewNote && (
        <div className="rounded-lg border border-status-warning/30 bg-status-warning-bg px-4 py-3">
          <p className="text-body font-medium text-status-warning">Deferral note</p>
          <p className="mt-1 text-body text-status-warning">{submission.reviewNote}</p>
        </div>
      )}

      {submission.status === "accepted" && submission.targetObjectId && (
        <div className="rounded-lg border border-status-success/30 bg-status-success-bg px-4 py-3">
          <p className="text-body font-medium text-status-success">Accepted</p>
          <Link
            href={submission.objectType === "skill" ? `/skills/${submission.targetObjectId}` : `/knowledge/${submission.targetObjectId}`}
            className="mt-1 inline-block text-body text-status-success underline hover:text-status-success/80"
          >
            {submission.objectType === "skill" ? "View skill in Skills Library →" : "View object in Knowledge Base →"}
          </Link>
        </div>
      )}

      {submission.status === "accepted" && !submission.targetObjectId && (
        <div className="rounded-lg border border-status-success/30 bg-status-success-bg px-4 py-3">
          <p className="text-body font-medium text-status-success">Accepted</p>
          <p className="mt-1 text-body text-status-success">
            Object was created in the Knowledge Base.
          </p>
          <Link
            href="/knowledge"
            className="mt-2 inline-block text-body text-status-success underline hover:text-status-success/80"
          >
            View Knowledge Base →
          </Link>
        </div>
      )}

      {/* Merge editor — full-width, replaces normal content and actions */}
      {actionMode === "merge" && (currentObject || currentSkill) && (
        <MergeEditor
          currentContent={currentObject?.content ?? currentSkill?.content ?? ""}
          submissionId={submission.id}
          onDiscard={() => setActionMode("none")}
          onSaved={() => {
            router.push("/queue");
            router.refresh();
          }}
        />
      )}

      {/* Replace confirm — full-width, replaces normal content and actions */}
      {actionMode === "replace" && (
        <ReplaceConfirm
          proposedContent={proposedContent.content ?? ""}
          submissionId={submission.id}
          onDiscard={() => setActionMode("none")}
          onSaved={() => {
            router.push("/queue");
            router.refresh();
          }}
        />
      )}

      {/* Normal view — hidden during merge or replace */}
      {actionMode !== "merge" && actionMode !== "replace" && (
        <>
          {/* Content preview */}
          {submission.submissionType === "new" && (
            <div className="rounded-card border border-border-default bg-surface-card p-6">
              <h3 className="text-label uppercase tracking-widest text-text-muted mb-4">
                Proposed Content
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-body font-medium text-text-secondary">Name</p>
                  <p className="text-body text-text-primary">{proposedContent.name ?? submission.objectName}</p>
                </div>
                {proposedContent.subType && (
                  <div>
                    <p className="text-body font-medium text-text-secondary">Sub Type</p>
                    <p className="text-body text-text-secondary">{proposedContent.subType}</p>
                  </div>
                )}
                {proposedContent.revenueRange && (
                  <div>
                    <p className="text-body font-medium text-text-secondary">Revenue Range</p>
                    <p className="text-body text-text-secondary">{proposedContent.revenueRange}</p>
                  </div>
                )}
                {proposedContent.employeeRange && (
                  <div>
                    <p className="text-body font-medium text-text-secondary">Employee Range</p>
                    <p className="text-body text-text-secondary">{proposedContent.employeeRange}</p>
                  </div>
                )}
                <div>
                  <p className="text-body font-medium text-text-secondary mb-2">Content</p>
                  <MarkdownRenderer content={proposedContent.content ?? ""} />
                </div>
                <div>
                  <p className="text-body font-medium text-text-secondary mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(proposedContent.tags?.length ?? 0) > 0 ? (
                      (proposedContent.tags ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-body text-text-muted">No tags</span>
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
            <div className="rounded-card border border-border-default bg-surface-card p-6">
              <p className="text-body text-text-muted">
                Current object could not be loaded. Showing proposed content only.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-body font-medium text-text-secondary">Name</p>
                  <p className="text-body text-text-primary">{proposedContent.name ?? submission.objectName}</p>
                </div>
                <div>
                  <p className="text-body font-medium text-text-secondary mb-2">Content</p>
                  <MarkdownRenderer content={proposedContent.content ?? ""} />
                </div>
              </div>
            </div>
          )}

          {submission.submissionType === "document_add" && (
            <div className="rounded-card border border-border-default bg-surface-card p-6">
              <h3 className="text-label uppercase tracking-widest text-text-muted mb-4">
                Uploaded Document
              </h3>
              {proposedContent.sourceFile && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary">
                    Source: {proposedContent.sourceFile}
                  </span>
                </div>
              )}
              <div>
                <p className="text-body font-medium text-text-secondary mb-2">Document Content</p>
                <MarkdownRenderer content={proposedContent.content ?? ""} />
              </div>
              {currentObject && (
                <div className="mt-6 border-t border-border-default pt-6">
                  <p className="text-body font-medium text-text-secondary mb-2">
                    Current Object Content
                  </p>
                  <MarkdownRenderer content={currentObject.content} />
                </div>
              )}
            </div>
          )}

          {submission.objectType === "skill" && (
            <div className="rounded-card border border-border-default bg-surface-card p-6">
              <h3 className="text-label uppercase tracking-widest text-text-muted mb-4">
                Skill Refresh Suggestion
              </h3>
              {currentSkill && (
                <div className="mb-6">
                  <p className="text-body font-medium text-text-secondary mb-2">Current Skill Content</p>
                  <MarkdownRenderer content={currentSkill.content} />
                </div>
              )}
              <div className="border-t border-border-default pt-6">
                <p className="text-body font-medium text-text-secondary mb-2">Updated Knowledge Object</p>
                <MarkdownRenderer content={proposedContent.content ?? ""} />
              </div>
              {(proposedContent as Record<string, unknown>).integrationPrompt ? (
                <div className="border-t border-border-default pt-6 mt-6">
                  <p className="text-body font-medium text-text-secondary mb-2">Integration Prompt</p>
                  <p className="text-body text-text-secondary italic">
                    {String((proposedContent as Record<string, unknown>).integrationPrompt)}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="rounded-lg border border-status-danger/30 bg-status-danger-bg px-4 py-3">
              <p className="text-body text-status-danger">{error}</p>
            </div>
          )}

          {/* Action buttons */}
          {canReview && (
            <div className="rounded-card border border-border-default bg-surface-card p-6">
              <h3 className="text-label uppercase tracking-widest text-text-muted mb-4">
                Actions
              </h3>

              {actionMode === "none" && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleAccept}
                    disabled={loading}
                    className="rounded-lg bg-action-primary px-5 py-2.5 text-body font-medium text-text-primary hover:bg-action-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Processing…" : "Accept"}
                  </button>
                  <button
                    onClick={() => setActionMode("reject")}
                    disabled={loading}
                    className="rounded-lg bg-action-danger px-5 py-2.5 text-body font-medium text-text-primary hover:bg-action-danger-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setActionMode("defer")}
                    disabled={loading}
                    className="rounded-lg border border-border-default px-5 py-2.5 text-body font-medium text-text-secondary hover:border-border-default/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Defer
                  </button>
                  {(((submission.submissionType === "update" || submission.submissionType === "document_add") && currentObject) || (submission.objectType === "skill" && currentSkill)) && (
                    <button
                      onClick={() => setActionMode("merge")}
                      disabled={loading}
                      className="rounded-lg border border-status-info/30 bg-status-info-bg px-5 py-2.5 text-body font-medium text-status-info hover:bg-status-info-bg/80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submission.submissionType === "document_add" ? "Merge Document" : "Merge with AI"}
                    </button>
                  )}
                  {submission.submissionType === "update" && currentObject && (
                    <button
                      onClick={() => setActionMode("replace")}
                      disabled={loading}
                      className="rounded-lg border border-status-warning/30 bg-status-warning-bg px-5 py-2.5 text-body font-medium text-status-warning hover:bg-status-warning-bg/80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Replace with Proposed
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
                    className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleReject}
                      disabled={loading || !rejectComment.trim()}
                      className="rounded-lg bg-action-danger px-5 py-2.5 text-body font-medium text-text-primary hover:bg-action-danger-hover disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="rounded-lg border border-border-default px-5 py-2.5 text-body font-medium text-text-secondary hover:border-border-default/80"
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
                    className="w-full rounded-lg border border-border-default bg-surface-input px-4 py-2.5 text-text-primary placeholder-text-muted focus:border-border-focus focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleDefer}
                      disabled={loading}
                      className="rounded-lg border border-border-default px-5 py-2.5 text-body font-medium text-text-secondary hover:border-border-default/80 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="rounded-lg border border-border-default px-5 py-2.5 text-body font-medium text-text-secondary hover:border-border-default/80"
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
