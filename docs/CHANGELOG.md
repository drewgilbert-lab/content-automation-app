# Content Engine — Changelog

> Newest entries first. Last updated: February 2026

---

### Competitor and CustomerEvidence Collections Created (February 26, 2026)

**Migration executed:** The existing migration script `scripts/add-competitor-customerevidence-collections.ts` was run against the Weaviate Cloud instance. Both `Competitor` and `CustomerEvidence` collections now exist in Weaviate. Previously, only 5 of 7 expected collections existed (Persona, Segment, UseCase, BusinessRule, ICP). All 7 knowledge collections are now live. No code changes were made — only the migration script was executed. This is the root fix for the missing collection errors described in the "Bulk Upload Pipeline — Bug Fixes" entry below.

---

### Bulk Upload Pipeline — Bug Fixes (February 26, 2026)

**pdf-parse crash fix:** Downgraded `pdf-parse` from v2.x to v1.x — v2 requires the `DOMMatrix` browser API and crashes in Node.js, causing the "Upload & Parse" button to silently fail. Changed module-level `require("pdf-parse")` to a lazy `await import("pdf-parse")` inside `extractPdf()` so PDF library issues only affect PDF parsing. Added error handling to the upload wizard so server errors surface to the user instead of being silently swallowed.

**Claude model update:** Switched default model from `claude-opus-4-5` / `claude-sonnet-4-20250514` to `claude-haiku-4-5` in both `lib/claude.ts` (streaming and connection check) and `lib/classifier.ts` (document classification). Cost optimization for development.

**Weaviate missing collection handling:** Wrapped `fetchCollectionObjects` calls in `listKnowledgeObjects()` with try/catch that returns `[]` for missing collections. Prevents crashes when Competitor and CustomerEvidence collections don't exist in the Weaviate instance.

**Classification error UX:** Moved error rendering outside step-specific blocks so errors are visible on any wizard step. Added automatic step-back to Step 1 when classification fails fatally, allowing the user to retry instead of being stuck on a blank Step 2.

**Reclassify route error handling:** Wrapped `classifyDocument()` call in `POST /api/bulk-upload/reclassify` with try/catch, returning a proper JSON error response instead of an unhandled exception.

**Type label completeness:** Added missing `competitor: "Competitors"` and `customer_evidence: "Customer Evidence"` entries to `PLURAL_TYPE_LABELS` map in `lib/knowledge.ts`.

**Source file provenance:** Added `sourceFile: doc.filename` to `proposedBody` in the bulk upload approve route so document provenance is preserved through the submission pipeline.

**Dev mode session persistence:** Moved the in-memory `sessions` Map and cleanup timer to `globalThis` in `lib/upload-session.ts` so they survive Turbopack module re-evaluation and are shared across route handlers during development.

---

### Group G3/G4/G5 — Bulk Upload Session, Review UI, and Submission Bridge (February 2026)

**G3 — Upload Session Management:** In-memory session store (`lib/upload-session.ts`) with 24-hour TTL cleanup. Sessions track parsed documents, AI classifications, and user edits. Types defined in `lib/upload-session-types.ts`. Three new API routes: `POST /api/bulk-upload/parse` (accepts FormData with multiple files, parses via document parser, creates session), `GET /api/bulk-upload/session/[sessionId]` (retrieves serialized session state), `POST /api/bulk-upload/reclassify` (re-runs AI classification on a single document within a session). Updated existing `POST /api/bulk-upload/classify` to optionally accept `sessionId` and store classification results in the session.

**G4 — Uploader Review UI:** Multi-step bulk upload page at `/bulk-upload`. Step 1: drag-and-drop file upload with file list preview (FileDropZone component). Step 2: real-time classification progress via SSE streaming (ClassificationProgress component). Step 3: review and edit AI classifications with inline editing of type, name, and tags per document (DocumentReviewCard, TagEditor, ConfidenceBadge components). Low-confidence items (below 0.7) highlighted with amber border. Bulk actions: Select All, Approve Selected, Reclassify Selected, Remove Selected. Expandable content preview per document. Navigation card added to home page.

**G5 — Submission Bridge:** `POST /api/bulk-upload/approve` route creates one Submission per approved document via the existing `createSubmission()` function. Builds `proposedContent` JSON (name, content, tags, ICP-specific fields) matching the format expected by the review queue. Supports user overrides applied on top of AI classifications. Handles partial failures — continues processing remaining documents when individual submissions fail. Approved documents enter the existing admin review queue at `/queue`.

**Tests:** 50 new tests across 6 test files: session store unit tests (21), session types unit tests (8), parse route tests (5), reclassify route tests (6), approve route tests (8), session retrieval route tests (2). All 107 project tests pass.

---

### Group G1/G2 — Document Parser and AI Classification (February 2026)

