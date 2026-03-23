"use client";

import { useRole } from "./role-provider";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-600/20 text-red-400 border-red-600/30",
  editor: "bg-blue-600/20 text-blue-400 border-blue-600/30",
  contributor: "bg-green-600/20 text-green-400 border-green-600/30",
  viewer: "bg-gray-600/20 text-gray-400 border-gray-600/30",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  editor: "Editor",
  contributor: "Contributor",
  viewer: "Viewer",
};

export function RoleToggle() {
  const { role, loading } = useRole();

  if (loading) {
    return <div className="h-6 w-16 animate-pulse rounded bg-gray-800" />;
  }

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${
        ROLE_COLORS[role] ?? ROLE_COLORS.viewer
      }`}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}
