# Content Engine — Changelog

> Newest entries first. Last updated: February 2026

---

### Group E — Review Queue (February 2026)

**E1 — Submission API:** `POST /api/submissions` creates pending submissions. Accepts object type, name, proposed content (JSON-serialized), and optional target object ID for updates. Stores in new `Submission` Weaviate collection.

**E2 — Queue list API:** `GET /api/submissions` returns all submissions with optional filters by submission type and status. `GET /api/submissions/[id]` returns a single submission detail.

**E3 — Queue review API:** `POST /api/submissions/[id]/review` accepts actions: `accept` (writes to Weaviate and closes), `reject` (requires comment, closes), `defer` (optional note, stays open). Accept on "new" submissions creates the knowledge object; accept on "update" submissions updates the existing object.

**E4 — Queue UI:** Review queue page at `/queue` with filterable submission list (All/New/Update tabs, show-closed toggle). Review page at `/queue/[id]` with full content preview for new submissions, side-by-side comparison for updates, and Accept/Reject/Defer action buttons. AI Merge placeholder (Group F).

**E5 — Connector/User submission flow:** Role toggle (Admin/Contributor) added to app header, persisted in localStorage. Contributors' create/edit form submissions route through the submission API instead of writing directly to Weaviate. "Submit for Review" button replaces direct save. Dashboard review queue section now shows live pending count with link to queue.

**Infrastructure:** New `Submission` Weaviate collection (migration: `scripts/add-submission-collection.ts`). New `lib/submissions.ts` business logic layer. New `lib/submission-types.ts` type definitions. `diff` npm package added for future content diffing.

---

## Group D — Health Dashboard — 2026-02-25

### D1 — Dashboard data API
- `GET /api/dashboard` — returns health metrics across all 5 knowledge collections
- Object counts per type and total
- Never-reviewed detection (`updatedAt === createdAt`)
- Staleness detection (90+ days since last update)
- Relationship gap analysis: zero refs, partial refs, asymmetric refs, ICP missing persona/segment, BusinessRule missing subType
- `lib/dashboard.ts` — business logic module with `getDashboardData()`, fetches all collections in parallel with cross-references

### D2 — Dashboard page
- `/dashboard` — server component rendering 4 sections
- Overview: stat card grid with per-type counts and warning/danger indicators
- Relationship gaps: collapsible sections by gap category, each row with type badge and "Fix" link to object detail page
- Staleness report: sorted list with "Never Reviewed" (amber) and "Stale" (red) badges
- Review queue: disabled placeholder for Group E
- `app/dashboard/components/stat-card.tsx` — reusable stat card with default/warning/danger variants
- `app/dashboard/components/gap-table.tsx` — collapsible gap report with Fix CTAs
- `app/dashboard/components/staleness-list.tsx` — deduplicated staleness list with badges
- Home page (`app/page.tsx`) updated with active Dashboard navigation card

---

## Group C — Relationship Layer — 2026-02-24

### C1 — Relationship write API
- `POST /api/knowledge/[id]/relationships` — add a cross-reference between objects
- `DELETE /api/knowledge/[id]/relationships` — remove a cross-reference
- Accepts `targetId` and `relationshipType` in request body
- Auto-syncs bidirectional Persona/Segment references
- Validates source/target compatibility before writing

### C2 — Manage Relationships panel
- New `ManageRelationships` client component on every detail page
- Shows current cross-references grouped by type with remove buttons
- Search/select dropdown to add new references from compatible collections
- ICP single-value handling (replace instead of append)
- Optimistic UI updates with error handling
- Replaces the old read-only "Related Objects" card

---

## 2026-02 — Knowledge Base Write Layer (Group B)

### Added
- `POST /api/knowledge` — create endpoint with name uniqueness enforcement (409 on conflict)
- `PUT /api/knowledge/[id]` — update endpoint for any writable fields
- `DELETE /api/knowledge/[id]` — delete endpoint with `GeneratedContent` reference check and confirm flow
- `PATCH /api/knowledge/[id]` — deprecate/restore endpoint
- `/knowledge/new` — create form page
- `/knowledge/[id]/edit` — edit form page
- `app/knowledge/components/knowledge-form.tsx` — adaptive form component with type-specific fields and markdown preview
- `app/knowledge/components/detail-actions.tsx` — detail page action buttons (Edit, Delete, Deprecate/Restore)
- `scripts/add-deprecated-field.ts` — migration script adding `deprecated: boolean` to all 5 knowledge collections
- `KnowledgeCreateInput`, `KnowledgeUpdateInput`, `SUB_TYPES` in `lib/knowledge-types.ts`
- `createKnowledgeObject`, `updateKnowledgeObject`, `deleteKnowledgeObject`, `checkGeneratedContentReferences`, `deprecateKnowledgeObject`, `restoreKnowledgeObject`, `NameConflictError` in `lib/knowledge.ts`

