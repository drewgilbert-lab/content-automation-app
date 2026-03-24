"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRole } from "@/app/components/role-provider";

type PermissionSetRecord = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
};

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string; message?: string };
    if (typeof data.error === "string") return data.error;
    if (typeof data.message === "string") return data.message;
  } catch {
    // ignore
  }
  return res.statusText || "Request failed";
}

function Spinner({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-text-secondary ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function AdminRolesPage() {
  const { role, loading: roleLoading } = useRole();
  const [sets, setSets] = useState<PermissionSetRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const isAdmin = role === "admin";

  const loadSets = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) {
        setListError(await parseErrorMessage(res));
        setSets([]);
        return;
      }
      const data = (await res.json()) as {
        permissionSets?: PermissionSetRecord[];
      };
      setSets(
        Array.isArray(data.permissionSets) ? data.permissionSets : []
      );
    } catch {
      setListError("Could not load permission sets.");
      setSets([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (roleLoading || !isAdmin) return;
    void loadSets();
  }, [roleLoading, isAdmin, loadSets]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/roles/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setListError(await parseErrorMessage(res));
        return;
      }
      setConfirmDeleteId(null);
      await loadSets();
    } catch {
      setListError("Failed to delete permission set.");
    } finally {
      setDeletingId(null);
    }
  }

  if (roleLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-text-primary">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-10 w-10" />
          <p className="text-sm text-text-secondary">Checking access…</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="px-6 py-10 text-text-primary">
        <div className="mx-auto max-w-lg rounded-xl border border-status-danger/30 bg-status-danger-bg px-6 py-8">
          <h1 className="text-xl font-semibold text-status-danger">Access denied</h1>
          <p className="mt-2 text-sm text-text-secondary">
            You need an administrator account to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-text-primary">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
                Permission Sets
              </h1>
              <p className="mt-2 text-text-secondary">
                {listLoading && sets.length === 0
                  ? "Loading permission sets…"
                  : `${sets.length} permission set${sets.length === 1 ? "" : "s"} total`}
              </p>
            </div>
            <Link
              href="/admin/roles/new"
              className="rounded-lg bg-action-primary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-action-primary-hover"
            >
              + New Role
            </Link>
          </div>
        </div>

        {listError && (
          <div className="mb-6 rounded-lg border border-status-danger/30 bg-status-danger-bg px-4 py-3 text-sm text-status-danger">
            {listError}
          </div>
        )}

        {listLoading && sets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border-default bg-surface-card py-20">
            <Spinner className="h-10 w-10" />
            <p className="mt-4 text-sm text-text-secondary">
              Loading permission sets…
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-border-default bg-surface-card md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border-default bg-surface-card text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Permissions</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {sets.map((s) => (
                    <tr key={s.id} className="align-middle">
                      <td className="px-4 py-4 font-medium text-text-primary">
                        {s.name}
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        {s.description || "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-md bg-gray-600/20 px-2 py-0.5 text-xs font-medium text-text-secondary">
                          {s.permissions.length} permission
                          {s.permissions.length === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {s.isBuiltIn ? (
                          <span className="inline-flex rounded-md bg-amber-600/20 px-2 py-0.5 text-xs font-medium text-status-warning">
                            Built-in
                          </span>
                        ) : (
                          <span className="inline-flex rounded-md bg-gray-600/20 px-2 py-0.5 text-xs font-medium text-text-secondary">
                            Custom
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/roles/${s.id}/edit`}
                            className="rounded-lg border border-border-default bg-surface-input px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-input"
                          >
                            Edit
                          </Link>
                          {!s.isBuiltIn && (
                            <>
                              {confirmDeleteId === s.id ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={deletingId === s.id}
                                    onClick={() => void handleDelete(s.id)}
                                    className="rounded-lg bg-action-danger px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-action-danger-hover disabled:opacity-50"
                                  >
                                    {deletingId === s.id ? (
                                      <span className="inline-flex items-center gap-1">
                                        <Spinner className="h-3.5 w-3.5" />
                                        Deleting
                                      </span>
                                    ) : (
                                      "Confirm"
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="rounded-lg border border-border-default bg-surface-input px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-input"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(s.id)}
                                  className="rounded-lg border border-status-danger/30 bg-status-danger-bg px-3 py-1.5 text-xs font-medium text-status-danger transition-colors hover:bg-status-danger-bg"
                                >
                                  Delete
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sets.length === 0 && !listLoading && (
                <p className="px-4 py-12 text-center text-sm text-text-muted">
                  No permission sets to display.
                </p>
              )}
            </div>

            {/* Mobile cards */}
            <ul className="space-y-4 md:hidden">
              {sets.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-border-default bg-surface-card p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-text-primary">{s.name}</div>
                      <div className="mt-1 text-sm text-text-secondary">
                        {s.description || "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex rounded-md bg-gray-600/20 px-2 py-0.5 text-xs font-medium text-text-secondary">
                        {s.permissions.length}
                      </span>
                      {s.isBuiltIn && (
                        <span className="inline-flex rounded-md bg-amber-600/20 px-2 py-0.5 text-xs font-medium text-status-warning">
                          Built-in
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Link
                      href={`/admin/roles/${s.id}/edit`}
                      className="rounded-lg border border-border-default bg-surface-input px-3 py-2 text-center text-sm font-medium text-text-primary transition-colors hover:bg-surface-input"
                    >
                      Edit
                    </Link>
                    {!s.isBuiltIn && (
                      <>
                        {confirmDeleteId === s.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={deletingId === s.id}
                              onClick={() => void handleDelete(s.id)}
                              className="rounded-lg bg-action-danger px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-action-danger-hover disabled:opacity-50"
                            >
                              {deletingId === s.id ? (
                                <span className="inline-flex items-center gap-2">
                                  <Spinner className="h-4 w-4" />
                                  Deleting
                                </span>
                              ) : (
                                "Confirm"
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-input"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(s.id)}
                            className="rounded-lg border border-status-danger/30 bg-status-danger-bg px-3 py-2 text-sm font-medium text-status-danger transition-colors hover:bg-status-danger-bg"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
              {sets.length === 0 && !listLoading && (
                <li className="py-12 text-center text-sm text-text-muted">
                  No permission sets to display.
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
