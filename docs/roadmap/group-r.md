> Back to [Roadmap Index](./README.md)

# Group R — Content Narratives

> Scope: A Content Narrative is a strategic document assembled from multiple pieces of core knowledge, organized around a specific theme. It combines relevant product information, personas, use cases, account segments, competitive positioning, and messaging with a defined angle, audience, and intent. It serves as the precursor to all downstream content production — from a single Content Narrative, AI agents can generate campaign briefs, battle cards, competitive briefs, blog posts, thought leadership, sales enablement materials, press releases, email sequences, landing pages, and any other derivative content aligned to that theme. The Content Narrative ensures that every piece of output, regardless of format, channel, or audience, is grounded in the same strategic foundation and produces consistent, on-theme messaging.
> Dependencies: Groups A–F (knowledge CRUD, submission/review queue, AI merge), Group I (Skills Module — context assembly, Content Narrative Generator skill), [Group K](./group-k.md) (External REST API — extended with narrative endpoints), [Group J](./group-j.md) (MCP Server — extended with narrative tools).

## Why This Matters

Without the Content Narrative, the content generation flow is:

```
Core Knowledge Objects → Skill + Prompt → Generated Content
```

This works for standalone, one-off content. But it has three limitations:

1. **No strategic framing.** The AI pulls semantically relevant knowledge but has no understanding of the angle, intent, or narrative arc the creator wants. Two people generating a blog on the same topic will get different strategic direction.

2. **No reusability across deliverables.** A campaign manager who researches a theme and generates a blog cannot easily reuse that same strategic framing to generate a battle card, email sequence, and landing page. They would re-prompt each time, introducing drift.

3. **No governance over strategic direction.** The core knowledge is governed, but the strategic interpretation of that knowledge is not. A Content Narrative introduces a HITL checkpoint between "what we know" and "what we produce."

With the Content Narrative, the flow becomes:

```
Core Knowledge Objects → Content Narrative (reviewed/approved) → Skill + Prompt → Generated Content
```

The Content Narrative is the strategic layer between raw knowledge and finished deliverables.

## Position in the Content Engine

```
Knowledge Base (Persona, Segment, UseCase, Competitor, CustomerEvidence, BusinessRule, ICP)
       │
       ▼
Content Narrative (aggregates knowledge + adds strategic direction)
       │
       ▼
Content Generation (Skills + Business Rules + Content Narrative as context)
       │
       ▼
Generated Content (blogs, battle cards, emails, landing pages, etc.)
```

## Relationship to Existing Modules

| Module | Relationship |
|---|---|
| Knowledge Base | Content Narrative references knowledge objects as its source material. It does not duplicate their content; it links to them and adds strategic framing. |
| Skills | Skills define HOW to produce a specific content type. The Content Narrative defines WHAT to say and WHY. During generation, both are included in the system prompt. |
| Business Rules | Business Rules (tone, constraints) still apply to all content generated from a Content Narrative. They are injected after the Content Narrative in the system prompt. |
| Review Queue | Content Narratives go through a review/approval workflow before they can be used for content generation. This reuses the existing Submission infrastructure. |
| Context Assembly | `lib/context-assembly.ts` is extended to accept a Content Narrative ID, injecting the narrative as the primary strategic context above Skills and Business Rules. |

## Weaviate Collection Schema: `ContentNarrative`

| Property | Type | Description |
|---|---|---|
| `name` | text | Narrative title (e.g. "Competitive Displacement: ZoomInfo to HG Insights"); vectorized |
| `description` | text | Short summary of the narrative's purpose and scope; vectorized |
| `theme` | text | The central theme or topic (e.g. "Technographic Intelligence for Enterprise GTM") |
| `angle` | text | The specific strategic angle or point of view |
| `targetAudience` | text | Who this narrative is designed to reach (may reference personas but is free-text for flexibility) |
| `intent` | text | What the narrative is meant to achieve (e.g. "Position HG as the data-quality leader against ZoomInfo") |
| `content` | text | Full narrative body in markdown; vectorized (primary). This is the assembled strategic document that AI agents consume. |
| `researchNotes` | text | Optional field for external research, competitive intel, or market context that informed the narrative |
| `status` | text | Workflow status: `"draft"`, `"in_review"`, `"approved"`, `"archived"` |
| `version` | text | Semantic version string (e.g. "1.0.0") |
| `previousVersionId` | text | UUID of the prior version (for rollback) |
| `createdBy` | text | Who created the narrative |
| `approvedBy` | text | Who approved the narrative (set on approval) |
| `approvedAt` | date | When the narrative was approved |
| `tags` | text[] | Categorization labels |
| `deprecated` | boolean | Soft-delete flag; deprecated narratives are excluded from generation |
| `createdAt` | date | Record creation timestamp |
| `updatedAt` | date | Last modification timestamp |

