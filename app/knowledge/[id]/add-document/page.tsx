import { notFound } from "next/navigation";
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
      <div>
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-lg border border-yellow-800 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-300">
            Cannot add documents to a deprecated object. Restore it first.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Add Document
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <p className="text-text-secondary">
            Upload a document to supplement
          </p>
          <TypeBadge type={obj.type} />
          <p className="text-text-secondary font-medium">{obj.name}</p>
        </div>

        <AddDocumentForm
          objectId={obj.id}
          objectName={obj.name}
          objectType={obj.type}
        />
      </div>
    </div>
  );
}