**G1 — Document Parser (`lib/document-parser.ts`):** Server-side file parser supporting four formats: Markdown (.md), PDF (.pdf), DOCX (.docx), and plain text (.txt). PDF extraction via `pdf-parse`; DOCX extraction via `mammoth` (both added as new dependencies). Returns `ParsedDocument` with extracted text, filename, original format, word count, and per-document parse errors. Enforces configurable limits: 10 MB per file, 100 MB per batch, 50 files per batch. MIME type validation with extension fallback. Types defined in `lib/document-parser-types.ts`.

**G2 — AI Classification API (`app/api/bulk-upload/classify/route.ts`):** SSE-streaming endpoint that classifies parsed documents into knowledge object types using Claude (`claude-sonnet-4-20250514`). For each document, builds a classification prompt including the full knowledge type taxonomy and an inventory of all existing non-deprecated objects. Claude returns a JSON classification with `objectType`, `objectName`, `tags`, `suggestedRelationships`, and `confidence` (0.0–1.0). Relationships are resolved to real Weaviate object IDs by name+type matching. Items below 0.7 confidence are flagged with `needsReview: true`. Classification logic in `lib/classifier.ts`; types in `lib/classification-types.ts`. Progress, result, error, and done events streamed via SSE for real-time UI updates.

**Test infrastructure:** Vitest added as dev dependency with `vitest.config.ts`. Test scripts: `npm test` (single run), `npm run test:watch` (watch mode). 57 tests across 3 test files: document parser unit tests (23), classifier unit tests (23), API route integration tests (11).

---

### New Object Types — Competitor and CustomerEvidence (February 2026)

**Migration script:** `scripts/add-competitor-customerevidence-collections.ts` creates the two new Weaviate collections (`Competitor` and `CustomerEvidence`) with their full property schemas. Run this script against an existing Weaviate instance before using the new types.

**Type system:** `lib/knowledge-types.ts` adds `"competitor"` and `"customer_evidence"` to the `KnowledgeType` union. Adds `CUSTOMER_EVIDENCE_SUB_TYPES = ["proof_point", "reference"]`. Adds optional fields `website?`, `customerName?`, and `industry?` to `KnowledgeDetail`, `KnowledgeCreateInput`, and `KnowledgeUpdateInput`.

**CRUD layer:** `lib/knowledge.ts` — both new types are fully wired into all list, get, create, update, delete, deprecate, and restore operations. Collection name maps and type routing updated.

**Health dashboard:** `lib/dashboard.ts` — `Competitor` and `CustomerEvidence` collections added to parallel data fetches. New `customerEvidenceNoSubType` gap check flags CustomerEvidence objects that are missing a required `subType`. New stat cards and gap section added to `app/dashboard/`.

**Form:** `app/knowledge/components/knowledge-form.tsx` — type-specific field blocks added for both types. Competitor shows the optional `website` field. CustomerEvidence shows the required `subType` select (proof_point / reference) plus optional `customerName` and `industry` text fields.

**Type badge:** Both types added to the `TypeBadge` component with appropriate labels and colors.

---

### Roadmap Scoping — Groups J, K, L (February 2026)

**Group J — Inbound MCP Server for 3rd Party Write Access:** Fully scoped in ROADMAP.md. Five steps (J1–J5): standalone MCP server process with Streamable HTTP transport, read-only discovery tools (list types, search, get object), write tools that create Submissions (never write to Weaviate directly), Submission metadata extension (`sourceChannel`, `sourceAppId`, `sourceDescription`), and API key authentication. Includes example use cases (n8n workflows, Slack bots, CRM sync scripts, AI agents). Risk/gap analysis covers separate hosting requirement, rate limiting, duplicate detection, queue overwhelm, and MCP spec evolution.

**Group K — External REST API for 3rd Party Read Access:** Fully scoped in ROADMAP.md. Eight steps (K1–K8): API key auth middleware, list knowledge objects endpoint with pagination, object detail endpoint, semantic search endpoint via `nearText`, types and counts endpoint, conditional skills endpoints, unauthenticated health endpoint, and OpenAPI spec (stretch). Architecture decision: REST gateway over `/api/v1/` reusing `lib/knowledge.ts`, not direct Weaviate access or GraphQL. Risk/gap analysis covers single-key model, Vercel timeouts, schema breaking changes, and stale consumer data.

**Group L — MCP Server for LLM Read Access (RAG Interface):** Fully scoped in ROADMAP.md. Fifteen steps (L1–L15): standalone MCP server with dual transport (stdio for Claude Desktop/Code/Cursor, SSE for Gemini and remote access), persistent Weaviate connection, seven MCP tools (`list_collections`, `list_objects`, `get_object`, `search_objects`, `get_relationships`, `get_dashboard_health`, `get_collection_schema`), three MCP resources (overview, relationship map, collection summaries), semantic search design, cross-LLM compatibility strategy, and Claude Desktop configuration. Phase 2 write access vision documented. Risk/gap analysis covers context window overflow, data exposure, duplicated logic, and connection stability.

**Cross-cutting notes:** J + L consolidation opportunity (single MCP server with tool namespaces), K + L data overlap (shared `lib/knowledge.ts` implementation), unified API key strategy, and RBAC-free design.

