import { notFound } from "next/navigation";
import Link from "next/link";
import { getKnowledgeObject, getTypeLabel } from "@/lib/knowledge";
import { TypeBadge } from "../components/type-badge";
import { MarkdownRenderer } from "../components/markdown-renderer";
import { DetailActions } from "../components/detail-actions";

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

  const crossRefEntries = Object.entries(obj.crossReferences).filter(
    ([, refs]) => refs.length > 0
  );

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Link
          href="/knowledge"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300"
        >
          &larr; Back to Knowledge Base
        </Link>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {obj.name}
            </h1>
            {obj.deprecated && (
              <span className="rounded-md bg-yellow-900/50 border border-yellow-700 px-2.5 py-0.5 text-xs font-medium text-yellow-300">
                Deprecated
              </span>
            )}
          </div>
          <DetailActions id={obj.id} deprecated={obj.deprecated} />
        </div>

        {obj.deprecated && (
          <div className="mt-4 rounded-lg border border-yellow-800 bg-yellow-950/30 px-4 py-3 text-sm text-yellow-300">
            This object is deprecated and will be excluded from content
            generation context.
          </div>
        )}

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          {/* Main content */}
          <div className="lg:flex-1 min-w-0">
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <MarkdownRenderer content={obj.content} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 space-y-6">
            {/* Metadata */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </p>
                <div className="mt-1">
                  <TypeBadge type={obj.type} />
                </div>
              </div>

              {obj.subType && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Sub Type
                  </p>
                  <p className="mt-1 text-sm text-gray-300">{obj.subType}</p>
                </div>
              )}

              {obj.revenueRange && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Revenue Range
                  </p>
                  <p className="mt-1 text-sm text-gray-300">
                    {obj.revenueRange}
                  </p>
                </div>
              )}

              {obj.employeeRange && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Employee Range
                  </p>
                  <p className="mt-1 text-sm text-gray-300">
                    {obj.employeeRange}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tags
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {obj.tags.length > 0 ? (
                    obj.tags.map((tag) => (
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

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  {formatDate(obj.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Updated
                </p>
                <p className="mt-1 text-sm text-gray-300">
                  {formatDate(obj.updatedAt)}
                </p>
              </div>
            </div>

            {/* Cross-references */}
            {crossRefEntries.length > 0 && (
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Related Objects
                </p>
                {crossRefEntries.map(([label, refs]) => (
                  <div key={label}>
                    <p className="text-xs font-medium text-gray-500">
                      {label}
                    </p>
                    <div className="mt-1 space-y-1">
                      {refs.map((ref) => (
                        <Link
                          key={ref.id}
                          href={`/knowledge/${ref.id}`}
                          className="block text-sm text-blue-400 hover:text-blue-300"
                        >
                          {ref.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
