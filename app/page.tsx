import Link from "next/link";
import { RoleToggle } from "@/app/components/role-toggle";
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
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? "bg-green-500" : "bg-red-500"
        }`}
      />
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

const navItems = [
  {
    title: "Knowledge Base",
    description: "Manage personas, segments, use cases, and business rules.",
    href: "/knowledge",
    icon: "◈",
    available: true,
  },
  {
    title: "Dashboard",
    description: "Health metrics, relationship gaps, and staleness reports.",
    href: "/dashboard",
    icon: "◧",
    available: true,
  },
  {
    title: "Review Queue",
    description: "Review and approve pending knowledge base submissions.",
    href: "/queue",
    icon: "◇",
    available: true,
  },
  {
    title: "Content",
    description: "Browse, create, and manage generated content across all formats.",
    href: "/content",
    icon: "◻",
    available: false,
  },
  {
    title: "Workflows",
    description: "Review, approve, and publish content through the editorial pipeline.",
    href: "/workflows",
    icon: "◎",
    available: false,
  },
  {
    title: "Generate",
    description: "Create emails, blogs, social posts, and internal docs with AI.",
    href: "/generate",
    icon: "◆",
    available: false,
  },
];

export default async function HomePage() {
  const { db, claude } = await getConnectionStatuses();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Header */}
        <div className="mb-12 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Content Engine
            </h1>
            <p className="mt-2 text-gray-400">
              AI-powered content operations platform
            </p>
          </div>
          <RoleToggle />
        </div>

        {/* Connection Status */}
        <div className="mb-12 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500">
            System Status
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3 sm:flex-1">
              <div>
                <p className="text-sm font-medium text-white">Weaviate</p>
                <p className="text-xs text-gray-400">Vector knowledge store</p>
              </div>
              <StatusBadge connected={db} />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3 sm:flex-1">
              <div>
                <p className="text-sm font-medium text-white">Claude API</p>
                <p className="text-xs text-gray-400">Anthropic content generation</p>
              </div>
              <StatusBadge connected={claude} />
            </div>
          </div>
          {(!db || !claude) && (
            <p className="mt-4 text-xs text-amber-400">
              Add your credentials to <code className="font-mono">.env.local</code> to connect services.
            </p>
          )}
        </div>

        {/* Navigation */}
        <div>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500">
            Modules
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {navItems.map((item) => {
              const card = (
                <>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-xl text-gray-400">{item.icon}</span>
                    <h3 className="font-medium text-white">{item.title}</h3>
                    {!item.available && (
                      <span className="ml-auto rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-500">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{item.description}</p>
                </>
              );

              return item.available ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative rounded-xl border border-gray-800 bg-gray-900 p-6 hover:border-gray-700 transition-colors"
                >
                  {card}
                </Link>
              ) : (
                <div
                  key={item.href}
                  className="relative rounded-xl border border-gray-800 bg-gray-900 p-6 opacity-60"
                >
                  {card}
                </div>
              );
            })}
          </div>
        </div>

        {/* Stack info */}
        <div className="mt-12 border-t border-gray-800 pt-8">
          <p className="text-xs text-gray-600">
            Next.js · Weaviate · Claude API · Vercel
          </p>
        </div>
      </div>
    </main>
  );
}
