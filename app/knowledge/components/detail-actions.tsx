"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DetailActionsProps {
  id: string;
  deprecated: boolean;
}

export function DetailActions({ id, deprecated }: DetailActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [togglingDeprecation, setTogglingDeprecation] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.referencedByCount && data.referencedByCount > 0) {
        setDeleteWarning(data.warning);
        setShowDeleteConfirm(true);
        setDeleting(false);
        return;
      }

      if (data.deleted) {
        router.push("/knowledge");
        router.refresh();
      }
    } catch {
      setDeleting(false);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/knowledge/${id}?confirm=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.deleted) {
        router.push("/knowledge");
        router.refresh();
      }
    } catch {
      setDeleting(false);
    }
  }

  async function handleToggleDeprecation() {
    setTogglingDeprecation(true);
    try {
      await fetch(`/api/knowledge/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: deprecated ? "restore" : "deprecate",
        }),
      });
      router.refresh();
    } finally {
      setTogglingDeprecation(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/knowledge/${id}/edit`}
          className="rounded-lg border border-border-default px-3.5 py-2 text-body font-medium text-text-secondary hover:border-border-default/80 hover:text-text-primary transition-colors"
        >
          Edit
        </Link>
        {!deprecated && (
          <Link
            href={`/knowledge/${id}/add-document`}
            className="rounded-lg border border-border-default px-3.5 py-2 text-body font-medium text-hg-blue-bright hover:border-border-focus hover:text-hg-blue-muted transition-colors"
          >
            Add Document
          </Link>
        )}
        <button
          onClick={handleToggleDeprecation}
          disabled={togglingDeprecation}
          className="rounded-lg border border-border-default px-3.5 py-2 text-body font-medium text-status-warning hover:border-status-warning/30 hover:text-status-warning disabled:opacity-50 transition-colors"
        >
          {togglingDeprecation
            ? "..."
            : deprecated
              ? "Restore"
              : "Deprecate"}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg border border-border-default px-3.5 py-2 text-body font-medium text-status-danger hover:border-status-danger/30 hover:text-status-danger disabled:opacity-50 transition-colors"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-card border border-border-default bg-surface-card p-6 shadow-xl">
            <h3 className="text-subheading text-text-primary">
              Confirm Deletion
            </h3>
            <p className="mt-2 text-body text-text-secondary">{deleteWarning}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-border-default px-4 py-2 text-body font-medium text-text-secondary hover:border-border-default/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-lg bg-action-danger px-4 py-2 text-body font-medium text-text-primary hover:bg-action-danger-hover disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting..." : "Delete Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
