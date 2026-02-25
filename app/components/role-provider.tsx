"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

type Role = "admin" | "contributor";

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextType>({
  role: "admin",
  setRole: () => {},
});

export function useRole() {
  return useContext(RoleContext);
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("admin");

  useEffect(() => {
    const stored = localStorage.getItem("content-engine-role");
    if (stored === "admin" || stored === "contributor") {
      setRoleState(stored);
    }
  }, []);

  const setRole = useCallback((newRole: Role) => {
    setRoleState(newRole);
    localStorage.setItem("content-engine-role", newRole);
  }, []);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}
