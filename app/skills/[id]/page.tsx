import { notFound } from "next/navigation";
import Link from "next/link";
import { getSkill } from "@/lib/skills";
import { getContentTypeLabel, getCategoryLabel } from "@/lib/skill-types";
import { MarkdownRenderer } from "@/app/knowledge/components/markdown-renderer";
import { SkillDetailActions } from "../components/skill-detail-actions";

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const skill = await getSkill(id);

  if (!skill) notFound();

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Link
          href="/skills"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300"
        >
          &larr; Back to Skills Library
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {skill.name}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                skill.deprecated
                  ? "bg-yellow-900/50 border border-yellow-700 text-yellow-300"
                  : skill.active
                    ? "bg-green-900/50 border border-green-800 text-green-400"
                    : "bg-gray-800 border border-gray-700 text-gray-400"
              }`}
            >
              {skill.deprecated
                ? "Deprecated"
                : skill.active
                  ? "Active"
                  : "Inactive"}
            </span>
          </div>
          <SkillDetailActions
            id={skill.id}
            active={skill.active}
            deprecated={skill.deprecated}
          />
        </div>

        {skill.deprecated && (
          <div className="mt-4 rounded-lg border border-yellow-800 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-300">
            This skill is deprecated and will be excluded from context assembly.
          </div>
        )}

        <p className="mt-4 text-gray-400">{skill.description}</p>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          {/* Main content */}
          <div className="lg:flex-1 min-w-0">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <MarkdownRenderer content={skill.content} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-6">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
              {/* Version */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Version
                </p>
                <p className="mt-1 text-sm text-gray-300">v{skill.version}</p>
              </div>

              {/* Category */}
              {skill.category && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Category
                  </p>
                  <p className="mt-1 text-sm text-gray-300">
                    {getCategoryLabel(skill.category)}
                  </p>
                </div>
              )}

              {/* Content Types */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Content Types
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {skill.contentType.length > 0 ? (
                    skill.contentType.map((ct) => (
                      <span
                        key={ct}
                        className="rounded bg-blue-900/30 border border-blue-800/50 px-2 py-0.5 text-xs text-blue-400"
                      >
                        {getContentTypeLabel(ct)}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">None</span>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tags
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {skill.tags.length > 0 ? (
                    skill.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No tags</span>
                  )}
                </div>
              </div>

              {/* Author */}
              {skill.author && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Author
                  </p>
                  <p className="mt-1 text-sm text-gray-300">{skill.author}</p>
                </div>
              )}

              {/* Output Format */}
              {skill.outputFormat && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Output Format
                  </p>
                  <p className="mt-1 text-sm text-gray-300">
                    {skill.outputFormat}
                  </p>
                </div>
              )}

              {/* Usage Stats */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Usage
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  {skill.usageCount} generated content{" "}
                  {skill.usageCount === 1 ? "item" : "items"}
                </p>
              </div>

              {/* Timestamps */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  {formatDate(skill.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Updated
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  {formatDate(skill.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
