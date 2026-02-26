import { notFound } from "next/navigation";
import Link from "next/link";
import { getKnowledgeObject } from "@/lib/knowledge";
import { TypeBadge } from "../../components/type-badge";
import { AddDocumentForm } from "./add-document-form";

export default async function AddDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const obj = await getKnowledgeObject(id);

  if (!obj) notFound();

  if (obj.deprecated) {
    return (
      <main className="min-h-screen bg-gray-950 text-white">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <Link
            href={`/knowledge/${id}`}
            className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300"
          >
            &larr; Back to {obj.name}
          </Link>
          <div className="mt-8 rounded-lg border border-yellow-800 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-300">
            Cannot add documents to a deprecated object. Restore it first.
          </div>
        </div>
      </main>
    );
  }

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
          Add Document
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-gray-400">
            Upload a document to supplement
          </p>
          <TypeBadge type={obj.type} />
          <p className="text-gray-400 font-medium">{obj.name}</p>
        </div>

        <AddDocumentForm
          objectId={obj.id}
          objectName={obj.name}
          objectType={obj.type}
        />
      </div>
    </main>
  );
}
