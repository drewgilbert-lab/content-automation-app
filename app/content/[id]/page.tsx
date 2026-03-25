import { notFound } from "next/navigation";
import Link from "next/link";
import { getContent } from "@/lib/content";
import { getContentTypeLabel } from "@/lib/skill-types";
import { getContentSourceChannelLabel } from "@/lib/content-types";
import { MarkdownRenderer } from "@/app/knowledge/components/markdown-renderer";
import { StatusBadge } from "../components/status-badge";
import { ContentDetailActions } from "../components/content-detail-actions";

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const content = await getContent(id);

  if (!content) notFound();

  const hasContextUsed =
    content.usedPersona !== null ||
    content.usedSegment !== null ||
    content.usedUseCases.length > 0 ||
    content.usedBusinessRules.length > 0 ||
    content.usedSkills.length > 0;

  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-display tracking-tight text-text-primary">
              {content.title}
            </h1>
            <StatusBadge status={content.status} />
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <ContentDetailActions
              id={content.id}
              status={content.status}
              createdBy={content.createdBy}
            />
          </div>
        </div>

        {content.reviewComment && content.status === "draft" && (
          <div className="mt-4 rounded-lg border border-status-warning/30 bg-status-warning-bg px-4 py-3">
            <p className="text-body text-status-warning">
              Reviewer Feedback from {content.reviewedBy ?? "Reviewer"}
              {content.reviewedAt
                ? ` on ${formatDate(content.reviewedAt)}`
                : ""}
              : {content.reviewComment}
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 lg:flex-1">
            <div className="rounded-card border border-border-default bg-surface-card p-6">
              {content.body.trim() ? (
                <MarkdownRenderer content={content.body} />
              ) : (
                <p className="text-body text-text-muted">No content body.</p>
              )}
            </div>

            {content.prompt ? (
              <div className="mt-6 rounded-card border border-border-default bg-surface-card p-6">
                <details className="group">
                  <summary className="mb-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <span className="text-label uppercase tracking-widest text-text-muted">
                      Generation Prompt
                    </span>
                  </summary>
                  <p className="whitespace-pre-wrap text-body text-text-secondary">
                    {content.prompt}
                  </p>
                </details>
              </div>
            ) : null}

            <div className="mt-6 rounded-card border border-border-default bg-surface-card p-6">
              <h3 className="mb-4 text-label uppercase tracking-widest text-text-muted">
                Context Used
              </h3>
              {hasContextUsed ? (
                <div className="space-y-3">
                  {content.usedPersona ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/knowledge/${content.usedPersona.id}`}
                        className="text-body font-medium text-hg-blue-bright hover:text-text-primary"
                      >
                        {content.usedPersona.name}
                      </Link>
                      <span className="rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary">
                        Persona
                      </span>
                    </div>
                  ) : null}
                  {content.usedSegment ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/knowledge/${content.usedSegment.id}`}
                        className="text-body font-medium text-hg-blue-bright hover:text-text-primary"
                      >
                        {content.usedSegment.name}
                      </Link>
                      <span className="rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary">
                        Segment
                      </span>
                    </div>
                  ) : null}
                  {content.usedUseCases.map((uc) => (
                    <div
                      key={uc.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Link
                        href={`/knowledge/${uc.id}`}
                        className="text-body font-medium text-hg-blue-bright hover:text-text-primary"
                      >
                        {uc.name}
                      </Link>
                      <span className="rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary">
                        Use Case
                      </span>
                    </div>
                  ))}
                  {content.usedBusinessRules.map((br) => (
                    <div
                      key={br.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Link
                        href={`/knowledge/${br.id}`}
                        className="text-body font-medium text-hg-blue-bright hover:text-text-primary"
                      >
                        {br.name}
                      </Link>
                      <span className="rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary">
                        Business Rule
                      </span>
                    </div>
                  ))}
                  {content.usedSkills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Link
                        href={`/skills/${skill.id}`}
                        className="text-body font-medium text-hg-blue-bright hover:text-text-primary"
                      >
                        {skill.name}
                      </Link>
                      <span className="rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary">
                        Skill
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-body text-text-muted">
                  No context references.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6 lg:w-80">
            <div className="space-y-4 rounded-card border border-border-default bg-surface-card p-6">
              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Content Type
                </p>
                <p className="mt-1 text-body text-text-secondary">
                  {getContentTypeLabel(content.contentType)}
                </p>
              </div>

              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Status
                </p>
                <div className="mt-1">
                  <StatusBadge status={content.status} size="sm" />
                </div>
              </div>

              {content.sourceChannel ? (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Source Channel
                  </p>
                  <p className="mt-1 text-body text-text-secondary">
                    {getContentSourceChannelLabel(content.sourceChannel)}
                  </p>
                </div>
              ) : null}

              {content.sourceDescription ? (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Source Description
                  </p>
                  <p className="mt-1 text-body text-text-secondary">
                    {content.sourceDescription}
                  </p>
                </div>
              ) : null}

              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Tags
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {content.tags.length > 0 ? (
                    content.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-surface-input px-2 py-0.5 text-caption text-text-secondary"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <p className="text-body text-text-muted">No tags</p>
                  )}
                </div>
              </div>

              {content.createdBy ? (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Created By
                  </p>
                  <p className="mt-1 text-body text-text-secondary">
                    {content.createdBy}
                  </p>
                </div>
              ) : null}

              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Created
                </p>
                <p className="mt-1 text-body text-text-secondary">
                  {formatDate(content.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Updated
                </p>
                <p className="mt-1 text-body text-text-secondary">
                  {formatDate(content.updatedAt)}
                </p>
              </div>

              {content.updatedBy ? (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Updated By
                  </p>
                  <p className="mt-1 text-body text-text-secondary">
                    {content.updatedBy}
                  </p>
                </div>
              ) : null}

              {content.reviewedBy ? (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Reviewed By
                  </p>
                  <p className="mt-1 text-body text-text-secondary">
                    {content.reviewedBy}
                  </p>
                </div>
              ) : null}

              {content.reviewedAt ? (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Reviewed At
                  </p>
                  <p className="mt-1 text-body text-text-secondary">
                    {formatDate(content.reviewedAt)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
