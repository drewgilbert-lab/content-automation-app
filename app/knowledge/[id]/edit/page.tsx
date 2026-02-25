import Link from "next/link";
import { notFound } from "next/navigation";
import { getKnowledgeObject, listKnowledgeObjects } from "@/lib/knowledge";
import { KnowledgeForm } from "../../components/knowledge-form";

export default async function EditKnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [obj, allObjects] = await Promise.all([
    getKnowledgeObject(id),
    listKnowledgeObjects(),
  ]);

  if (!obj) notFound();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href={`/knowledge/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300"
        >
          &larr; Back to {obj.name}
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Edit: {obj.name}
        </h1>

        <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <KnowledgeForm
            mode="edit"
            initialData={obj}
            allObjects={allObjects}
          />
        </div>
      </div>
    </main>
  );
}
