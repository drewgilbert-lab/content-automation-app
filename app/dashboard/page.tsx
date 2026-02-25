import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard";
import type { KnowledgeType } from "@/lib/knowledge-types";
import { StatCard } from "./components/stat-card";
import { GapTable } from "./components/gap-table";
import { StalenessList } from "./components/staleness-list";

const typeOrder: KnowledgeType[] = [
  "persona",
  "segment",
  "use_case",
  "business_rule",
  "icp",
];

export default async function DashboardPage() {
  const data = await getDashboardData();

  const totalGaps =
    data.gaps.noRelationships.length +
    data.gaps.partialRelationships.length +
    data.gaps.asymmetricRelationships.length +
    data.gaps.icpMissingRefs.length +
    data.gaps.businessRulesNoSubType.length;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-16">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          &larr; Back to Home
        </Link>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Knowledge Base Health
          </h1>
          <p className="mt-2 text-gray-400">
            Object counts, staleness, and relationship gap analysis across all
            collections.
          </p>
        </div>

        {/* Health Summary */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500">
            Overview
          </h2>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <StatCard label="Total Objects" value={data.totalCount} />
            {typeOrder.map((type) => (
              <StatCard
                key={type}
                label=""
                value={data.counts[type]}
                type={type}
              />
            ))}
            <StatCard
              label="Never Reviewed"
              value={data.neverReviewed.length}
              variant="warning"
            />
            <StatCard
              label="Stale (90+ days)"
              value={data.stale.length}
              variant="danger"
            />
            <StatCard
              label="Relationship Gaps"
              value={totalGaps}
              variant="warning"
            />
          </div>
        </section>

        {/* Relationship Gap Report */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500">
            Relationship Gaps
          </h2>
          <GapTable
            noRelationships={data.gaps.noRelationships}
            partialRelationships={data.gaps.partialRelationships}
            asymmetricRelationships={data.gaps.asymmetricRelationships}
            icpMissingRefs={data.gaps.icpMissingRefs}
            businessRulesNoSubType={data.gaps.businessRulesNoSubType}
          />
        </section>

        {/* Staleness Report */}
        <section className="mb-10">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500">
            Staleness Report
          </h2>
          <StalenessList
            neverReviewed={data.neverReviewed}
            stale={data.stale}
          />
        </section>

        {/* Queue placeholder */}
        <section>
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500">
            Review Queue
          </h2>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 opacity-60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">
                  Pending Submissions
                </p>
                <p className="text-xs text-gray-500">
                  Coming soon — requires Group E (Review Queue)
                </p>
              </div>
              <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-500">
                0
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
