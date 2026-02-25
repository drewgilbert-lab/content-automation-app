import Link from "next/link";
import { listKnowledgeObjects } from "@/lib/knowledge";
import { KnowledgeList } from "./components/knowledge-list";

export default async function KnowledgePage() {
  const objects = await listKnowledgeObjects();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Knowledge Base
            </h1>
            <p className="mt-2 text-gray-400">
              Browse and manage knowledge objects
            </p>
          </div>
          <Link
            href="/knowledge/new"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            + New Object
          </Link>
        </div>

        <KnowledgeList objects={objects} />
      </div>
    </main>
  );
}
