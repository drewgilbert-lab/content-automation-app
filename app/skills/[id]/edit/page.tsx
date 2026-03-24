import { notFound } from "next/navigation";
import { getSkill } from "@/lib/skills";
import { SkillForm } from "../../components/skill-form";

export default async function EditSkillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const skill = await getSkill(id);

  if (!skill) notFound();

  return (
    <div>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-display tracking-tight text-text-primary">
          Edit: {skill.name}
        </h1>

        <div className="mt-8 rounded-card border border-border-default bg-surface-card p-6">
          <SkillForm mode="edit" initialData={skill} />
        </div>
      </div>
    </div>
  );
}