**Cross-References:**

| Reference | Target | Description |
|---|---|---|
| `hasPersonas` | `Persona[]` | Personas this narrative targets |
| `hasSegments` | `Segment[]` | Account segments this narrative targets |
| `hasUseCases` | `UseCase[]` | Use cases this narrative addresses |
| `hasCompetitors` | `Competitor[]` | Competitors this narrative positions against |
| `hasCustomerEvidence` | `CustomerEvidence[]` | Proof points and references included in the narrative |

These cross-references serve two purposes: (1) they make the narrative's knowledge dependencies explicit and auditable, and (2) they allow the system to detect when a referenced knowledge object changes, triggering a freshness check on the narrative.

## Workflow and Lifecycle

**Status Flow:**

```
draft → in_review → approved → archived
  ▲         │            │
  │         │            ▼
  └─────────┘       (deprecated)
      (rejected,
       sent back
       for revision)
```

**Step-by-Step Process:**

1. **Create** — Team member creates a Content Narrative via manual entry, AI-assisted generation, or cloning an existing narrative.
2. **Draft and Iterate** — Creator refines the narrative: edits content, adds/removes linked knowledge objects, includes research notes, optionally requests AI assistance.
3. **Submit for Review** — Creates a Submission with `submissionType: "narrative_review"`. Narrative status changes from `"draft"` to `"in_review"`.
4. **Review and Approve** — Reviewer evaluates strategic alignment, messaging accuracy, completeness, and linked knowledge objects. Can approve, reject (with comments, sending back to draft), or defer.
5. **Approved** — Narrative becomes available for content generation. `approvedBy` and `approvedAt` fields are set. Only approved narratives can be used as context in the generation flow.
6. **Use in Content Generation** — Content creators select an approved narrative when generating content. The narrative is injected into the system prompt as the primary strategic context.
7. **Version and Update** — Editing an approved narrative creates a new draft version, preserving the previous approved version via `previousVersionId`. The new version must go through review before replacing the prior one.
8. **Archive** — Narratives that are no longer relevant are archived. Archived narratives are excluded from the generation picker but remain accessible for reference.

## Creation Modes

**Mode 1: Manual Creation** — Creator fills in all fields directly: name, theme, angle, target audience, intent, writes narrative content in markdown editor, manually selects and links knowledge objects, adds optional research notes.

**Mode 2: AI-Assisted Creation** — Creator provides a high-level prompt describing the theme and intent. The system performs semantic search across all knowledge collections, sends retrieved objects plus the creator's prompt to Claude with a Content Narrative Generator skill, and generates a draft narrative. The creator reviews, edits, and refines before submitting for review.

**Mode 3: Clone and Modify** — Creator clones an existing approved or archived narrative and modifies it for a new angle, audience, or campaign. Useful when the same core theme applies but with a different strategic direction.

## Phase 1 — Schema, CRUD, and Core API

**R1 — ContentNarrative Weaviate Collection Schema**
Create a new `ContentNarrative` Weaviate collection via `scripts/create-content-narrative-collection.ts`. Properties as defined in the schema table above. Cross-references to `Persona[]`, `Segment[]`, `UseCase[]`, `Competitor[]`, `CustomerEvidence[]`. Vectorized fields: `name`, `description`, `content`. Idempotent migration script — safe to re-run.

Sub-agent directive: execute schema creation as a standalone task.

