export const dynamic = "force-dynamic";

import { checkWeaviateConnection } from "@/lib/weaviate";
import { checkClaudeConnection } from "@/lib/claude";

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
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        connected
          ? "bg-status-success-bg text-status-success"
          : "bg-status-danger-bg text-status-danger"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? "bg-status-success" : "bg-status-danger"
        }`}
      />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

export default async function HomePage() {
  const { db, claude } = await getConnectionStatuses();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Content Engine
        </h1>
        <p className="mt-2 text-text-secondary">
          AI-powered content operations platform
        </p>
      </div>

      <div className="rounded-xl border border-border-default bg-surface-card p-6">
        <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          System Status
        </h2>
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex items-center justify-between rounded-lg bg-surface-input px-4 py-3 sm:flex-1">
            <div>
              <p className="text-sm font-medium text-text-primary">Weaviate</p>
              <p className="text-xs text-text-secondary">Vector knowledge store</p>
            </div>
            <StatusBadge connected={db} />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-input px-4 py-3 sm:flex-1">
            <div>
              <p className="text-sm font-medium text-text-primary">Claude API</p>
              <p className="text-xs text-text-secondary">
                Anthropic content generation
              </p>
            </div>
            <StatusBadge connected={claude} />
          </div>
        </div>
        {(!db || !claude) && (
          <p className="mt-4 text-xs text-status-warning">
            Add your credentials to{" "}
            <code className="font-mono text-text-primary">.env.local</code> to
            connect services.
          </p>
        )}
      </div>
    </div>
  );
}
