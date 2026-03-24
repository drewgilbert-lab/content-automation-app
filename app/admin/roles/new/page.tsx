"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/app/components/role-provider";

const PERMISSION_CATEGORIES: { label: string; permissions: { key: string; label: string }[] }[] = [
  {
    label: "Knowledge",
    permissions: [
      { key: "knowledge:read", label: "Read" },
      { key: "knowledge:write", label: "Write" },
      { key: "knowledge:delete", label: "Delete" },
    ],
  },
  {
    label: "Skills",
    permissions: [
      { key: "skills:read", label: "Read" },
      { key: "skills:write", label: "Write" },
      { key: "skills:delete", label: "Delete" },
    ],
  },
  {
    label: "Submissions",
    permissions: [
      { key: "submissions:create", label: "Create" },
      { key: "submissions:read", label: "Read" },
      { key: "submissions:review", label: "Review" },
      { key: "submissions:merge", label: "Merge" },
    ],
  },
  {
    label: "Bulk Upload",
    permissions: [{ key: "bulk_upload:use", label: "Use" }],
  },
  {
    label: "Connections",
    permissions: [
      { key: "connections:read", label: "Read" },
      { key: "connections:manage", label: "Manage" },
    ],
  },
  {
    label: "Users",
    permissions: [{ key: "users:manage", label: "Manage" }],
  },
  {
    label: "Dashboard",
    permissions: [{ key: "dashboard:read", label: "Read" }],
  },
  {
    label: "Generate",
    permissions: [{ key: "generate:use", label: "Use" }],
  },
  {
    label: "Settings",
    permissions: [{ key: "settings:configure", label: "Configure" }],
  },
];

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

export default function NewRolePage() {
  const { role, loading: roleLoading } = useRole();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = role === "admin";

  function togglePermission(key: string) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleCategory(categoryPerms: string[]) {
    setPermissions((prev) => {
      const next = new Set(prev);
      const allSelected = categoryPerms.every((p) => next.has(p));
      if (allSelected) {
        categoryPerms.forEach((p) => next.delete(p));
      } else {
        categoryPerms.forEach((p) => next.add(p));
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          permissions: Array.from(permissions),
        }),
      });
      if (!res.ok) {
        setError(await parseErrorMessage(res));
        return;
      }
      router.push("/admin/roles");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
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
        <div className="mx-auto max-w-lg rounded-card border border-status-danger/30 bg-status-danger-bg px-6 py-8">
          <h1 className="text-heading text-status-danger">Access denied</h1>
          <p className="mt-2 text-sm text-text-secondary">
            You need an administrator account to view this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-text-primary">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-display tracking-tight text-text-primary">
            New Permission Set
          </h1>
          <p className="mt-2 text-text-secondary">
            Define a custom role with specific permissions.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-status-danger/30 bg-status-danger-bg px-4 py-3 text-sm text-status-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="rounded-card border border-border-default bg-surface-card p-6">
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="role-name"
                  className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted"
                >
                  Name
                </label>
                <input
                  id="role-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Content Editor"
                  className="w-full rounded-lg border border-border-default bg-surface-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                />
              </div>

              <div>
                <label
                  htmlFor="role-description"
                  className="mb-2 block text-xs font-medium uppercase tracking-wider text-text-muted"
                >
                  Description
                </label>
                <textarea
                  id="role-description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this role is for…"
                  className="w-full rounded-lg border border-border-default bg-surface-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
                />
              </div>

              <div>
                <p className="mb-4 text-xs font-medium uppercase tracking-wider text-text-muted">
                  Permissions
                </p>
                <div className="space-y-4">
                  {PERMISSION_CATEGORIES.map((cat) => {
                    const catKeys = cat.permissions.map((p) => p.key);
                    const allChecked = catKeys.every((k) =>
                      permissions.has(k)
                    );
                    const someChecked =
                      !allChecked &&
                      catKeys.some((k) => permissions.has(k));

                    return (
                      <div
                        key={cat.label}
                        className="rounded-lg border border-border-default bg-surface-page/50 p-4"
                      >
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            ref={(el) => {
                              if (el) el.indeterminate = someChecked;
                            }}
                            onChange={() => toggleCategory(catKeys)}
                            className="h-4 w-4 rounded border-border-default bg-surface-input accent-hg-blue"
                          />
                          <span className="text-sm font-medium text-text-primary">
                            {cat.label}
                          </span>
                        </label>
                        <div className="mt-3 ml-7 flex flex-wrap gap-x-6 gap-y-2">
                          {cat.permissions.map((p) => (
                            <label
                              key={p.key}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="checkbox"
                                checked={permissions.has(p.key)}
                                onChange={() => togglePermission(p.key)}
                                className="h-4 w-4 rounded border-border-default bg-surface-input accent-hg-blue"
                              />
                              <span className="text-sm text-text-secondary">
                                {p.label}
                              </span>
                              <span className="text-xs text-text-muted">
                                {p.key}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <Link
              href="/admin/roles"
              className="text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="rounded-lg bg-action-primary px-6 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-action-primary-hover disabled:opacity-50"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  Creating…
                </span>
              ) : (
                "Create Permission Set"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
