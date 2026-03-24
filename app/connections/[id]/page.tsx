import { notFound } from "next/navigation";
import { getConnectedSystem } from "@/lib/connections";
import { getRateLimitTierLabel } from "@/lib/connection-types";
import { ConnectionDetailActions } from "../components/connection-detail-actions";

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTypeName(type: string): string {
  if (type === "*") return "All";
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function McpConfigCard({
  apiKeyPrefix,
  permissions,
}: {
  apiKeyPrefix: string;
  permissions: string[];
}) {
  const mcpServerUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL;

  const mcpScopes = [
    permissions.includes("mcp-read") && "Read",
    permissions.includes("mcp-write") && "Write",
  ]
    .filter(Boolean)
    .join(" + ");

  const configSnippet = JSON.stringify(
    {
      mcpServers: {
        "content-engine": {
          url: `${mcpServerUrl || "https://your-mcp-server.example.com"}/mcp`,
          headers: {
            Authorization: "Bearer <your-api-key>",
          },
        },
      },
    },
    null,
    2
  );

  return (
    <div className="rounded-card border border-border-default bg-surface-card p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-hg-blue-muted">
          MCP Configuration
        </h3>
        <p className="mt-1 text-xs text-text-secondary">
          This connection has MCP {mcpScopes} access. Use the config below with
          Streamable HTTP clients (Claude Desktop remote, Gemini, etc.).
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
          Server URL
        </p>
        {mcpServerUrl ? (
          <code className="block break-all rounded bg-surface-input px-3 py-2 font-mono text-sm text-text-secondary">
            {mcpServerUrl}/mcp
          </code>
        ) : (
          <p className="text-sm text-status-warning">
            Set{" "}
            <code className="font-mono text-xs">
              NEXT_PUBLIC_MCP_SERVER_URL
            </code>{" "}
            in your environment to display the server URL here.
          </p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
          Claude Desktop / Cursor Config
        </p>
        <pre className="overflow-x-auto rounded bg-surface-input px-3 py-2.5 font-mono text-xs text-text-secondary leading-relaxed">
          {configSnippet}
        </pre>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-text-muted">
          API Key
        </p>
        <p className="text-sm text-text-secondary">
          Use the key starting with{" "}
          <code className="font-mono text-xs text-text-secondary">
            {apiKeyPrefix}...
          </code>
        </p>
      </div>

      <p className="text-xs text-text-muted">
        For local development (stdio transport), no API key is needed. See{" "}
        <code className="font-mono text-xs text-text-secondary">
          mcp-server/README.md
        </code>{" "}
        for full setup docs.
      </p>
    </div>
  );
}

export default async function ConnectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const system = await getConnectedSystem(id);

  if (!system) notFound();

  const isAllTypes =
    system.subscribedTypes.length === 1 && system.subscribedTypes[0] === "*";

  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-display tracking-tight text-text-primary">
              {system.name}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                system.active
                  ? "bg-status-success-bg border border-status-success/30 text-status-success"
                  : "bg-surface-input border border-border-default text-text-secondary"
              }`}
            >
              {system.active ? "Active" : "Inactive"}
            </span>
          </div>
          <ConnectionDetailActions id={system.id} active={system.active} />
        </div>

        {system.description && (
          <p className="mt-4 text-text-secondary">{system.description}</p>
        )}

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          {/* Main info */}
          <div className="lg:flex-1 min-w-0 space-y-6">
            <div className="rounded-card border border-border-default bg-surface-card p-6 space-y-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  API Key Prefix
                </p>
                <p className="mt-1 font-mono text-sm text-text-secondary">
                  {system.apiKeyPrefix}...
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Description
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {system.description || "No description"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Permissions
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {system.permissions.length > 0 ? (
                    system.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="rounded bg-status-info-bg border border-border-default px-2 py-0.5 text-xs text-hg-blue-bright"
                      >
                        {perm}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-text-muted">None</span>
                  )}
                </div>
              </div>
            </div>

            {(system.permissions.includes("mcp-read") ||
              system.permissions.includes("mcp-write")) && (
              <McpConfigCard
                apiKeyPrefix={system.apiKeyPrefix}
                permissions={system.permissions}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-6">
            <div className="rounded-card border border-border-default bg-surface-card p-6 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Subscribed Types
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {isAllTypes ? (
                    <span                     className="rounded bg-surface-input border border-border-default px-2 py-0.5 text-xs text-hg-blue-muted">
                      All types
                    </span>
                  ) : (
                    system.subscribedTypes.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-surface-input border border-border-default px-2 py-0.5 text-xs text-hg-blue-muted"
                      >
                        {formatTypeName(t)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Rate Limit Tier
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {getRateLimitTierLabel(system.rateLimitTier)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Created
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {formatDate(system.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Updated
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  {formatDate(system.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
