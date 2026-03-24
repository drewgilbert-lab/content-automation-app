export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { listConnectedSystems } from "@/lib/connections";
import { ConnectionList } from "./components/connection-list";

export default async function ConnectionsPage() {
  const systems = await listConnectedSystems();

  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h1 className="text-display tracking-tight text-text-primary">
              Connected Systems
            </h1>
            <p className="mt-2 text-text-secondary">
              Manage API keys and integrations for external applications
            </p>
          </div>
          <Link
            href="/connections/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-action-primary px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-action-primary-hover transition-colors"
          >
            <Plus className="h-4 w-4" /> New Connection
          </Link>
        </div>

        <ConnectionList systems={systems} />
      </div>
    </div>
  );
}
