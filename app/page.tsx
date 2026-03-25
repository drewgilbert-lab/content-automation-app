export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Brain,
  ClipboardList,
  Database,
  FileText,
  Lightbulb,
} from "lucide-react";
import { checkWeaviateConnection } from "@/lib/weaviate";
import { checkClaudeConnection } from "@/lib/claude";
import { Badge } from "@/app/components/ui/badge";

async function getConnectionStatuses() {
  const [db, claude] = await Promise.allSettled([
    checkWeaviateConnection(),
    checkClaudeConnection(),
  ]);

  return {
    db: db.status === "fulfilled" && db.value,
    claude: claude.status === "fulfilled" && claude.value,
  };
}

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <Badge
      variant={connected ? "success" : "danger"}
      className="gap-1.5 px-3 py-1 text-caption"
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? "bg-status-success" : "bg-status-danger"
        }`}
      />
      {connected ? "Connected" : "Not connected"}
    </Badge>
  );
}

const quickActions = [
  {
    href: "/knowledge",
    label: "Knowledge Base",
    icon: BookOpen,
  },
  {
    href: "/skills",
    label: "Skills Library",
    icon: Lightbulb,
  },
  {
    href: "/content",
    label: "Content Library",
    icon: FileText,
  },
  {
    href: "/queue",
    label: "Review Queue",
    icon: ClipboardList,
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: BarChart3,
  },
] as const;

export default async function HomePage() {
  const { db, claude } = await getConnectionStatuses();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-display tracking-tight text-text-primary">
          Content Engine
        </h1>
        <p className="mt-2 text-body text-text-secondary">
          AI-powered content operations platform
        </p>
      </div>

      <div className="rounded-card border border-border-default bg-surface-card p-6">
        <h2 className="mb-4 text-label uppercase tracking-widest text-text-muted">
          System Status
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex items-center justify-between rounded-lg bg-surface-input px-4 py-3 sm:flex-1">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Database
                className="h-5 w-5 shrink-0 text-hg-blue-bright"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-body font-medium text-text-primary">
                  Weaviate
                </p>
                <p className="text-caption text-text-secondary">
                  Vector knowledge store
                </p>
              </div>
            </div>
            <StatusBadge connected={db} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-input px-4 py-3 sm:flex-1">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Brain
                className="h-5 w-5 shrink-0 text-hg-blue-bright"
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-body font-medium text-text-primary">
                  Claude API
                </p>
                <p className="text-caption text-text-secondary">
                  Anthropic content generation
                </p>
              </div>
            </div>
            <StatusBadge connected={claude} />
          </div>
        </div>
        {(!db || !claude) && (
          <p className="mt-4 text-caption text-status-warning">
            Add your credentials to{" "}
            <code className="font-mono text-text-primary">.env.local</code> to
            connect services.
          </p>
        )}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-label uppercase tracking-widest text-text-muted">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {quickActions.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-card border border-border-default bg-surface-card p-4 transition-colors hover:border-border-focus"
            >
              <Icon
                className="h-5 w-5 shrink-0 text-hg-blue-bright"
                aria-hidden
              />
              <span className="text-subheading text-text-primary">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
