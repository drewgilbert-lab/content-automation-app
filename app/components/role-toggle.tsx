"use client";

import { useRole } from "./role-provider";

export function RoleToggle() {
  const { role, setRole } = useRole();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Role:</span>
      <div className="flex rounded-lg border border-gray-700 overflow-hidden">
        <button
          onClick={() => setRole("admin")}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            role === "admin"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-300"
          }`}
        >
          Admin
        </button>
        <button
          onClick={() => setRole("contributor")}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            role === "contributor"
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-gray-300"
          }`}
        >
          Contributor
        </button>
      </div>
    </div>
  );
}
