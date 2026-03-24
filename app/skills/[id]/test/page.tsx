import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { getSkill } from "@/lib/skills";
import { SkillTester } from "../../components/skill-tester";

export default async function SkillTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const skill = await getSkill(id);

  if (!skill) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={`/skills/${skill.id}`}
        className="text-body text-text-secondary hover:text-text-primary"
      >
        &larr; Back to {skill.name}
      </Link>

      <h1 className="mt-4 text-display tracking-tight text-text-primary">
        Test Skill: {skill.name}
      </h1>

      <div className="mt-8">
        <Suspense
          fallback={
            <div className="rounded-card border border-border-default bg-surface-card p-6 text-body text-text-muted">
              Loading test interface...
            </div>
          }
        >
          <SkillTester
            skillId={skill.id}
            skillName={skill.name}
            skillContentTypes={skill.contentType}
          />
        </Suspense>
      </div>
    </div>
  );
}
