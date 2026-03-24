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
    <div>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-display tracking-tight text-text-primary">
          Edit: {obj.name}
        </h1>

        <div className="mt-8 rounded-card border border-border-default bg-surface-card p-6">
          <KnowledgeForm
            mode="edit"
            initialData={obj}
            allObjects={allObjects}
          />
        </div>
      </div>
    </div>
  );
}
