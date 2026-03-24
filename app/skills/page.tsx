export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { listSkills } from "@/lib/skills";
import { SkillList } from "./components/skill-list";

export default async function SkillsPage() {
  const skills = await listSkills();

  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h1 className="text-display tracking-tight text-text-primary">
              Skills Library
            </h1>
            <p className="mt-2 text-text-secondary">
              Manage procedural instructions for AI content generation
            </p>
          </div>
          <Link
            href="/skills/new"
            className="flex items-center gap-1.5 rounded-card bg-action-primary px-4 py-2.5 text-body font-medium text-text-primary transition-colors hover:bg-action-primary-hover"
          >
            <Plus className="h-4 w-4" /> New Skill
          </Link>
        </div>

        <SkillList skills={skills} />
      </div>
    </div>
  );
}