**R2 — Narrative Types and CRUD Operations**
Create `lib/narrative-types.ts` with `NarrativeStatus` enum (`"draft" | "in_review" | "approved" | "archived"`), `NarrativeListItem`, `NarrativeDetail`, `NarrativeCreateInput`, `NarrativeUpdateInput` types, and utility functions (`getStatusLabel()`, `VALID_STATUSES`). Create `lib/narratives.ts` with CRUD operations: `listNarratives` (with status, theme, tags, createdBy filters), `getNarrative` (with resolved cross-references), `createNarrative` (status: draft, version: 1.0.0), `updateNarrative` (drafts only; editing an approved narrative creates a new version), `deleteNarrative` (drafts only), `submitForReview`, `approveNarrative`, `rejectNarrative`, `archiveNarrative`, `deprecateNarrative`, `restoreNarrative`, `versionNarrative` (creates new draft from approved, sets `previousVersionId`). Follows `lib/skills.ts` and `lib/knowledge.ts` patterns: `withWeaviate`, name uniqueness enforcement, cross-reference resolution.

Sub-agent directive: execute types and CRUD as a single task.

**R3 — Narrative API Routes**
Core CRUD: `GET /api/narratives` (list with filters: status, theme, tags, createdBy), `POST /api/narratives` (create, status: draft), `GET /api/narratives/[id]` (detail with resolved cross-references), `PUT /api/narratives/[id]` (update a draft narrative), `DELETE /api/narratives/[id]` (delete a draft narrative). Workflow actions: `POST /api/narratives/[id]/submit` (draft → in_review, creates Submission), `POST /api/narratives/[id]/approve` (in_review → approved), `POST /api/narratives/[id]/reject` (in_review → draft, with comments), `POST /api/narratives/[id]/archive` (approved → archived). Deprecate/restore: `PATCH /api/narratives/[id]`. Implementation mirrors `app/api/skills/` route patterns.

Sub-agent directive: execute all routes as a single task.

**R4 — Phase 1 Testing and Validation**
Unit tests for `lib/narratives.ts`: CRUD operations, status transitions (draft → in_review → approved → archived, reject back to draft), version management (`previousVersionId` chain), cross-reference handling, name uniqueness enforcement, delete-only-drafts constraint. Unit tests for `lib/narrative-types.ts`: utility functions. Integration tests for all `/api/narratives/` routes: correct status codes, error cases (update non-draft, delete non-draft, approve non-in_review), workflow transition sequences. Verify: `npm run build` passes, `npm test` passes.

Sub-agent directive: execute tests, verify build, fix any failures.

## Phase 2 — UI Pages

**R5 — Narratives List Page**
Build `app/narratives/page.tsx` with filter tabs (All / Draft / In Review / Approved / Archived), theme filter, tag filter, and search. Build `app/narratives/components/narrative-list.tsx` — list component displaying status badges, theme, target audience, tags, and quick actions (edit, submit, archive). Add "Content Narratives" navigation card to `app/page.tsx` home page.

Sub-agent directive: execute list page and component.

**R6 — Narrative Detail Page**
Build `app/narratives/[id]/page.tsx` — full narrative content rendered as markdown, metadata sidebar (theme, angle, audience, intent, status, version, creator, approver, timestamps), linked knowledge objects (clickable links to `/knowledge/[id]`), staleness indicators (Phase 6 placeholder), and version history (link to previous version if `previousVersionId` exists). Build `app/narratives/components/narrative-detail-actions.tsx` — context-dependent action buttons: Edit (draft only), Submit for Review (draft), Approve/Reject (in_review), Archive (approved), Deprecate/Restore, Clone.

Sub-agent directive: execute detail page and actions component.

**R7 — Create and Edit Forms**
Build `app/narratives/components/narrative-form.tsx` — shared form component with fields for name, theme, angle, target audience, intent, content (markdown editor with preview), research notes, tags (pill-style TagEditor), and a knowledge object selector panel (search/select for personas, segments, use cases, competitors, customer evidence with type-grouped sections). Build `app/narratives/new/page.tsx` — creation form with Manual mode (all fields + knowledge object selector). Build `app/narratives/[id]/edit/page.tsx` — edit form with version bump selector (patch/minor/major). Clone mode: accessible from detail page action bar, pre-populates the create form from an existing narrative with a new name prompt.