**Documentation updates:** ROADMAP.md (Groups J, K, L with full scope, risks, and open questions; cross-cutting notes; infrastructure backlog updates), PRD.md (user stories MCP-1–6, API-1–5, RAG-1–6), API.md (planned external API routes, MCP tool references), KNOWLEDGE_BASE.md (Submission schema extensions), TECH_DECISIONS.md (ADR-006 MCP architecture, ADR-007 external API gateway), BUSINESS_LOGIC.md (external access patterns), SCOPE.md (updated development status), start.mdc (updated module status table).

---

### Roadmap Scoping — Groups G, H, I (February 2026)

**Group G — Bulk Upload with AI Classification:** Fully scoped in ROADMAP.md. Five steps (G1–G5): document parser supporting PDF/DOCX/Markdown/TXT, AI classification API using Claude, upload session management, uploader review UI with bulk actions, and submission bridge to the existing review queue. Risk/gap analysis covers parsing accuracy, classification errors, rate limiting, duplicate detection, session persistence, and cost management.

**Group H — Enhanced Change Review Workflows:** Fully scoped in ROADMAP.md. Five steps (H1–H5) covering two workflows: (a) upload a document to add content to an existing knowledge object via AI merge with a new `document_add` submission type, and (b) visual diff component upgrade replacing the static side-by-side comparison with word-level diff highlighting in unified and side-by-side modes. Risk/gap analysis covers large diffs, concurrent edits, accessibility, and version history dependency.

**Group I — Skills Module:** Fully scoped in ROADMAP.md. Six steps (I1–I6): new `Skill` Weaviate collection, CRUD API, library UI, context assembly integration, migration script for existing instruction templates, and a future skill testing interface. Includes separation criteria table (Skills = active procedural instructions vs. Business Rules = passive constraints). Risk/gap analysis covers skill conflicts, context window bloat, testing, versioning, migration, and composability.

**Documentation updates:** PRD.md (user stories BU-1–5, CR-1–4, SK-1–6), KNOWLEDGE_BASE.md (Skill collection schema, `document_add` submission type, `usedSkills` cross-reference), API.md (bulk upload routes, document upload route, skills CRUD routes), BUSINESS_LOGIC.md (Skills vs Business Rules distinction, updated context assembly template with skills section), SCOPE.md (updated development status), start.mdc (regenerated).

---

### Group F — AI Merge Workflow (February 2026)

**F1 — Merge API:** `POST /api/submissions/[id]/merge` streams an AI-merged version of a knowledge object. Fetches the current live version and the proposed update from the submission, sends both to Claude with a merge system prompt, and returns the merged text as a streaming response. `lib/merge.ts` provides `buildMergePrompt()` for constructing the system prompt and user message.

**F1 — Merge save API:** `POST /api/submissions/[id]/merge/save` accepts the reviewer-edited merged content, updates the target knowledge object in Weaviate, and marks the submission as accepted.

**F2 — Tracked-changes diff:** New `MergeEditor` client component (`app/queue/components/merge-editor.tsx`) computes character-level diffs between the current version and the AI-merged result using `diff-match-patch`. Added text shown in green, removed text in red with strikethrough. Two-panel layout: read-only tracked-changes view on the left, editable textarea on the right. Diff recalculates live as the reviewer edits.

**F3 — Merge review UI:** "Merge with AI" button enabled on the queue review page for update submissions. Clicking it enters merge mode: hides the normal side-by-side diff view and renders the `MergeEditor` full-width. Streams the AI merge result, then lets the reviewer edit and save (commits to Weaviate + closes queue item) or discard (returns to normal review view).

**Infrastructure:** `diff-match-patch` and `@types/diff-match-patch` npm packages added.

---

### Relationship Panel — Always Show Add Button (February 2026)

**Bug fix / enhancement:** Previously, UseCase and BusinessRule detail pages displayed "No relationships available for this type" with no way to add relationships, because those types have no outbound cross-reference configs. Now the "+ Add" button is always visible when any relationship configs exist (forward or reverse), and users can manage relationships from any object type.

**Reverse relationship support:** Added `reverse?: boolean` field to `RelationshipConfig` in `lib/knowledge-types.ts`. New `getReverseRelationships(type)` function in `lib/knowledge.ts` finds types that link TO a given type (e.g. Persona → UseCase), enabling types without outbound configs to discover their inbound relationship options.

**Inbound reference resolution:** New `getInboundReferences(objectId, objectType)` function in `lib/knowledge.ts` queries other collections to find objects that reference a given object. The detail page (`app/knowledge/[id]/page.tsx`) merges inbound refs into `crossReferences` so they display alongside outbound refs.

**UI changes:** `ManageRelationships` component (`app/knowledge/components/manage-relationships.tsx`) accepts a new `reverseRelationships` prop, removed the early return that hid the panel for types with no outbound configs, and handles reverse adds/removes by calling the relationship API on the candidate's ID instead of the current object's ID.

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
