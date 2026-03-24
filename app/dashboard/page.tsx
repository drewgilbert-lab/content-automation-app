export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard";
import { countPendingSubmissions } from "@/lib/submissions";
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
  "competitor",
  "customer_evidence",
];

export default async function DashboardPage() {
  const [data, pendingCount] = await Promise.all([
    getDashboardData(),
    countPendingSubmissions(),
  ]);

  const totalGaps =
    data.gaps.noRelationships.length +
    data.gaps.partialRelationships.length +
    data.gaps.asymmetricRelationships.length +
    data.gaps.icpMissingRefs.length +
    data.gaps.businessRulesNoSubType.length +
    data.gaps.customerEvidenceNoSubType.length;

  return (
    <div>
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-display tracking-tight text-text-primary">
            Knowledge Base Health
          </h1>
          <p className="mt-2 text-text-secondary">
            Object counts, staleness, and relationship gap analysis across all
            collections.
          </p>
        </div>

        {/* Health Summary */}
        <section className="mb-10">
          <h2 className="mb-4 text-label uppercase tracking-widest text-text-muted">
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
          <h2 className="mb-4 text-label uppercase tracking-widest text-text-muted">
            Relationship Gaps
          </h2>
          <GapTable
            noRelationships={data.gaps.noRelationships}
            partialRelationships={data.gaps.partialRelationships}
            asymmetricRelationships={data.gaps.asymmetricRelationships}
            icpMissingRefs={data.gaps.icpMissingRefs}
            businessRulesNoSubType={data.gaps.businessRulesNoSubType}
            customerEvidenceNoSubType={data.gaps.customerEvidenceNoSubType}
          />
        </section>

        {/* Staleness Report */}
        <section className="mb-10">
          <h2 className="mb-4 text-label uppercase tracking-widest text-text-muted">
            Staleness Report
          </h2>
          <StalenessList
            neverReviewed={data.neverReviewed}
            stale={data.stale}
          />
        </section>

        {/* Review Queue */}
        <section>
          <h2 className="mb-4 text-label uppercase tracking-widest text-text-muted">
            Review Queue
          </h2>
          <div className="space-y-3">
            <Link
              href="/queue"
              className="block rounded-card border border-border-default bg-surface-card p-6 hover:border-border-focus transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">
                    Pending Submissions
                  </p>
                  <p className="text-xs text-text-muted">
                    Submissions awaiting review
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${pendingCount > 0 ? "bg-status-warning-bg text-status-warning" : "bg-surface-input text-text-muted"}`}>
                  {pendingCount}
                </span>
              </div>
            </Link>
            {data.pendingSystemSkillSubmissions > 0 && (
              <Link
                href="/queue"
                className="block rounded-card border border-status-info/30 bg-surface-card p-6 hover:border-status-info/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-secondary">
                      Skill Refresh Suggestions
                    </p>
                    <p className="text-xs text-text-muted">
                      System-generated skill updates from knowledge changes
                    </p>
                  </div>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-status-info-bg text-hg-blue-muted">
                    {data.pendingSystemSkillSubmissions}
                  </span>
                </div>
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
