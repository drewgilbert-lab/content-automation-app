"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ConnectionDetailActionsProps {
  id: string;
  active: boolean;
}

export function ConnectionDetailActions({
  id,
  active,
}: ConnectionDetailActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/connections/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.deleted) {
        router.push("/connections");
        router.refresh();
      } else {
        setDeleting(false);
      }
    } catch {
      setDeleting(false);
    }
  }

  async function handleToggleActive() {
    setTogglingActive(true);
    try {
      await fetch(`/api/connections/${id}`, {
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

  async function handleRotateKey() {
    setRotating(true);
    try {
      const res = await fetch(`/api/connections/${id}/rotate-key`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setRotatedKey(data.apiKey);
        setShowRotateConfirm(false);
      }
    } finally {
      setRotating(false);
    }
  }

  async function copyKey() {
    if (!rotatedKey) return;
    await navigator.clipboard.writeText(rotatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function dismissKeyModal() {
    setRotatedKey(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/connections/${id}/edit`}
          className="rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-gray-300 hover:border-gray-600 hover:text-white transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={() => setShowRotateConfirm(true)}
          className="rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-blue-400 hover:border-blue-700 hover:text-blue-300 transition-colors"
        >
          Rotate Key
        </button>
        <button
          onClick={handleToggleActive}
          disabled={togglingActive}
          className={`rounded-lg border px-3.5 py-2 text-sm font-medium disabled:opacity-50 transition-colors ${
            active
              ? "border-gray-700 text-orange-400 hover:border-orange-700 hover:text-orange-300"
              : "border-gray-700 text-green-400 hover:border-green-700 hover:text-green-300"
          }`}
        >
          {togglingActive ? "..." : active ? "Deactivate" : "Activate"}
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={deleting}
          className="rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-red-400 hover:border-red-700 hover:text-red-300 disabled:opacity-50 transition-colors"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">
              Delete Connection
            </h3>
            <p className="mt-2 text-sm text-gray-300">
              This will permanently delete this connected system and revoke its
              API key. Any integrations using this key will stop working
              immediately.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  handleDelete();
                }}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rotate key confirmation modal */}
      {showRotateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">
              Rotate API Key
            </h3>
            <p className="mt-2 text-sm text-gray-300">
              This will generate a new API key and immediately invalidate the
              current one. Any integrations using the old key will stop working.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowRotateConfirm(false)}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:border-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRotateKey}
                disabled={rotating}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
              >
                {rotating ? "Rotating..." : "Rotate Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New key display modal */}
      {rotatedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-lg rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-green-300">
              New API Key Generated
            </h3>
            <p className="mt-2 text-sm text-gray-300">
              Copy your new key now — it cannot be shown again.
            </p>
            <div className="mt-4 rounded-lg border border-yellow-700 bg-yellow-950/30 p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-yellow-400">
                API Key
              </p>
              <div className="flex items-center gap-3">
                <code className="flex-1 break-all rounded bg-gray-800 px-3 py-2 font-mono text-sm text-white">
                  {rotatedKey}
                </code>
                <button
                  onClick={copyKey}
                  className="shrink-0 rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-gray-300 hover:border-gray-600 hover:text-white transition-colors"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="mt-3 text-xs text-yellow-400">
                ⚠ Save this key now. It cannot be shown again.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={dismissKeyModal}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
              >
                I&apos;ve saved the key — Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
