import Link from "next/link";
import { listConnectedSystems } from "@/lib/connections";
import { ConnectionList } from "./components/connection-list";

export default async function ConnectionsPage() {
  const systems = await listConnectedSystems();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Connected Systems
            </h1>
            <p className="mt-2 text-gray-400">
              Manage API keys and integrations for external applications
            </p>
          </div>
          <Link
            href="/connections/new"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            + New Connection
          </Link>
        </div>

        <ConnectionList systems={systems} />
      </div>
    </main>
  );
}
