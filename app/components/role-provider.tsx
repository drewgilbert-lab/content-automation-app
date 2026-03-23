"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { UserRole } from "@/lib/user-types";
import { hasMinimumRole } from "@/lib/user-types";

interface RoleContextType {
  role: UserRole;
  loading: boolean;
  hasRole: (minimumRole: UserRole) => boolean;
}

const RoleContext = createContext<RoleContextType>({
  role: "viewer",
  loading: true,
  hasRole: () => false,
});

export function useRole() {
  return useContext(RoleContext);
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>("viewer");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchRole() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.role) {
            setRole(data.role);
          }
        }
      } catch {
        // Fall back to viewer on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRole();
    return () => { cancelled = true; };
  }, []);

  function hasRole(minimumRole: UserRole): boolean {
    return hasMinimumRole(role, minimumRole);
  }

  return (
    <RoleContext.Provider value={{ role, loading, hasRole }}>
      {children}
    </RoleContext.Provider>
  );
}
