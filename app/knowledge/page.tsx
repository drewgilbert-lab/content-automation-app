export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { listKnowledgeObjects } from "@/lib/knowledge";
import { KnowledgeList } from "./components/knowledge-list";

export default async function KnowledgePage() {
  const objects = await listKnowledgeObjects();

  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h1 className="text-display tracking-tight text-text-primary">
              Knowledge Base
            </h1>
            <p className="mt-2 text-text-secondary">
              Browse and manage knowledge objects
            </p>
          </div>
          <Link
            href="/knowledge/new"
            className="flex items-center gap-1.5 rounded-card bg-action-primary px-4 py-2.5 text-body font-medium text-text-primary transition-colors hover:bg-action-primary-hover"
          >
            <Plus className="h-4 w-4" /> New Object
          </Link>
        </div>

        <KnowledgeList objects={objects} />
      </div>
    </div>
  );
}
