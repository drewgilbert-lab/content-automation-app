import { notFound } from "next/navigation";
import Link from "next/link";
import { getSkill } from "@/lib/skills";
import { getContentTypeLabel, getCategoryLabel } from "@/lib/skill-types";
import { MarkdownRenderer } from "@/app/knowledge/components/markdown-renderer";
import { SkillDetailActions } from "../components/skill-detail-actions";
import { SuggestLinks } from "../components/suggest-links";

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
    <div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-display tracking-tight text-text-primary">
              {skill.name}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-caption ${
                skill.deprecated
                  ? "bg-status-warning-bg border border-status-warning/30 text-status-warning"
                  : skill.active
                    ? "bg-status-success-bg border border-status-success/30 text-status-success"
                    : "bg-surface-input border border-border-default text-text-secondary"
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
          <div className="mt-4 rounded-lg border border-status-warning/30 bg-status-warning-bg px-4 py-3 text-body text-status-warning">
            This skill is deprecated and will be excluded from context assembly.
          </div>
        )}

        <p className="mt-4 text-text-secondary">{skill.description}</p>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          {/* Main content */}
          <div className="lg:flex-1 min-w-0">
            <div className="rounded-card border border-border-default bg-surface-card p-6">
              <MarkdownRenderer content={skill.content} />
            </div>

            {skill.sourceKnowledgeObjects && skill.sourceKnowledgeObjects.length > 0 ? (
              <div className="mt-6 rounded-card border border-border-default bg-surface-card p-6">
                <h3 className="text-label uppercase tracking-widest text-text-muted mb-4">
                  Linked Knowledge Objects
                </h3>
                <div className="space-y-4">
                  {skill.sourceKnowledgeObjects.map((link) => (
                    <div key={link.id} className="rounded-lg border border-border-default bg-surface-page p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Link
                          href={`/knowledge/${link.id}`}
                          className="text-body font-medium text-hg-blue-bright hover:text-text-primary"
                        >
                          {link.name || link.id}
                        </Link>
                        <span className="rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary">
                          {link.collection}
                        </span>
                      </div>
                      <p className="text-body text-text-secondary italic">{link.integrationPrompt}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-card border border-border-default bg-surface-card p-6">
                <h3 className="text-label uppercase tracking-widest text-text-muted mb-4">
                  Linked Knowledge Objects
                </h3>
                <p className="text-body text-text-muted">No linked knowledge objects.</p>
              </div>
            )}

            <div className="mt-6">
              <SuggestLinks skillId={skill.id} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-6">
            <div className="rounded-card border border-border-default bg-surface-card p-6 space-y-4">
              {/* Version */}
              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Version
                </p>
                <p className="mt-1 text-body text-text-secondary">v{skill.version}</p>
              </div>

              {/* Category */}
              {skill.category && (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Category
                  </p>
                  <p className="mt-1 text-body text-text-secondary">
                    {getCategoryLabel(skill.category)}
                  </p>
                </div>
              )}

              {/* Content Types */}
              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Content Types
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {skill.contentType.length > 0 ? (
                    skill.contentType.map((ct) => (
                      <span
                        key={ct}
                        className="rounded bg-status-info-bg border border-border-focus/50 px-2 py-0.5 text-caption text-hg-blue-bright"
                      >
                        {getContentTypeLabel(ct)}
                      </span>
                    ))
                  ) : (
                    <span className="text-body text-text-muted">None</span>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Tags
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {skill.tags.length > 0 ? (
                    skill.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-body text-text-muted">No tags</span>
                  )}
                </div>
              </div>

              {/* Author */}
              {skill.author && (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Author
                  </p>
                  <p className="mt-1 text-body text-text-secondary">{skill.author}</p>
                </div>
              )}

              {/* Output Format */}
              {skill.outputFormat && (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Output Format
                  </p>
                  <p className="mt-1 text-body text-text-secondary">
                    {skill.outputFormat}
                  </p>
                </div>
              )}

              {/* Usage Stats */}
              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Usage
                </p>
                <p className="mt-1 text-body text-text-secondary">
                  {skill.usageCount} generated content{" "}
                  {skill.usageCount === 1 ? "item" : "items"}
                </p>
              </div>

              {/* Timestamps */}
              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Created
                </p>
                <p className="mt-1 text-body text-text-secondary">
                  {formatDate(skill.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Updated
                </p>
                <p className="mt-1 text-body text-text-secondary">
                  {formatDate(skill.updatedAt)}
                </p>
              </div>

              {skill.updatedBy && (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Last Edited By
                  </p>
                  <p className="mt-1 text-body text-text-secondary">{skill.updatedBy}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
