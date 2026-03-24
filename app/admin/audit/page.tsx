"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRole } from "@/app/components/role-provider";

type AuditLogRecord = {
  id: string;
  eventType:
    | "sign_in"
    | "sign_out"
    | "sign_in_failed"
    | "role_change"
    | "user_activated"
    | "user_deactivated"
    | "permission_set_change"
    | "permission_set_created"
    | "permission_set_deleted";
  actorEmail: string;
  actorName: string;
  targetEmail: string;
  targetId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
};

const EVENT_LABELS: Record<AuditLogRecord["eventType"], string> = {
  sign_in: "Sign In",
  sign_out: "Sign Out",
  sign_in_failed: "Sign In Failed",
  role_change: "Role Change",
  user_activated: "User Activated",
  user_deactivated: "User Deactivated",
  permission_set_change: "Permission Set Updated",
  permission_set_created: "Permission Set Created",
  permission_set_deleted: "Permission Set Deleted",
};

const EVENT_BADGE: Record<AuditLogRecord["eventType"], string> = {
  sign_in: "bg-status-info-bg text-hg-blue-bright",
  sign_out: "bg-status-info-bg text-hg-blue-bright",
  sign_in_failed: "bg-status-danger-bg text-status-danger",
  role_change: "bg-status-warning-bg text-status-warning",
  user_activated: "bg-status-success-bg text-status-success",
  user_deactivated: "bg-surface-input text-text-secondary",
  permission_set_change: "bg-status-info-bg text-hg-blue-muted",
  permission_set_created: "bg-status-info-bg text-hg-blue-muted",
  permission_set_deleted: "bg-status-info-bg text-hg-blue-muted",
};

const EVENT_TYPES = Object.keys(EVENT_LABELS) as AuditLogRecord["eventType"][];
const PAGE_SIZE = 50;

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "—";
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(iso)
  );
}

function parseDetails(raw: string): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        result[k] = String(v);
      }
      return Object.keys(result).length > 0 ? result : null;
    }
  } catch {
    // ignore
  }
  return null;
}

function formatExact(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "medium",
  }).format(d);
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

export default function AdminAuditPage() {
  const { role, loading: roleLoading } = useRole();
  const [events, setEvents] = useState<AuditLogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = role === "admin";

  const loadEvents = useCallback(
    async (currentOffset: number, type: string, actor: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(currentOffset),
        });
        if (type) params.set("type", type);
        if (actor.trim()) params.set("actor", actor.trim());

        const res = await fetch(`/api/admin/audit?${params.toString()}`);
        if (!res.ok) {
          let msg = res.statusText || "Request failed";
          try {
            const data = await res.json();
            if (typeof data.error === "string") msg = data.error;
          } catch {
            // ignore
          }
          setError(msg);
          setEvents([]);
          setTotal(0);
          return;
        }
        const data = (await res.json()) as {
          events?: AuditLogRecord[];
          total?: number;
        };
        setEvents(Array.isArray(data.events) ? data.events : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
      } catch {
        setError("Could not load audit events.");
        setEvents([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (roleLoading || !isAdmin) return;
    void loadEvents(offset, typeFilter, actorFilter);
  }, [roleLoading, isAdmin, offset, typeFilter, actorFilter, loadEvents]);

  function handleTypeChange(value: string) {
    setTypeFilter(value);
    setOffset(0);
  }

  function handleActorChange(value: string) {
    setActorFilter(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setOffset(0);
    }, 400);
  }

  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + PAGE_SIZE, total);
  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < total;

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
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-display tracking-tight text-text-primary">
            Audit Log
          </h1>
          <p className="mt-2 text-text-secondary">
            {loading && events.length === 0
              ? "Loading events…"
              : `${total} event${total === 1 ? "" : "s"} total`}
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <select
            value={typeFilter}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-surface-card px-4 py-2.5 text-sm text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus sm:w-56"
          >
            <option value="">All event types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_LABELS[t]}
              </option>
            ))}
          </select>
          <label htmlFor="actor-search" className="sr-only">
            Search by actor email
          </label>
          <input
            id="actor-search"
            type="search"
            placeholder="Filter by actor email…"
            value={actorFilter}
            onChange={(e) => handleActorChange(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-surface-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus sm:flex-1"
          />
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-status-danger/30 bg-status-danger-bg px-4 py-3 text-sm text-status-danger">
            {error}
          </div>
        )}

        {loading && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-border-default bg-surface-card py-20">
            <Spinner className="h-10 w-10" />
            <p className="mt-4 text-sm text-text-secondary">Loading events…</p>
          </div>
        ) : events.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-border-default bg-surface-card py-20">
            <p className="text-sm text-text-muted">No audit events found.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-card border border-border-default bg-surface-card md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border-default bg-surface-card text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Event</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Target</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {events.map((ev) => {
                    const details = parseDetails(ev.details);
                    const target = ev.targetEmail || ev.targetId;
                    return (
                      <tr key={ev.id} className="align-top">
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${EVENT_BADGE[ev.eventType]}`}
                          >
                            {EVENT_LABELS[ev.eventType]}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-text-primary">
                            {ev.actorName}
                          </div>
                          <div className="text-text-muted">{ev.actorEmail}</div>
                        </td>
                        <td className="px-4 py-4 text-text-secondary">
                          {target || "—"}
                        </td>
                        <td className="px-4 py-4">
                          {details ? (
                            <dl className="space-y-0.5 text-xs">
                              {Object.entries(details).map(([k, v]) => (
                                <div key={k} className="flex gap-1.5">
                                  <dt className="text-text-muted">{k}:</dt>
                                  <dd className="text-text-secondary">{v}</dd>
                                </div>
                              ))}
                            </dl>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td
                          className="whitespace-nowrap px-4 py-4 text-text-secondary"
                          title={formatExact(ev.timestamp)}
                        >
                          {relativeTime(ev.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="space-y-4 md:hidden">
              {events.map((ev) => {
                const details = parseDetails(ev.details);
                const target = ev.targetEmail || ev.targetId;
                return (
                  <li
                    key={ev.id}
                    className="rounded-card border border-border-default bg-surface-card p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${EVENT_BADGE[ev.eventType]}`}
                      >
                        {EVENT_LABELS[ev.eventType]}
                      </span>
                      <span
                        className="text-xs text-text-muted"
                        title={formatExact(ev.timestamp)}
                      >
                        {relativeTime(ev.timestamp)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-medium text-text-primary">
                        {ev.actorName}
                      </div>
                      <div className="text-xs text-text-muted">
                        {ev.actorEmail}
                      </div>
                    </div>
                    {target && (
                      <div className="mt-2 text-xs text-text-secondary">
                        Target: {target}
                      </div>
                    )}
                    {details && (
                      <dl className="mt-2 space-y-0.5 text-xs">
                        {Object.entries(details).map(([k, v]) => (
                          <div key={k} className="flex gap-1.5">
                            <dt className="text-text-muted">{k}:</dt>
                            <dd className="text-text-secondary">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Pagination */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm">
              <p className="text-text-secondary">
                Showing {rangeStart}–{rangeEnd} of {total} event
                {total === 1 ? "" : "s"}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!hasPrev || loading}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  className="rounded-lg border border-border-default bg-surface-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-input disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!hasNext || loading}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  className="rounded-lg border border-border-default bg-surface-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-input disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
