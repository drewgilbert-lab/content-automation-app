"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

interface SkillDetailActionsProps {
  id: string;
  active: boolean;
  deprecated: boolean;
}

export function SkillDetailActions({
  id,
  active,
  deprecated,
}: SkillDetailActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);
  const [togglingDeprecation, setTogglingDeprecation] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (data.referencedByCount && data.referencedByCount > 0) {
        setDeleteWarning(data.warning);
        setShowDeleteConfirm(true);
        setDeleting(false);
        return;
      }

      if (data.deleted) {
        router.push("/skills");
        router.refresh();
      }
    } catch {
      setDeleting(false);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/skills/${id}?confirm=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.deleted) {
        router.push("/skills");
        router.refresh();
      }
    } catch {
      setDeleting(false);
    }
  }

  async function handleToggleActive() {
    setTogglingActive(true);
    try {
      await fetch(`/api/skills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: active ? "deactivate" : "activate",
        }),
      });
      router.refresh();
    } finally {
      setTogglingActive(false);
    }
  }

  async function handleToggleDeprecation() {
    setTogglingDeprecation(true);
    try {
      await fetch(`/api/skills/${id}`, {
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
          href={`/skills/${id}/edit`}
          className={cn(
            "inline-flex items-center justify-center transition-colors",
            "border border-border-default text-text-tertiary hover:border-border-focus hover:text-text-secondary",
            "rounded-lg px-4 py-2.5 text-body font-medium",
          )}
        >
          Edit
        </Link>
        {!deprecated && (
          <Button
            variant="secondary"
            onClick={handleToggleActive}
            disabled={togglingActive}
            className={cn(
              active
                ? "border-border-default text-status-warning hover:border-status-warning/30 hover:text-status-warning"
                : "border-border-default text-status-success hover:border-status-success/30 hover:text-status-success",
            )}
          >
            {togglingActive ? "..." : active ? "Deactivate" : "Activate"}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={handleToggleDeprecation}
          disabled={togglingDeprecation}
          className="border-border-default text-status-warning hover:border-status-warning/30 hover:text-status-warning"
        >
          {togglingDeprecation
            ? "..."
            : deprecated
              ? "Restore"
              : "Deprecate"}
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete"}
        </Button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-card border border-border-default bg-surface-card p-6 shadow-xl">
            <h3 className="text-subheading text-text-primary">
              Confirm Deletion
            </h3>
            <p className="mt-2 text-body text-text-secondary">{deleteWarning}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deleting}
                onClick={handleConfirmDelete}
              >
                {deleting ? "Deleting..." : "Delete Anyway"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
