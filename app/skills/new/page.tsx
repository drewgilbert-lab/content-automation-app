import { Suspense } from "react";
import { SkillForm } from "../components/skill-form";

export default function NewSkillPage() {
  return (
    <div>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-display tracking-tight text-text-primary">
          New Skill
        </h1>
        <p className="mt-2 text-text-secondary">
          Create a new procedural instruction for AI content generation.
        </p>

        <div className="mt-8 rounded-card border border-border-default bg-surface-card p-6">
          <Suspense>
            <SkillForm mode="create" />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
