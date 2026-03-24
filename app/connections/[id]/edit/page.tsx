import { notFound } from "next/navigation";
import { getConnectedSystem } from "@/lib/connections";
import { ConnectionForm } from "../../components/connection-form";

export default async function EditConnectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const system = await getConnectedSystem(id);

  if (!system) notFound();

  return (
    <div>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
          Edit: {system.name}
        </h1>

        <div className="mt-8 rounded-xl border border-border-default bg-surface-card p-6">
          <ConnectionForm mode="edit" initialData={system} />
        </div>
      </div>
    </div>
  );
}
