"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { RoleToggle } from "@/app/components/role-toggle";
import { UserMenu } from "@/app/components/user-menu";

const SEGMENT_LABELS: Record<string, string> = {
  knowledge: "Knowledge Base",
  skills: "Skills Library",
  queue: "Review Queue",
  "bulk-upload": "Bulk Upload",
  workflows: "Workflows",
  connections: "Connected Systems",
  dashboard: "Dashboard",
  admin: "Admin",
  users: "User Management",
  roles: "Roles & Permissions",
  audit: "Audit Log",
  new: "New",
  edit: "Edit",
  "add-document": "Add Document",
};

function humanize(segment: string): string {
  return (
    SEGMENT_LABELS[segment] ??
    segment
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function TopBar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments
    .filter((s) => !s.startsWith("[") && !/^[0-9a-f-]{20,}$/i.test(s))
    .map((segment, i, arr) => {
      const href = "/" + segments.slice(0, segments.indexOf(segment) + 1).join("/");
      const isLast = i === arr.length - 1;
      return { label: humanize(segment), href, isLast };
    });

  return (
    <header className="flex h-14 items-center justify-between border-b border-border-default bg-surface-card px-6">
      <nav className="flex items-center gap-1.5 text-sm">
        <Link
          href="/"
          className="text-text-tertiary transition-colors hover:text-text-primary"
        >
          Home
        </Link>
        {crumbs.map((crumb) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            <span className="text-text-muted">/</span>
            {crumb.isLast ? (
              <span className="font-medium text-text-primary">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-text-tertiary transition-colors hover:text-text-primary"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <RoleToggle />
        <UserMenu />
      </div>
    </header>
  );
}