Sub-agent directive: execute form component and both pages.

**R8 — Phase 2 Testing and Validation**
Browser-based smoke testing: navigate all narrative pages (`/narratives`, `/narratives/new`, `/narratives/[id]`, `/narratives/[id]/edit`), verify rendering, form submission, status transitions via UI, knowledge object linking, markdown rendering, responsive layout. Verify navigation card on home page. Verify filter tabs and search work correctly.

Sub-agent directive: execute browser tests, verify UX, fix any issues.

## Phase 3 — AI-Assisted Creation

**R9 — Content Narrative Generator Skill (Seed)**
Create a seed skill object in Weaviate: name `"Content Narrative Generator"`, contentType `["content_narrative"]`, category `"content_generation"`, active `true`. Skill instruction content directs Claude to: (1) review all provided knowledge objects, (2) identify strategic connections based on the creator's theme prompt, (3) synthesize a narrative document including a clear statement of the theme, strategic angle, target audience, intent, narrative body weaving together relevant knowledge, key messages, competitive positioning (if competitors included), supporting evidence (if customer evidence included), (4) use confident, strategic, data-grounded language, (5) write for an AI agent audience — the narrative should be clear enough that any downstream skill can interpret and execute against it. Script at `scripts/seed-narrative-generator-skill.ts` or manual creation via Skills UI.

Sub-agent directive: execute skill creation.

**R10 — AI-Assisted Narrative Generation API**
Build `POST /api/narratives/generate` — SSE streaming route. Flow: accept `{ themePrompt: string, pinnedObjectIds?: string[] }` → perform semantic search across all knowledge collections (Persona, Segment, UseCase, Competitor, CustomerEvidence) to find relevant objects → combine with any pinned objects → send to Claude with the Content Narrative Generator skill as system prompt → stream the draft narrative. Response includes structured JSON with generated fields (`name`, `theme`, `angle`, `targetAudience`, `intent`, `content`, `researchNotes`) and suggested knowledge object links (with Weaviate IDs resolved from the semantic search results).

Sub-agent directive: execute generation API route.

**R11 — AI-Assisted Creation UI Mode**
Add an AI-assisted tab/mode to the narrative create form (`app/narratives/new/page.tsx`). Two-step UX: (1) theme prompt input with optional knowledge object pinning → "Generate Draft" button, (2) streaming progress indicator → populated form fields (name, theme, angle, audience, intent, content, research notes) that the creator can review and edit → suggested knowledge object links auto-populated from the generation response → creator saves as a draft.

Sub-agent directive: execute UI integration.

**R12 — Phase 3 Testing and Validation**
Test AI-assisted generation end-to-end: theme prompt → streaming response → form population with all fields. Verify skill is correctly retrieved and used in the generation prompt. Test semantic search retrieval quality with representative prompts (e.g. "competitive displacement: ZoomInfo to HG Insights", "enterprise GTM data quality"). Verify streaming UX: progress indicator displays during generation, form populates correctly after stream completes. Test pinned object flow.

Sub-agent directive: execute tests, verify generation quality.

## Phase 4 — Review Workflow Integration

**R13 — Submission Pipeline Extension**
Add `"narrative_review"` to the `SubmissionType` union in `lib/submission-types.ts`. Add to `VALID_SUBMISSION_TYPES` array. Add `getSubmissionTypeLabel()` entry. Extend `createSubmission()` in `lib/submissions.ts` to accept `objectType` that can represent a narrative. Extend `reviewSubmission()`: on accept of a `"narrative_review"` submission, call `approveNarrative()` from `lib/narratives.ts` which sets `approvedBy`, `approvedAt`, and status → `approved`. On reject, call `rejectNarrative()` which sets status → `draft` and attaches the review comment. The `submitForReview()` function in `lib/narratives.ts` creates a Submission with `submissionType: "narrative_review"` and changes the narrative status from `"draft"` to `"in_review"`.

Sub-agent directive: execute pipeline extension.

