export const dynamic = "force-dynamic";

import { listKnowledgeObjects } from "@/lib/knowledge";
import { KnowledgeForm } from "../components/knowledge-form";

export default async function NewKnowledgePage() {
  const allObjects = await listKnowledgeObjects();

  return (
    <div>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-display tracking-tight text-text-primary">
          New Knowledge Object
        </h1>
        <p className="mt-2 text-text-secondary">
          Create a new knowledge object to add to the knowledge base.
        </p>

        <div className="mt-8 rounded-card border border-border-default bg-surface-card p-6">
          <KnowledgeForm mode="create" allObjects={allObjects} />
        </div>
      </div>
    </div>
  );
}