### Changed
- Knowledge Base list page: added "+ New Object" button
- Knowledge Base detail page: added Edit/Delete/Deprecate actions and deprecated banner
- Knowledge list component: added deprecated badge styling

---

## 2026-02-25 — Knowledge Base Read Layer (Group A)

### Added
- `lib/knowledge-types.ts` — client-safe types and utility functions for knowledge objects
- `lib/knowledge.ts` — server-side Weaviate query module (`listKnowledgeObjects`, `getKnowledgeObject`)
- `GET /api/knowledge` — list endpoint with optional `type` filter (26 objects across 5 collections)
- `GET /api/knowledge/[id]` — detail endpoint with cross-reference resolution
- `/knowledge` — Knowledge Base list page with type filter tabs, search, and grouped display
- `/knowledge/[id]` — Knowledge Base detail page with markdown rendering, metadata sidebar, and cross-reference links
- `react-markdown` and `remark-gfm` dependencies for content rendering

### Changed
- Dashboard: Knowledge Base module card is now active and links to `/knowledge`
- `tsconfig.json`: Excluded `scripts/` directory from Next.js build type checking

---

## 2026-02-25

### Added
- `docs/ROADMAP.md` — single source for phases, future modules, backlog, open questions
- `scripts/seed.ts` — collection creation + 26 object seed + 49 cross-references
- `npm run seed` script, `dotenv` and `tsx` dev dependencies

### Changed — Docs Restructuring
- Eliminated content overlap across all docs; each file now has a single responsibility
- `SCOPE.md` — removed repo structure and doc index (duplicated in README/start.mdc)
- `PRD.md` — stripped to requirements only; removed vision, seed inventory, content types, future modules; added pointers
- `BUSINESS_LOGIC.md` — removed workflow states and planned business rules (moved to ROADMAP.md)
- `KNOWLEDGE_BASE.md` — updated seed inventory status from "Pending seed" to "Seeded"
- `TECH_DECISIONS.md` — removed Open Questions (moved to ROADMAP.md)
- Updated `docs-maintenance.mdc`, `start.mdc`, and `README.md` to include ROADMAP.md

### Changed
- `.env.example` now includes `CONTENT_REPO_PATH`

### Infrastructure
- Weaviate Cloud connected, all collections seeded

---

## 2026-02-24

### Added
- `.cursor/rules/start.mdc` — slim always-on project context rule (~50 lines)
- `.cursor/rules/weaviate-patterns.mdc` — glob-triggered Weaviate schema and connection pattern reference
- `.cursor/rules/api-patterns.mdc` — glob-triggered API route contracts and code patterns
- `.cursor/rules/content-logic.mdc` — glob-triggered content generation logic and context assembly
- `.cursor/rules/docs-maintenance.mdc` — description-only rule for sub-agent doc update delegation
- `.cursor/rules/sync-start.mdc` — description-only rule for manual start.mdc regeneration
- `docs/CHANGELOG.md` — this file
- `docs/API.md` — API route reference

### Changed
- Replaced boilerplate `README.md` with project-specific setup guide

---

## 2026-02-23

### Added
- Next.js 16 scaffold with App Router, TypeScript, Tailwind CSS v4
- `lib/weaviate.ts` — serverless-safe Weaviate client with `withWeaviate` helper and connection check
- `lib/claude.ts` — Anthropic client with `streamMessage` streaming and connection check
- `app/api/chat/route.ts` — POST endpoint for Claude streaming
- `app/page.tsx` — dashboard homepage with Weaviate and Claude connection status indicators
- `.env.example` — credential template
- `docs/PRD.md` — product requirements, modules, user stories
- `docs/TECH_DECISIONS.md` — architecture decision records (ADR-001 through ADR-005)
- `docs/BUSINESS_LOGIC.md` — knowledge object types, context assembly, content types, workflow states
- `docs/KNOWLEDGE_BASE.md` — Weaviate schema, content inventory, cross-reference design, seed plan
- `docs/SCOPE.md` — project overview, goals, development status