**R14 — Review Queue UI Updates**
Narrative submissions appear in the review queue at `/queue` with a "Narrative Review" type badge (distinct color from existing badges). Add `"narrative_review"` to the submission type filter tabs. Queue detail page for narrative submissions shows: full narrative content preview (rendered markdown), metadata summary (theme, angle, audience, intent), linked knowledge objects list (with type badges and links to detail pages). Reviewers use the standard Accept/Reject/Defer actions.

Sub-agent directive: execute queue UI updates.

**R15 — Phase 4 Testing and Validation**
Test full workflow: create draft narrative → submit for review → submission appears in queue with correct type badge → accept (verify narrative status → approved, `approvedBy`/`approvedAt` set) or reject (verify narrative status → draft, comment attached). Test reject-and-revise flow: reject → edit draft → re-submit → appears in queue again. Verify queue filters include `"narrative_review"` and filtering works correctly. Verify queue detail renders narrative content and metadata.

Sub-agent directive: execute workflow tests.

## Phase 5 — Context Assembly Integration

**R16 — Context Assembly Extension**
Extend `ContextAssemblyInput` in `lib/context-assembly.ts` with optional `narrativeId?: string`. When a narrative ID is provided, fetch the approved narrative via `getNarrative()` and inject its content as the primary strategic context section, placed above Active Skills and below the system prompt opener. Updated prompt template:

```
You are a B2B content writer creating [CONTENT_TYPE] for [COMPANY_NAME].

## Content Narrative: [Narrative Name]
[Full narrative content]

## Active Skills
### Skill: [Skill Name] (v[version])
[Skill instruction content]

## Target Persona
[Persona content]

## Target Account Segment
[Segment content]

## Use Case / Topic
[Use case content]

## Business Rules (Constraints)
[Business rule content]

Follow the Content Narrative for strategic direction, messaging, and angle.
Follow the Active Skills for structure and formatting.
Respect all Business Rules for tone and constraints.
Use the Persona, Segment, and Use Case context to inform your content.
```

Extend `AssembledContext` return type with `narrative: { id: string; name: string; version: string } | null`. Only approved, non-deprecated narratives can be used — return an error or skip if the narrative is in any other status. Generation without a narrative remains fully supported (backward compatible).

Sub-agent directive: execute context assembly changes.

**R17 — Phase 5 Testing and Validation**
Unit tests for `assembleContext()` with and without `narrativeId`. Verify prompt ordering: narrative section appears above Active Skills, above Business Rules. Verify only approved narratives are accepted (draft → error, archived → error, deprecated → error). Verify generation without narrative still works identically to current behavior. Verify the `AssembledContext` return includes narrative metadata when provided.

Sub-agent directive: execute tests.

## Phase 6 — Staleness Detection and Health Dashboard

**R18 — Staleness Detection Logic**
Build `checkNarrativeStaleness(objectId: string)` in `lib/narratives.ts`. When a knowledge object is updated (via review accept or direct edit), query all approved `ContentNarrative` objects that cross-reference that object via `hasPersonas`, `hasSegments`, `hasUseCases`, `hasCompetitors`, or `hasCustomerEvidence`. For each matched narrative, compare the object's `updatedAt` against the narrative's `approvedAt` — if the object was updated after the narrative was approved, flag the narrative as stale. Staleness metadata includes which linked objects changed and when. Staleness is a computed UI indicator, not a status change — the narrative remains `"approved"`. Trigger points: knowledge object update via UI (`PUT /api/knowledge/[id]`), submission acceptance in `reviewSubmission()`, and the daily health check in `getDashboardData()`.

Sub-agent directive: execute staleness detection.

**R19 — Health Dashboard Narrative Metrics**
Extend `getDashboardData()` in `lib/dashboard.ts` with narrative metrics: total narrative count, count by status (draft, in_review, approved, archived), stale narrative count (approved narratives with at least one linked knowledge object updated after `approvedAt`). Add narrative stat cards to `/dashboard` using the existing `StatCard` component. Add a "Stale Narratives" section to the staleness report listing each stale narrative with its name, which linked objects changed, and a "Fix" link to the narrative detail page.

