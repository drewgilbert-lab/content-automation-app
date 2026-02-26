import Link from "next/link";
import { listSkills } from "@/lib/skills";
import { SkillList } from "./components/skill-list";

export default async function SkillsPage() {
  const skills = await listSkills();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Skills Library
            </h1>
            <p className="mt-2 text-gray-400">
              Manage procedural instructions for AI content generation
            </p>
          </div>
          <Link
            href="/skills/new"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            + New Skill
          </Link>
        </div>

        <SkillList skills={skills} />
      </div>
    </main>
  );
}
