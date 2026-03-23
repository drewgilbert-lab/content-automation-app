"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRole } from "@/app/components/role-provider";
import type { UserRole } from "@/lib/user-types";
import { VALID_ROLES } from "@/lib/user-types";

type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  editor: "Editor",
  contributor: "Contributor",
  viewer: "Viewer",
};

const ROLE_BADGE: Record<UserRole, string> = {
  admin: "bg-red-600/20 text-red-400",
  editor: "bg-blue-600/20 text-blue-400",
  contributor: "bg-green-600/20 text-green-400",
  viewer: "bg-gray-600/20 text-gray-400",
};

function formatLastLogin(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

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
      className={`animate-spin text-gray-400 ${className}`}
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

export default function AdminUsersPage() {
  const { role, loading: roleLoading } = useRole();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = role === "admin";

  const loadUsers = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        setListError(await parseErrorMessage(res));
        setUsers([]);
        return;
      }
      const data = (await res.json()) as { users?: AdminUserRow[] };
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch {
      setListError("Could not load users.");
      setUsers([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (roleLoading || !isAdmin) return;
    void loadUsers();
  }, [roleLoading, isAdmin, loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  async function patchUser(
    id: string,
    body: { role?: UserRole; active?: boolean }
  ) {
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await parseErrorMessage(res);
        setRowErrors((prev) => ({ ...prev, [id]: msg }));
        return;
      }
      await loadUsers();
    } catch {
      setRowErrors((prev) => ({
        ...prev,
        [id]: "Network error. Try again.",
      }));
    } finally {
      setUpdatingId(null);
    }
  }

  if (roleLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-10 w-10" />
          <p className="text-sm text-gray-400">Checking access…</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gray-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-lg rounded-xl border border-red-900/40 bg-red-950/20 px-6 py-8">
          <h1 className="text-xl font-semibold text-red-300">Access denied</h1>
          <p className="mt-2 text-sm text-gray-400">
            You need an administrator account to view this page.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            ← Home
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
            User Management
          </h1>
          <p className="mt-2 text-gray-400">
            {listLoading && users.length === 0
              ? "Loading users…"
              : `${users.length} user${users.length === 1 ? "" : "s"} total`}
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="user-search" className="sr-only">
            Search users
          </label>
          <input
            id="user-search"
            type="search"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {listError && (
          <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">
            {listError}
          </div>
        )}

        {listLoading && users.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-gray-800 bg-gray-900/50 py-20">
            <Spinner className="h-10 w-10" />
            <p className="mt-4 text-sm text-gray-400">Loading users…</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-gray-800 bg-gray-900/40 md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-800 bg-gray-900/80 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Last login</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="align-middle">
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{u.name}</div>
                        <div className="text-gray-500">{u.email}</div>
                        {rowErrors[u.id] && (
                          <p className="mt-1 text-xs text-red-400">
                            {rowErrors[u.id]}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role]}`}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-300">
                        {formatLastLogin(u.lastLoginAt)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            u.active
                              ? "inline-flex rounded-md bg-emerald-600/20 px-2 py-0.5 text-xs font-medium text-emerald-400"
                              : "inline-flex rounded-md bg-gray-600/20 px-2 py-0.5 text-xs font-medium text-gray-400"
                          }
                        >
                          {u.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={u.role}
                            disabled={updatingId === u.id}
                            onChange={(e) => {
                              const next = e.target.value as UserRole;
                              if (next === u.role) return;
                              void patchUser(u.id, { role: next });
                            }}
                            className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {VALID_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={updatingId === u.id}
                            onClick={() =>
                              void patchUser(u.id, { active: !u.active })
                            }
                            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                          >
                            {updatingId === u.id ? (
                              <span className="inline-flex items-center gap-1">
                                <Spinner className="h-3.5 w-3.5" />
                                Updating
                              </span>
                            ) : u.active ? (
                              "Deactivate"
                            ) : (
                              "Activate"
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && !listLoading && (
                <p className="px-4 py-12 text-center text-sm text-gray-500">
                  {users.length === 0
                    ? "No users to display."
                    : "No users match your search."}
                </p>
              )}
            </div>

            {/* Mobile cards */}
            <ul className="space-y-4 md:hidden">
              {filteredUsers.map((u) => (
                <li
                  key={u.id}
                  className="rounded-xl border border-gray-800 bg-gray-900/50 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-white">{u.name}</div>
                      <div className="text-sm text-gray-500">{u.email}</div>
                    </div>
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role]}`}
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
                    <span>Last login: {formatLastLogin(u.lastLoginAt)}</span>
                    <span
                      className={
                        u.active ? "text-emerald-400" : "text-gray-500"
                      }
                    >
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {rowErrors[u.id] && (
                    <p className="mt-2 text-xs text-red-400">{rowErrors[u.id]}</p>
                  )}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={(e) => {
                        const next = e.target.value as UserRole;
                        if (next === u.role) return;
                        void patchUser(u.id, { role: next });
                      }}
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 sm:w-auto"
                    >
                      {VALID_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={updatingId === u.id}
                      onClick={() => void patchUser(u.id, { active: !u.active })}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                    >
                      {updatingId === u.id ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Spinner className="h-4 w-4" />
                          Updating
                        </span>
                      ) : u.active ? (
                        "Deactivate"
                      ) : (
                        "Activate"
                      )}
                    </button>
                  </div>
                </li>
              ))}
              {filteredUsers.length === 0 && !listLoading && (
                <li className="py-12 text-center text-sm text-gray-500">
                  {users.length === 0
                    ? "No users to display."
                    : "No users match your search."}
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