Sub-agent directive: execute dashboard extension.

**R20 — Phase 6 Testing and Validation**
Test staleness detection: create an approved narrative linked to a knowledge object, update the knowledge object, verify the narrative is flagged as stale with correct metadata. Test dashboard metrics: verify counts match actual data across all statuses. Verify staleness indicator appears on the narrative detail page (R6). Verify dashboard renders narrative stat cards and stale narrative list.

Sub-agent directive: execute tests.

## Phase 7 — External API and MCP Extensions

**R21 — External REST API Endpoints**
Build `GET /api/v1/narratives` — list approved, non-deprecated narratives with pagination (`limit`, `offset`), tag filtering, and theme filtering. Requires `X-API-Key` auth via `withApiAuth()` middleware. Response follows the `{ "data": ..., "meta": ... }` shape. Build `GET /api/v1/narratives/[id]` — full detail for an approved narrative including resolved cross-references. Returns 404 for non-approved narratives. Read-only — follows existing `/api/v1/` route patterns from [Group K](./group-k.md).

Sub-agent directive: execute API endpoints.

**R22 — MCP Server Narrative Tools**
Add three MCP tools to `mcp-server/src/tools/`: `list_narratives` (list approved narratives; `mcp-read` permission), `get_narrative` (full narrative detail by ID; `mcp-read` permission), `create_narrative_draft` (create a draft narrative via submission, entering the review queue; `mcp-write` permission). Update `mcp-server/src/schema.ts` with `ContentNarrative` collection metadata. Update tool registration in `mcp-server/src/index.ts`. Response formatting follows the existing `formatters.ts` patterns.

Sub-agent directive: execute MCP tools.

**R23 — Phase 7 Testing and Validation**
Integration tests for `/api/v1/narratives` endpoints: auth required (401 without key), pagination works, tag/theme filtering works, only approved narratives returned (verify draft/archived/deprecated are excluded), 404 for non-approved narrative detail. Vitest tests for new MCP tools: tool registration (count includes new tools), permission checks (`mcp-read` for reads, `mcp-write` for create), response formatting. Verify MCP server TypeScript build passes.

Sub-agent directive: execute tests.

## Phase 8 — Documentation

**R24 — Documentation Updates**
Update all project documentation to reflect the Content Narrative module:

- `docs/KNOWLEDGE_BASE.md` — Add `ContentNarrative` collection schema, cross-references, and vectorization notes
- `docs/BUSINESS_LOGIC.md` — Add narrative lifecycle description, updated context assembly template showing narrative layer above skills and business rules
- `docs/API.md` — Add all `/api/narratives/` route contracts (CRUD + workflow) and `/api/v1/narratives/` external API routes
- `docs/EXTERNAL_API.md` — Add narrative endpoints section for external consumers
- `docs/PRD.md` — Add user stories CN-1 through CN-12 covering: narrative creation (manual, AI-assisted, clone), review workflow, content generation with narrative context, staleness detection, external API access, MCP access
- `docs/SCOPE.md` — Update module status table with Content Narratives status
- `docs/CHANGELOG.md` — Add roadmap scoping entry for Group R
- `docs/user-guides/content-narratives.md` — End-user guide covering: what narratives are, how to create them, AI-assisted creation, submitting for review, using narratives in content generation, managing versions, staleness indicators
- `.cursor/rules/start.mdc` — Regenerate via sync-start rule to include narrative routes, pages, and lib files

Sub-agent directive: execute all doc updates as a single task.

## Interoperability

| System | Integration |
|---|---|
| Content Generation UI | Generation form includes a "Select Content Narrative" picker showing approved narratives. When selected, the narrative is injected as primary context. Generation without a narrative remains supported. |
| Review Queue | Narrative submissions appear in the existing queue at `/queue` with a `"narrative_review"` type badge. Reviewers use the same accept/reject/defer actions. |
| Health Dashboard | Dashboard includes narrative-specific metrics: total narratives, narratives in review, approved narratives, stale narratives (approved but linked knowledge objects have changed since approval). |
| Skills Module | The Content Narrative Generator is a standard skill. Other skills operate independently; the narrative provides strategic context while skills provide structural instructions. |
| External REST API ([Group K](./group-k.md)) | New endpoints: `GET /api/v1/narratives` (list approved), `GET /api/v1/narratives/:id` (detail). Read-only. |
| MCP Server ([Group J](./group-j.md)) | New tools: `list_narratives`, `get_narrative`, `create_narrative_draft`. Allows AI agents and automation to discover and use narratives. |
| Bulk Upload | Not applicable. Content Narratives are strategic documents created through the creation workflow. |

