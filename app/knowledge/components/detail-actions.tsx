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
          className="rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-gray-300 hover:border-gray-600 hover:text-white transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={handleToggleDeprecation}
          disabled={togglingDeprecation}
          className="rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-yellow-400 hover:border-yellow-700 hover:text-yellow-300 disabled:opacity-50 transition-colors"
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
          className="rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-red-400 hover:border-red-700 hover:text-red-300 disabled:opacity-50 transition-colors"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">
              Confirm Deletion
            </h3>
            <p className="mt-2 text-sm text-gray-300">{deleteWarning}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
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
