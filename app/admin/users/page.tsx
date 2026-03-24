"use client";

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
  permissionSetId: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PermissionSetOption = {
  id: string;
  name: string;
  isBuiltIn: boolean;
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  editor: "Editor",
  contributor: "Contributor",
  viewer: "Viewer",
};

const ROLE_BADGE: Record<UserRole, string> = {
  admin: "bg-red-600/20 text-status-danger",
  editor: "bg-blue-600/20 text-hg-blue-bright",
  contributor: "bg-green-600/20 text-green-400",
  viewer: "bg-gray-600/20 text-text-secondary",
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

export default function AdminUsersPage() {
  const { role, loading: roleLoading } = useRole();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [permissionSets, setPermissionSets] = useState<PermissionSetOption[]>([]);
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
      const [usersRes, setsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/roles"),
      ]);
      if (!usersRes.ok) {
        setListError(await parseErrorMessage(usersRes));
        setUsers([]);
        return;
      }
      const usersData = (await usersRes.json()) as { users?: AdminUserRow[] };
      setUsers(Array.isArray(usersData.users) ? usersData.users : []);

      if (setsRes.ok) {
        const setsData = (await setsRes.json()) as { permissionSets?: PermissionSetOption[] };
        setPermissionSets(Array.isArray(setsData.permissionSets) ? setsData.permissionSets : []);
      }
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
    body: { role?: UserRole; active?: boolean; permissionSetId?: string }
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
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
            User Management
          </h1>
          <p className="mt-2 text-text-secondary">
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
            className="w-full rounded-lg border border-border-default bg-surface-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
          />
        </div>

        {listError && (
          <div className="mb-6 rounded-lg border border-status-danger/30 bg-status-danger-bg px-4 py-3 text-sm text-status-danger">
            {listError}
          </div>
        )}

        {listLoading && users.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border-default bg-surface-card py-20">
            <Spinner className="h-10 w-10" />
            <p className="mt-4 text-sm text-text-secondary">Loading users…</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-border-default bg-surface-card md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border-default bg-surface-card text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Permission Set</th>
                    <th className="px-4 py-3 font-medium">Last login</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="align-middle">
                      <td className="px-4 py-4">
                        <div className="font-medium text-text-primary">{u.name}</div>
                        <div className="text-text-muted">{u.email}</div>
                        {rowErrors[u.id] && (
                          <p className="mt-1 text-xs text-status-danger">
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
                      <td className="px-4 py-4">
                        <select
                          value={u.permissionSetId || ""}
                          disabled={updatingId === u.id}
                          onChange={(e) => {
                            const next = e.target.value;
                            if (next === (u.permissionSetId || "")) return;
                            void patchUser(u.id, { permissionSetId: next } as { role?: UserRole; active?: boolean });
                          }}
                          className="rounded-lg border border-border-default bg-surface-page px-2 py-1.5 text-xs text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus disabled:opacity-50"
                        >
                          <option value="">Default (role-based)</option>
                          {permissionSets.map((ps) => (
                            <option key={ps.id} value={ps.id}>
                              {ps.name}{ps.isBuiltIn ? " ★" : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4 text-text-secondary">
                        {formatLastLogin(u.lastLoginAt)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            u.active
                              ? "inline-flex rounded-md bg-emerald-600/20 px-2 py-0.5 text-xs font-medium text-emerald-400"
                              : "inline-flex rounded-md bg-gray-600/20 px-2 py-0.5 text-xs font-medium text-text-secondary"
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
                            className="rounded-lg border border-border-default bg-surface-page px-2 py-1.5 text-xs text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus disabled:opacity-50"
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
                            className="rounded-lg border border-border-default bg-surface-input px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-input disabled:opacity-50"
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
                <p className="px-4 py-12 text-center text-sm text-text-muted">
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
                  className="rounded-xl border border-border-default bg-surface-card p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-text-primary">{u.name}</div>
                      <div className="text-sm text-text-muted">{u.email}</div>
                    </div>
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role]}`}
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                    <span>Last login: {formatLastLogin(u.lastLoginAt)}</span>
                    <span
                      className={
                        u.active ? "text-emerald-400" : "text-text-muted"
                      }
                    >
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {rowErrors[u.id] && (
                    <p className="mt-2 text-xs text-status-danger">{rowErrors[u.id]}</p>
                  )}
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
                    <select
                      value={u.role}
                      disabled={updatingId === u.id}
                      onChange={(e) => {
                        const next = e.target.value as UserRole;
                        if (next === u.role) return;
                        void patchUser(u.id, { role: next });
                      }}
                      className="w-full rounded-lg border border-border-default bg-surface-page px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus disabled:opacity-50 sm:w-auto"
                    >
                      {VALID_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={u.permissionSetId || ""}
                      disabled={updatingId === u.id}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next === (u.permissionSetId || "")) return;
                        void patchUser(u.id, { permissionSetId: next });
                      }}
                      className="w-full rounded-lg border border-border-default bg-surface-page px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus disabled:opacity-50 sm:w-auto"
                    >
                      <option value="">Default (role-based)</option>
                      {permissionSets.map((ps) => (
                        <option key={ps.id} value={ps.id}>
                          {ps.name}{ps.isBuiltIn ? " ★" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={updatingId === u.id}
                      onClick={() => void patchUser(u.id, { active: !u.active })}
                      className="rounded-lg border border-border-default bg-surface-input px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-input disabled:opacity-50"
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
                <li className="py-12 text-center text-sm text-text-muted">
                  {users.length === 0
                    ? "No users to display."
                    : "No users match your search."}
                </li>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
