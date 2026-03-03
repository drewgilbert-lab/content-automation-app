import { notFound } from "next/navigation";
import Link from "next/link";
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
    <div className="rounded-xl border border-violet-800/50 bg-violet-950/20 p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-violet-300">
          MCP Configuration
        </h3>
        <p className="mt-1 text-xs text-gray-400">
          This connection has MCP {mcpScopes} access. Use the config below with
          Streamable HTTP clients (Claude Desktop remote, Gemini, etc.).
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
          Server URL
        </p>
        {mcpServerUrl ? (
          <code className="block break-all rounded bg-gray-800 px-3 py-2 font-mono text-sm text-gray-300">
            {mcpServerUrl}/mcp
          </code>
        ) : (
          <p className="text-sm text-yellow-400">
            Set{" "}
            <code className="font-mono text-xs">
              NEXT_PUBLIC_MCP_SERVER_URL
            </code>{" "}
            in your environment to display the server URL here.
          </p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
          Claude Desktop / Cursor Config
        </p>
        <pre className="overflow-x-auto rounded bg-gray-800 px-3 py-2.5 font-mono text-xs text-gray-300 leading-relaxed">
          {configSnippet}
        </pre>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">
          API Key
        </p>
        <p className="text-sm text-gray-300">
          Use the key starting with{" "}
          <code className="font-mono text-xs text-gray-400">
            {apiKeyPrefix}...
          </code>
        </p>
      </div>

      <p className="text-xs text-gray-500">
        For local development (stdio transport), no API key is needed. See{" "}
        <code className="font-mono text-xs text-gray-400">
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
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Link
          href="/connections"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300"
        >
          &larr; Back to Connected Systems
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {system.name}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                system.active
                  ? "bg-green-900/50 border border-green-800 text-green-400"
                  : "bg-gray-800 border border-gray-700 text-gray-400"
              }`}
            >
              {system.active ? "Active" : "Inactive"}
            </span>
          </div>
          <ConnectionDetailActions id={system.id} active={system.active} />
        </div>

        {system.description && (
          <p className="mt-4 text-gray-400">{system.description}</p>
        )}

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          {/* Main info */}
          <div className="lg:flex-1 min-w-0 space-y-6">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  API Key Prefix
                </p>
                <p className="mt-1 font-mono text-sm text-gray-300">
                  {system.apiKeyPrefix}...
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Description
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  {system.description || "No description"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Permissions
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {system.permissions.length > 0 ? (
                    system.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="rounded bg-blue-900/30 border border-blue-800/50 px-2 py-0.5 text-xs text-blue-400"
                      >
                        {perm}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">None</span>
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
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Subscribed Types
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {isAllTypes ? (
                    <span className="rounded bg-purple-900/30 border border-purple-800/50 px-2 py-0.5 text-xs text-purple-400">
                      All types
                    </span>
                  ) : (
                    system.subscribedTypes.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-purple-900/30 border border-purple-800/50 px-2 py-0.5 text-xs text-purple-400"
                      >
                        {formatTypeName(t)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Rate Limit Tier
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  {getRateLimitTierLabel(system.rateLimitTier)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  {formatDate(system.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Updated
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  {formatDate(system.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
