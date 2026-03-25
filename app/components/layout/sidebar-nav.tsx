"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/app/components/role-provider";
import {
  BookOpen,
  Sparkles,
  FileText,
  PenTool,
  ClipboardCheck,
  Upload,
  GitBranch,
  Plug,
  BarChart3,
  Users,
  Shield,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  adminOnly?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Core",
    items: [
      { label: "Knowledge Base", href: "/knowledge", icon: BookOpen },
      { label: "Skills Library", href: "/skills", icon: Sparkles },
      { label: "Content", href: "/content", icon: FileText },
      { label: "Generate", href: "#", icon: PenTool, disabled: true },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Review Queue", href: "/queue", icon: ClipboardCheck },
      { label: "Bulk Upload", href: "/bulk-upload", icon: Upload },
      { label: "Workflows", href: "/workflows", icon: GitBranch },
      { label: "Connected Systems", href: "/connections", icon: Plug },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
    ],
  },
  {
    title: "Admin",
    adminOnly: true,
    items: [
      { label: "User Management", href: "/admin/users", icon: Users },
      { label: "Roles & Permissions", href: "/admin/roles", icon: Shield },
      { label: "Audit Log", href: "/admin/audit", icon: ScrollText },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav() {
  const pathname = usePathname();
  const { hasRole, loading } = useRole();

  return (
    <aside className="fixed left-0 top-1 z-40 flex h-[calc(100vh-4px)] w-sidebar flex-col border-r border-border-default bg-surface-card">
      <div className="px-5 py-6">
        <Link href="/" className="block">
          <span className="text-lg font-semibold text-text-primary">
            Content Engine
          </span>
          <span className="ml-2 text-xs font-medium text-text-muted">
            by HG Insights
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {NAV_GROUPS.map((group) => {
          if (group.adminOnly && (loading || !hasRole("admin"))) return null;

          return (
            <div key={group.title} className="mb-4">
              <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                {group.title}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);

                if (item.disabled) {
                  return (
                    <span
                      key={item.label}
                      className="mx-0 flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-muted opacity-50"
                    >
                      <Icon size={18} />
                      {item.label}
                      <span className="ml-auto text-[10px] font-medium uppercase tracking-wide">
                        Soon
                      </span>
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "mx-0 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      active
                        ? "border-l-2 border-border-focus bg-surface-active text-hg-blue-bright"
                        : "text-text-secondary hover:bg-surface-input hover:text-text-primary",
                    )}
                  >
                    <Icon
                      size={18}
                      className={cn(
                        active ? "text-hg-blue-bright" : "text-text-tertiary",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border-default px-5 py-4">
        <SidebarUserInfo />
      </div>
    </aside>
  );
}

function SidebarUserInfo() {
  const { role, loading } = useRole();

  if (loading) {
    return <div className="h-6 w-32 animate-pulse rounded bg-surface-input" />;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-hg-blue text-xs font-medium text-white">
        {role.charAt(0).toUpperCase()}
      </div>
      <span className="text-sm capitalize text-text-secondary">{role}</span>
    </div>
  );
}
