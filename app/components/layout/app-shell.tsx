"use client";

import { usePathname } from "next/navigation";
import { SidebarNav } from "./sidebar-nav";
import { TopBar } from "./top-bar";

const SHELL_EXCLUDED_PREFIXES = ["/auth"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const excluded = SHELL_EXCLUDED_PREFIXES.some((p) =>
    pathname.startsWith(p),
  );

  if (excluded) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav />
      <div className="ml-sidebar flex min-h-screen flex-1 flex-col bg-surface-page">
        <TopBar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