## Freshness and Staleness Detection

A Content Narrative's validity depends on the freshness of its linked knowledge objects. If a persona, use case, or competitive intelligence document changes after a narrative was approved, the narrative may be stale.

**Detection Logic:** When a knowledge object is updated, the system checks all approved Content Narratives that cross-reference that object. If found, the narrative is flagged as stale in the UI (visual indicator, not a status change). The stale flag includes which linked objects changed and when. No automatic action is taken; the narrative owner decides whether to revise.

**Staleness Check Triggers:** Knowledge object updated via UI, knowledge object updated via submission acceptance, scheduled daily health check.

## Risks and Gaps

| Risk | Impact | Mitigation |
|---|---|---|
| Context window bloat | A narrative + skills + business rules could exceed context limits for large narratives | Set a recommended max length for narrative content (e.g. 3,000 words). Context assembly truncates or summarizes if combined context exceeds threshold. |
| Narrative sprawl | Too many approved narratives makes selection overwhelming | Archive workflow removes stale narratives from the active picker. Tags and search help discoverability. Dashboard shows usage counts to surface underused narratives. |
| Staleness goes unnoticed | Approved narratives based on outdated knowledge produce bad content | Staleness detection flags narratives when linked objects change. Health dashboard surfaces stale narrative count. |
| Over-reliance on AI-assisted creation | Creators accept AI drafts without sufficient refinement | The HITL review step catches low-quality narratives. The AI-assisted mode produces a draft, not an approved narrative. |
| Version confusion | Multiple versions of a narrative create ambiguity | Only one version can be "approved" at a time. Previous versions are accessible for reference but not for generation. |
| No rollback if narrative produces bad content | An approved narrative generates poor output across many deliverables | Version history with `previousVersionId` allows rollback to a prior approved version. Generated content tracks which narrative version was used. |

**Open Questions:**

| Question | Context |
|---|---|
| Should Content Narratives have an expiration date? | Campaigns have end dates. Should narratives auto-archive after a set period, or is manual archival sufficient? |
| Should the generation UI allow combining multiple narratives? | A single piece of content might draw from two themes. However, this adds complexity and risks conflicting direction. Recommendation: single narrative per generation in Phase 1. |
| Should narrative approval require a specific role? | Currently any reviewer can approve. Should narrative approval be restricted to PMM leads or content strategists? |
| How should narrative usage be tracked in GeneratedContent? | Add a `usedNarrative` cross-reference to the `GeneratedContent` collection, similar to `usedSkills`. This enables tracking which content was generated from which narrative. |

## Recommended Build Order

1. **R1 → R2 → R3 → R4** (Phase 1: schema, CRUD, API, testing) — prerequisite for everything
2. **R5 → R6 → R7 → R8** (Phase 2: UI pages, testing) — prerequisite for user interaction
3. **R9 → R10 → R11 → R12** (Phase 3: AI-assisted creation, testing) — prerequisite for primary creation path
4. **R13 → R14 → R15** (Phase 4: review workflow, testing) — prerequisite for approval gate
5. **R16 → R17** (Phase 5: context assembly, testing) — prerequisite for generation integration
6. **R18 → R19 → R20** (Phase 6: staleness and dashboard, testing) — can begin after R8
7. **R21 → R22 → R23** (Phase 7: external API and MCP, testing) — can begin after R4
8. **R24** (Phase 8: documentation) — after all other phases

Phases 1–5 are sequential (each depends on the prior). Phase 6 can begin after Phase 2 (UI exists for staleness indicators). Phase 7 can begin after Phase 1 (CRUD exists for external access). Phase 8 runs last.
