import Link from "next/link";
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
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href={`/skills/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300"
        >
          &larr; Back to {skill.name}
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
          Edit: {skill.name}
        </h1>

        <div className="mt-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <SkillForm mode="edit" initialData={skill} />
        </div>
      </div>
    </main>
  );
}
