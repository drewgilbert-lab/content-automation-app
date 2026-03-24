import { notFound } from "next/navigation";
import { getKnowledgeObject, getCompatibleRelationships, getReverseRelationships, getInboundReferences } from "@/lib/knowledge";
import { TypeBadge } from "../components/type-badge";
import { MarkdownRenderer } from "../components/markdown-renderer";
import { DetailActions } from "../components/detail-actions";
import { ManageRelationships } from "../components/manage-relationships";

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function KnowledgeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const obj = await getKnowledgeObject(id);

  if (!obj) notFound();

  const compatibleRelationships = getCompatibleRelationships(obj.type);
  const reverseRelationships = getReverseRelationships(obj.type);

  const inboundRefs = reverseRelationships.length > 0
    ? await getInboundReferences(obj.id, obj.type)
    : {};
  const mergedCrossReferences = { ...obj.crossReferences, ...inboundRefs };

  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-display tracking-tight text-text-primary">
              {obj.name}
            </h1>
            {obj.deprecated && (
              <span className="rounded-md bg-status-warning-bg border border-status-warning/30 px-2.5 py-0.5 text-caption text-status-warning">
                Deprecated
              </span>
            )}
          </div>
          <DetailActions id={obj.id} deprecated={obj.deprecated} />
        </div>

        {obj.deprecated && (
          <div className="mt-4 rounded-lg border border-status-warning/30 bg-status-warning-bg px-4 py-3 text-body text-status-warning">
            This object is deprecated and will be excluded from content
            generation context.
          </div>
        )}

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          {/* Main content */}
          <div className="lg:flex-1 min-w-0">
            <div className="rounded-card border border-border-default bg-surface-card p-6">
              <MarkdownRenderer content={obj.content} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-6">
            {/* Metadata */}
            <div className="rounded-card border border-border-default bg-surface-card p-6 space-y-4">
              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Type
                </p>
                <div className="mt-1">
                  <TypeBadge type={obj.type} />
                </div>
              </div>

              {obj.subType && (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Sub Type
                  </p>
                  <p className="mt-1 text-body text-text-secondary">{obj.subType}</p>
                </div>
              )}

              {obj.revenueRange && (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Revenue Range
                  </p>
                  <p className="mt-1 text-body text-text-secondary">
                    {obj.revenueRange}
                  </p>
                </div>
              )}

              {obj.employeeRange && (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Employee Range
                  </p>
                  <p className="mt-1 text-body text-text-secondary">
                    {obj.employeeRange}
                  </p>
                </div>
              )}

              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Tags
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {obj.tags.length > 0 ? (
                    obj.tags.map((tag) => (
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

              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Created
                </p>
                <p className="mt-1 text-body text-text-secondary">
                  {formatDate(obj.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-label uppercase tracking-widest text-text-muted">
                  Updated
                </p>
                <p className="mt-1 text-body text-text-secondary">
                  {formatDate(obj.updatedAt)}
                </p>
              </div>

              {obj.createdBy && (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Created By
                  </p>
                  <p className="mt-1 text-body text-text-secondary">{obj.createdBy}</p>
                </div>
              )}

              {obj.updatedBy && (
                <div>
                  <p className="text-label uppercase tracking-widest text-text-muted">
                    Last Edited By
                  </p>
                  <p className="mt-1 text-body text-text-secondary">{obj.updatedBy}</p>
                </div>
              )}
            </div>

            {/* Relationships */}
            <ManageRelationships
              objectId={obj.id}
              objectType={obj.type}
              crossReferences={mergedCrossReferences}
              compatibleRelationships={compatibleRelationships}
              reverseRelationships={reverseRelationships}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
