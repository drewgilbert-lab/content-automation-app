import Link from "next/link";
import { listKnowledgeObjects } from "@/lib/knowledge";
import { KnowledgeForm } from "../components/knowledge-form";

export default async function NewKnowledgePage() {
  const allObjects = await listKnowledgeObjects();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/knowledge"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300"
        >
          &larr; Back to Knowledge Base
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          New Knowledge Object
        </h1>
        <p className="mt-2 text-gray-400">
          Create a new knowledge object to add to the knowledge base.
        </p>

        <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <KnowledgeForm mode="create" allObjects={allObjects} />
        </div>
      </div>
    </main>
  );
}
