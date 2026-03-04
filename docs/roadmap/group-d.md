> Back to [Roadmap Index](./README.md)

# Group D — Health Dashboard — **Done**

**D1 — Dashboard data API** — **Done**
`GET /api/dashboard` route. Returns object count per collection type, objects with `updatedAt === createdAt` (never reviewed), objects not updated in 90+ days (stale), and relationship gap analysis (zero cross-references, partial relationships, asymmetric relationships, ICPs missing persona/segment, BusinessRules with no `subType`). Business logic in `lib/dashboard.ts`; fetches all 5 collections in parallel with cross-references and runs analysis in memory.

**D2 — Dashboard page** — **Done**
Health dashboard at `/dashboard`. Sections: overview stat cards (total count, per-type counts, never-reviewed, stale, gap counts), relationship gap report (collapsible sections by gap category with "Fix" CTA linking to object detail page), staleness report (sorted list with "Never Reviewed" / "Stale" badges), and review queue placeholder (disabled, pending [Group E](./group-e.md)). Home page updated with active Dashboard navigation card.
