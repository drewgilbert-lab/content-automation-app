"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { useRole } from "@/app/components/role-provider";
import { useToast } from "@/app/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ContentStatus } from "@/lib/content-types";

const editLinkClass = cn(
  "inline-flex items-center justify-center transition-colors",
  "border border-border-default text-text-tertiary hover:border-border-focus hover:text-text-secondary",
  "rounded-lg px-4 py-2.5 text-body font-medium",
);

interface ContentDetailActionsProps {
  id: string;
  status: ContentStatus;
  createdBy?: string;
}

export function ContentDetailActions({
  id,
  status,
  createdBy,
}: ContentDetailActionsProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { hasRole } = useRole();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const isEditor = hasRole("editor");
  const canSubmit = hasRole("contributor");
  const isCreator = session?.user?.email === createdBy;

  async function parseErrorMessage(res: Response): Promise<string> {
    try {
      const data = (await res.json()) as { error?: string };
      return data.error ?? `Request failed (${res.status})`;
    } catch {
      return `Request failed (${res.status})`;
    }
  }

  async function handleSubmitForReview() {
    setLoading(true);
    try {
      const res = await fetch(`/api/content/${id}/submit`, { method: "POST" });
      if (!res.ok) {
        showToast(await parseErrorMessage(res), "error");
        return;
      }
      showToast("Content submitted for review", "success");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    setLoading(true);
    try {
      const res = await fetch(`/api/content/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) {
        showToast(await parseErrorMessage(res), "error");
        return;
      }
      showToast("Content approved", "success");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleRejectSubmit() {
    const trimmed = rejectComment.trim();
    if (!trimmed) {
      showToast("A comment is required to reject content.", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/content/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", comment: trimmed }),
      });
      if (!res.ok) {
        showToast(await parseErrorMessage(res), "error");
        return;
      }
      setShowRejectModal(false);
      setRejectComment("");
      showToast("Content returned with feedback", "success");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    setLoading(true);
    try {
      const res = await fetch(`/api/content/${id}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        showToast(await parseErrorMessage(res), "error");
        return;
      }
      showToast("Content published", "success");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/content/${id}`, { method: "DELETE" });
      if (!res.ok) {
        showToast(await parseErrorMessage(res), "error");
        return;
      }
      setShowDeleteConfirm(false);
      showToast("Content deleted", "success");
      router.push("/content");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleResetAndEdit() {
    setLoading(true);
    try {
      const res = await fetch(`/api/content/${id}/reset`, {
        method: "POST",
      });
      if (!res.ok) {
        showToast(await parseErrorMessage(res), "error");
        return;
      }
      setShowResetConfirm(false);
      showToast("Content reset to draft", "info");
      router.push(`/content/${id}/edit`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  function openRejectModal() {
    setRejectComment("");
    setShowRejectModal(true);
  }

  const showAwaitingReview =
    (status === "submitted" || status === "in_review") &&
    isCreator &&
    !isEditor;

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        {showAwaitingReview && (
          <p className="max-w-xs rounded-lg bg-status-info-bg px-3 py-2 text-right text-body text-status-info">
            This content is awaiting review
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {status === "draft" ? (
            <>
              <Link href={`/content/${id}/edit`} className={editLinkClass}>
                Edit
              </Link>
              {canSubmit ? (
                <Button
                  variant="primary"
                  loading={loading}
                  onClick={handleSubmitForReview}
                >
                  Submit for Review
                </Button>
              ) : null}
              {isEditor ? (
                <Button
                  variant="danger"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </Button>
              ) : null}
            </>
          ) : null}

          {status === "rejected" ? (
            <Link href={`/content/${id}/edit`} className={editLinkClass}>
              Edit
            </Link>
          ) : null}

          {(status === "submitted" || status === "in_review") && isEditor ? (
            <>
              <Button
                variant="primary"
                loading={loading}
                onClick={handleApprove}
                className="border border-status-success/30 bg-status-success/20 text-status-success hover:bg-status-success/30"
              >
                Approve
              </Button>
              <Button variant="danger" onClick={openRejectModal}>
                Reject
              </Button>
            </>
          ) : null}

          {status === "approved" ? (
            <>
              {hasRole("admin") ? (
                <Button
                  variant="primary"
                  loading={loading}
                  onClick={handlePublish}
                >
                  Publish
                </Button>
              ) : null}
              <Button
                variant="secondary"
                className={editLinkClass}
                onClick={() => setShowResetConfirm(true)}
              >
                Edit
              </Button>
            </>
          ) : null}

          {status === "published" ? (
            <Button
              variant="secondary"
              className={editLinkClass}
              onClick={() => setShowResetConfirm(true)}
            >
              Edit
            </Button>
          ) : null}
        </div>
      </div>

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-card border border-border-default bg-surface-card p-6 shadow-xl">
            <h3 className="text-subheading text-text-primary">
              Confirm Deletion
            </h3>
            <p className="mt-2 text-body text-text-secondary">
              This will permanently delete this content piece.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={loading}
                onClick={handleDeleteConfirm}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showResetConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-card border border-border-default bg-surface-card p-6 shadow-xl">
            <h3 className="text-subheading text-text-primary">
              Reset to draft?
            </h3>
            <p className="mt-2 text-body text-text-secondary">
              Editing will reset this content to draft status, requiring a new
              review cycle before it can be re-published.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowResetConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={loading}
                onClick={handleResetAndEdit}
              >
                Reset & Edit
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showRejectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-card border border-border-default bg-surface-card p-6 shadow-xl">
            <h3 className="text-subheading text-text-primary">
              Reject Content
            </h3>
            <textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              rows={4}
              className="mt-4 w-full rounded-lg border border-border-default bg-surface-input px-3 py-2 text-body text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none"
              placeholder="Explain what needs to change…"
              aria-label="Rejection comment"
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectComment("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={loading}
                onClick={handleRejectSubmit}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
