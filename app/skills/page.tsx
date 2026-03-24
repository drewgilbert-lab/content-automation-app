export const dynamic = "force-dynamic";

import Link from "next/link";
import { listSkills } from "@/lib/skills";
import { SkillList } from "./components/skill-list";

export default async function SkillsPage() {
  const skills = await listSkills();

  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-text-primary">
              Skills Library
            </h1>
            <p className="mt-2 text-text-secondary">
              Manage procedural instructions for AI content generation
            </p>
          </div>
          <Link
            href="/skills/new"
            className="rounded-lg bg-action-primary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-action-primary-hover"
          >
            + New Skill
          </Link>
        </div>

        <SkillList skills={skills} />
      </div>
    </div>
  );
}
