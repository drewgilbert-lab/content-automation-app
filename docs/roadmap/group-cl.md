> Back to [Roadmap Index](./README.md)

# Group CL — Content Library

> Scope: Build the Content Library module — the application layer for storing, browsing, editing, and managing all content produced by or submitted to the Content Engine. This includes the `GeneratedContent` Weaviate collection schema migration, type definitions, CRUD operations, internal API routes, UI pages, and the editorial workflow that moves content from draft through review to publication. The Content Library is the counterpart to the Knowledge Base: the Knowledge Base stores what the company knows; the Content Library stores what the company produces.
> Dependencies: Groups A–F (knowledge CRUD — establishes CRUD patterns, `withWeaviate`, cross-reference resolution), Group I (Skills Module — `assembleContext()`, content type constants, skill cross-references on `GeneratedContent`), [Group K](./group-k.md) Phase 1 (Connected Systems — source provenance patterns), Group W (Authentication — `requireRole()`, `requirePermission()`, user attribution).

## Why This Matters

The Content Engine currently has a complete knowledge management layer (Groups A–H), a skills system (Group I), context assembly logic, and a streaming Claude integration (`/api/chat`). But there is no way to store, retrieve, or manage the content that gets produced. The `GeneratedContent` Weaviate collection exists in the seed script but has no application layer — no types, no CRUD lib, no API routes, no UI pages.

Without the Content Library:

1. **Generated content disappears.** A user generates an email via Claude, reads it in the streaming response, and has no way to save it to the system. There is no "Save" action, no content record, no metadata trail.

2. **No editorial governance for content.** Knowledge objects go through a rigorous review queue. Content has no quality gate — no submit-for-review, no approval, no rejection-with-comments. Anyone can generate and use content with zero oversight.

3. **No content discovery.** Without a browsable library, users regenerate content they've already created because they cannot find prior work. There is no search, no filtering by type or status, no way to see what exists.

4. **External access is blocked.** [Group K](./group-k.md) Phase 3 (K13–K16) defines REST API content endpoints and [Group J](./group-j.md) Phase 7 (J26–J28) defines MCP content tools — but both depend on `lib/content.ts` CRUD functions that do not exist. The Content Library backend unblocks all external content access.

The Content Library transforms the Content Engine from a knowledge-and-generation tool into a full content operations platform where content is created, stored, reviewed, approved, and served to downstream consumers.

## Position in the Content Engine

```
Knowledge Base (Persona, Segment, UseCase, Competitor, CustomerEvidence, BusinessRule, ICP)
       │
       ▼
Context Assembly (lib/context-assembly.ts)
  + Skills (active procedural instructions)
  + Business Rules (passive constraints)
  + Content Narrative (strategic direction — Group R, optional)
       │
       ▼
Content Generation (Claude streaming — Module 2 Generate)
       │
       ▼
Content Library (GeneratedContent collection)  ◄── THIS GROUP
  │ status: draft
  │
  ▼
Editorial Workflow (submit → review → approve → publish)
  │
  ▼
Published Content
  │
  ├──► Web UI (Content Library pages)
  ├──► External REST API (Group K, K13–K16)
  └──► MCP Server (Group J, J26–J28)
```

## Relationship to Existing Modules

| Module | Relationship |
|---|---|
| Knowledge Base | Generated content records which knowledge objects were used as context via cross-references (`usedPersona`, `usedSegment`, `usedUseCases`, `usedBusinessRules`). Knowledge detail pages gain a "Used In" section showing content that references them. |
| Skills | Generated content records which skills were applied via the `usedSkills` cross-reference. Skills define HOW content is structured; the Content Library stores the result. |
| Context Assembly | `assembleContext()` produces the system prompt; the Content Library stores the output along with metadata about which context was assembled. The `prompt` and cross-reference fields on `GeneratedContent` provide full generation traceability. |
| Generate UI (Module 2) | The Generate UI (separate group) is the primary creation path — it calls `assembleContext()`, streams Claude, and saves to the Content Library via `createContent()`. The Content Library does not depend on the Generate UI; content can also be created manually via the "Submit Content" form or externally via MCP/API. |
| Review Queue | Content does NOT use the knowledge Submission review queue. The editorial workflow is self-contained on the `GeneratedContent` object — status transitions happen directly via `/api/content/[id]/submit`, `/review`, and `/publish` routes. This is a deliberate design choice: knowledge objects are shared source-of-truth records requiring a universal review gate; content pieces are individual drafts owned by their creator where the editorial pipeline is the quality gate. |
| External REST API ([Group K](./group-k.md)) | K13–K16 define `/api/v1/content` endpoints that depend on `listContent()`, `getContent()`, `semanticSearchContent()` from `lib/content.ts`. This group builds those functions. |
| MCP Server ([Group J](./group-j.md)) | J26–J28 define `list_content`, `get_content`, `search_content`, `submit_content` MCP tools that depend on `lib/content.ts`. This group builds those functions. |
| Content Narratives ([Group R](./group-r.md)) | When a Content Narrative is used during generation, the Content Library stores a `usedNarrative` cross-reference for traceability. Group R Phase 5 (R16) extends context assembly; this group stores the result. |
| Health Dashboard | Dashboard gains content metrics: total content count, count by status, count by content type. |

## Weaviate Collection Schema: `GeneratedContent`

The `GeneratedContent` collection already exists in the seed script (`scripts/seed.ts`) with 7 properties and 4 cross-references. The documented target schema in `docs/KNOWLEDGE_BASE.md` specifies 12 properties and 5 cross-references. A migration script bridges the gap.

### Current State (seed script)

| Property | Type | Status |
|---|---|---|
| `title` | text | Exists |
| `contentType` | text | Exists |
| `body` | text | Exists |
| `prompt` | text | Exists |
| `status` | text | Exists |
| `createdAt` | date | Exists |
| `updatedAt` | date | Exists |

Current cross-references: `usedPersona` → Persona, `usedSegment` → Segment, `usedUseCases` → UseCase[], `usedBusinessRules` → BusinessRule[].

### Target State (after CL1 migration)

| Property | Type | Description |
|---|---|---|
| `title` | text | Auto-generated or user-provided title; vectorized |
| `contentType` | text | Canonical content type from `CONTENT_TYPES` in `lib/skill-types.ts` |
| `body` | text | The generated or submitted content body; vectorized (primary) |
| `prompt` | text | The user's original generation request (empty for externally submitted content) |
| `status` | text | `"draft"`, `"submitted"`, `"in_review"`, `"approved"`, `"rejected"`, `"published"` |
| `tags` | text[] | Categorization labels |
| `sourceChannel` | text | `"generate_ui"`, `"direct_upload"`, `"mcp"`, `"api"`, `"bulk_import"` |
| `sourceAppId` | text | Identifier for the external application (from API key record) |
| `sourceDescription` | text | Free-text provenance description |
| `reviewComment` | text | Reviewer feedback on rejection or approval notes |
| `reviewedBy` | text | Email of the reviewer who last acted on this content |
| `reviewedAt` | date | When the last review action occurred |
| `createdBy` | text | Email of the user who created this content |
| `updatedBy` | text | Email of the user who last modified this content |
| `createdAt` | date | Creation timestamp |
| `updatedAt` | date | Last modification timestamp |

**Cross-References:**

| Reference | Target | Description |
|---|---|---|
| `usedPersona` | `Persona` | Which persona was used as generation context |
| `usedSegment` | `Segment` | Which segment was used as generation context |
| `usedUseCases` | `UseCase[]` | Which use cases were used as generation context |
| `usedBusinessRules` | `BusinessRule[]` | Which business rules were applied |
| `usedSkills` | `Skill[]` | Which skills were applied during generation (missing from seed, added by CL1) |
| `usedNarrative` | `ContentNarrative` | Which Content Narrative provided strategic direction (added when Group R is built) |

## Workflow and Lifecycle

**Status Flow:**

```
draft → submitted → in_review → approved → published
  ▲                     │
  │                     ▼
  └──────────────── rejected
       (returned to draft
        with reviewer comments)
```

**Workflow Rules:**

- Content cannot move from `draft` directly to `approved` — it must pass through `in_review`
- Rejected content returns to `draft` with reviewer comments attached
- Approved content cannot be edited without resetting to `draft`
- Published content cannot be edited without resetting to `draft`
- Only `draft` content can be deleted
- `submitted` content is read-only to the creator until reviewed

**Status Transition Table:**

| From | To | Action | Who | Requirements |
|---|---|---|---|---|
| `draft` | `submitted` | Submit for review | Creator (contributor+) | Body must be non-empty |
| `submitted` | `in_review` | Begin review | Reviewer (editor+) | — |
| `in_review` | `approved` | Approve | Reviewer (editor+) | — |
| `in_review` | `rejected` | Reject | Reviewer (editor+) | Comment required |
| `rejected` | `draft` | (automatic) | System | Rejection sets status to `draft` and attaches comment |
| `approved` | `published` | Publish | Approver (admin) | — |
| `approved` | `draft` | Edit approved content | Creator (contributor+) | Resets to draft for re-review |
| `published` | `draft` | Edit published content | Creator (contributor+) | Resets to draft for re-review |

**Step-by-Step Process:**

1. **Create** — Content enters the library as `draft` via the Generate UI (Module 2), the "Submit Content" manual form, MCP `submit_content` tool, REST API `POST /api/v1/content`, or bulk import.
2. **Edit and Polish** — Creator edits the body, title, and tags. Multiple edits are allowed while in `draft` status.
3. **Submit for Review** — Creator clicks "Submit for Review". Status transitions from `draft` to `submitted`. Content becomes read-only to the creator.
4. **Review** — Reviewer opens the content detail page, reads the body, checks quality, and either approves or rejects.
5. **Approve or Reject** — Approval transitions to `approved`. Rejection transitions to `draft` with a comment explaining what to fix. The creator sees the comment on the content detail page and can revise and re-submit.
6. **Publish** — An admin or approver marks approved content as `published`, indicating it is live or ready for external distribution.
7. **Revise Published Content** — Editing a published or approved piece resets it to `draft`, requiring a new review cycle before it can be re-published.

## Phase 1 — Schema Migration and Types

**CL1 — GeneratedContent Schema Migration** — ✅ Done (2026-03-24)
Create `scripts/migrate-generated-content-schema.ts`. The script connects to Weaviate Cloud and adds missing properties and cross-references to the existing `GeneratedContent` collection. New properties: `tags` (text[]), `sourceChannel` (text), `sourceAppId` (text), `sourceDescription` (text), `reviewComment` (text), `reviewedBy` (text), `reviewedAt` (date), `createdBy` (text), `updatedBy` (text). New cross-reference: `usedSkills` → `Skill[]`. Idempotent — safe to re-run (checks for existing properties before adding). Does not modify existing properties or data. Logs all changes to stdout. Update `.env.example` if new env vars are needed.

Sub-agent directive: execute schema migration as a standalone task.

**CL2 — Content Type Definitions** — ✅ Done (2026-03-24)
Create `lib/content-types.ts` with:

- `ContentStatus` type: `"draft" | "submitted" | "in_review" | "approved" | "rejected" | "published"`
- `VALID_CONTENT_STATUSES` array
- `ContentSourceChannel` type: `"generate_ui" | "direct_upload" | "mcp" | "api" | "bulk_import"`
- `VALID_SOURCE_CHANNELS` array
- `ContentListItem` interface: `id`, `title`, `contentType`, `status`, `tags`, `sourceChannel`, `createdBy`, `createdAt`, `updatedAt`
- `ContentDetail` interface: extends `ContentListItem` with `body`, `prompt`, `sourceAppId`, `sourceDescription`, `reviewComment`, `reviewedBy`, `reviewedAt`, `updatedBy`, and resolved cross-references (`usedPersona`, `usedSegment`, `usedUseCases`, `usedBusinessRules`, `usedSkills` — each as `{ id: string; name: string }` or `{ id: string; name: string }[]`)
- `ContentCreateInput` interface: `title`, `contentType` (validated against `CONTENT_TYPES` from `lib/skill-types.ts`), `body`, `prompt?`, `tags?`, `sourceChannel?`, `sourceAppId?`, `sourceDescription?`, `createdBy`, knowledge object IDs (`personaId?`, `segmentId?`, `useCaseIds?`, `businessRuleIds?`, `skillIds?`)
- `ContentUpdateInput` interface: `title?`, `body?`, `tags?`, `updatedBy`
- Utility functions: `getContentStatusLabel()`, `getContentSourceChannelLabel()`, `isEditableStatus()` (returns true for `draft` and `rejected`), `VALID_CONTENT_STATUSES`, `VALID_SOURCE_CHANNELS`
- `ContentListParams` interface: `contentType?`, `status?`, `sourceChannel?`, `tags?`, `search?`, `limit?`, `offset?`, `createdBy?`

Follows `lib/skill-types.ts` and `lib/knowledge-types.ts` patterns.

Sub-agent directive: execute type definitions as a standalone task.

**CL3 — Content CRUD Operations** — ✅ Done (2026-03-24)
Create `lib/content.ts` with CRUD operations and workflow transition functions. All functions use `withWeaviate()` from `lib/weaviate.ts`. Follows `lib/skills.ts` and `lib/knowledge.ts` patterns.

**CRUD Operations:**

| Function | Description | Key Behavior |
|---|---|---|
| `listContent(params?)` | List content with optional filters | Filters by `contentType`, `status`, `sourceChannel`, `tags`, `createdBy`. Pagination via `limit` (default 100, max 500) and `offset`. Sorted by `createdAt` descending. |
| `getContent(id)` | Get single content piece with resolved cross-references | Returns `ContentDetail` with resolved `usedPersona`, `usedSegment`, `usedUseCases`, `usedBusinessRules`, `usedSkills` (each resolved to `{ id, name }`). Returns `null` if not found. |
| `createContent(input)` | Create new content piece | Status defaults to `"draft"`. Validates `contentType` against `CONTENT_TYPES`. Sets `createdAt`, `updatedAt`. Creates cross-references for any provided knowledge object IDs. Returns created content ID. |
| `updateContent(id, input)` | Update a draft content piece | Only allowed when status is `draft` or `rejected`. Updates `body`, `title`, `tags`, and `updatedBy`. Sets `updatedAt`. Editing `approved` or `published` content first resets status to `draft` (see `resetToDraft()`). Returns updated content. |
| `deleteContent(id)` | Delete a content piece | Only allowed when status is `draft`. Returns error if content is in any other status. |
| `semanticSearchContent(query, params?)` | Semantic search across content body | Uses Weaviate `nearText` on the `GeneratedContent` collection. Optional filters: `contentType`, `status`. Returns `{ id, title, contentType, status, snippet, score }[]`. Snippet is first 500 characters of body. |

**Workflow Transition Functions:**

| Function | Description | Transition |
|---|---|---|
| `submitForReview(id, submitterId)` | Submit draft for review | `draft` → `submitted`. Validates current status is `draft`. Sets `updatedAt`. |
| `beginReview(id, reviewerId)` | Reviewer claims a submission | `submitted` → `in_review`. Sets `reviewedBy`. |
| `approveContent(id, reviewerId)` | Approve reviewed content | `in_review` → `approved`. Sets `reviewedBy`, `reviewedAt`, optional `reviewComment`. |
| `rejectContent(id, reviewerId, comment)` | Reject with comment | `in_review` → `draft`. Sets `reviewedBy`, `reviewedAt`, `reviewComment`. Comment is required. |
| `publishContent(id, publisherId)` | Mark approved content as published | `approved` → `published`. Sets `updatedBy`, `updatedAt`. |
| `resetToDraft(id, userId)` | Reset approved/published content to draft for editing | `approved` or `published` → `draft`. Clears `reviewComment`, `reviewedBy`, `reviewedAt`. Sets `updatedBy`, `updatedAt`. |

**Reference Guard:**

| Function | Description |
|---|---|
| `countContentByKnowledgeObject(objectId)` | Count content pieces that reference a knowledge object via any cross-reference. Used by `checkGeneratedContentReferences()` in `lib/knowledge.ts` (already exists — verify compatibility). |

Sub-agent directive: execute CRUD and workflow functions as a single task.

**CL4 — Phase 1 Testing and Validation** — ✅ Done (2026-03-24)
Unit tests for `lib/content-types.ts`: utility functions, status labels, source channel labels, `isEditableStatus()`. Unit tests for `lib/content.ts`: CRUD operations (create with valid/invalid content type, update only drafts, delete only drafts), workflow transitions (valid transitions succeed, invalid transitions throw), cross-reference resolution, semantic search. Verify: `npm run build` passes, `npm test` passes.

Sub-agent directive: execute tests, verify build, fix any failures.

## Phase 2 — Internal API Routes

**CL5 — Content CRUD API Routes** — ✅ Done (2026-03-25)
Build API routes at `app/api/content/` following established patterns from `app/api/skills/`.

| Method | Route | Description | Auth |
|---|---|---|---|
| `GET` | `/api/content` | List content with optional query params: `contentType`, `status`, `sourceChannel`, `tags`, `search`, `limit`, `offset` | `requireRole("contributor")` |
| `POST` | `/api/content` | Create new content piece (status: `draft`) | `requireRole("contributor")` |
| `GET` | `/api/content/[id]` | Get content detail with resolved cross-references | `requireRole("contributor")` |
| `PUT` | `/api/content/[id]` | Update content (draft/rejected only; approved/published resets to draft) | `requireRole("contributor")` |
| `DELETE` | `/api/content/[id]` | Delete content (draft only) | `requireRole("editor")` |

Implementation files: `app/api/content/route.ts` (GET list, POST create), `app/api/content/[id]/route.ts` (GET detail, PUT update, DELETE).

Sub-agent directive: execute CRUD routes as a single task.

**CL6 — Content Workflow API Routes** — ✅ Done (2026-03-25)
Build workflow action routes at `app/api/content/[id]/`.

| Method | Route | Description | Auth |
|---|---|---|---|
| `POST` | `/api/content/[id]/submit` | Submit draft for review (draft → submitted) | `requireRole("contributor")` |
| `POST` | `/api/content/[id]/review` | Review action: accept `{ action: "approve" }` or reject `{ action: "reject", comment: "..." }`. Approve transitions `in_review` → `approved`. Reject transitions `in_review` → `draft` with comment. | `requireRole("editor")` |
| `POST` | `/api/content/[id]/publish` | Publish approved content (approved → published) | `requireRole("admin")` |

Implementation files: `app/api/content/[id]/submit/route.ts`, `app/api/content/[id]/review/route.ts`, `app/api/content/[id]/publish/route.ts`.

The review route handles the `submitted` → `in_review` transition automatically when a reviewer first acts — the reviewer does not need to explicitly "claim" the review. The `POST /review` call sets `reviewedBy` and transitions through `in_review` to the final state (`approved` or `draft` on rejection) in a single operation.

Sub-agent directive: execute workflow routes as a single task.

**CL7 — Phase 2 Testing and Validation** — ✅ Done (2026-03-25)
Integration tests for all `/api/content/` endpoints: correct status codes (200, 201, 400, 404, 409), error cases (update non-draft returns 409, delete non-draft returns 409, approve non-submitted returns 409, reject without comment returns 400), workflow transition sequences (create → submit → approve → publish; create → submit → reject → edit → re-submit). Auth tests: unauthenticated requests return 401, insufficient role returns 403. Verify: `npm run build` passes.

Sub-agent directive: execute tests, verify build, fix any failures.

## Phase 3 — Content Library UI — ✅ Done (2026-03-25)

**CL8 — Content List Page** — ✅ Done (2026-03-25)
Build `app/content/page.tsx` with:

- Filter tabs: All / Draft / Submitted / In Review / Approved / Published
- Content type filter dropdown (derived from `CONTENT_TYPES` in `lib/skill-types.ts`)
- Search input (queries title and body)
- List of content cards showing: title, content type badge, status badge, source channel badge (if external), `createdBy`, `createdAt`
- Sorted by most recently created by default
- "+ Submit Content" button linking to `/content/new`
- Empty state message when no content exists

Build `app/content/components/content-list.tsx` — the list component.
Build `app/content/components/status-badge.tsx` — status-specific badge component mapping statuses to badge variants (draft=default, submitted=info, in_review=warning, approved=success, rejected=danger, published=purple).

Sub-agent directive: execute list page and components.

**CL9 — Content Detail Page** — ✅ Done (2026-03-25)
Build `app/content/[id]/page.tsx` with:

- Full content body rendered as markdown (using `MarkdownRenderer` from `app/knowledge/components/`)
- Metadata sidebar: content type, status badge, source channel, creator, created date, updated date, reviewer (if reviewed), review date (if reviewed)
- "Context Used" panel: linked knowledge objects (persona, segment, use cases, business rules, skills) displayed as clickable links to `/knowledge/[id]` or `/skills/[id]` with type badges
- Generation prompt (collapsible section, if present)
- Reviewer comment (prominently displayed if content was rejected, with reviewer name and timestamp)
- Export button: copy body as plain text or download as `.md` file

Build `app/content/components/content-detail-actions.tsx` — context-dependent action bar:

| Status | Available Actions |
|---|---|
| `draft` | Edit, Submit for Review, Delete |
| `submitted` | (read-only to creator); Approve, Reject (for reviewers) |
| `in_review` | Approve, Reject (for reviewers) |
| `approved` | Publish (admin), Edit (resets to draft with confirmation) |
| `rejected` | Edit (returns to draft for revision) |
| `published` | Edit (resets to draft with confirmation) |

Sub-agent directive: execute detail page and actions component.

**CL10 — Content Create and Edit Pages** — ✅ Done (2026-03-25)
Build `app/content/components/content-form.tsx` — shared form component with fields:

- Title (text input)
- Content Type (select dropdown from `CONTENT_TYPES`)
- Body (textarea with markdown preview toggle)
- Tags (pill-style TagEditor)
- Source Description (optional text input, shown only for manual submission)

Build `app/content/new/page.tsx` — "Submit Content" creation form for manual content entry. Sets `sourceChannel: "direct_upload"`. On save, creates content as `draft` via `POST /api/content`.

Build `app/content/[id]/edit/page.tsx` — edit form. Loads existing content, allows editing `title`, `body`, and `tags`. If content is `approved` or `published`, shows a confirmation dialog warning that editing will reset status to `draft`. On save, calls `PUT /api/content/[id]`.

Sub-agent directive: execute form component and both pages.

**CL11 — Navigation Integration** — ✅ Done (2026-03-25)
Activate the "Content" nav item in `app/components/layout/sidebar-nav.tsx`: change `href: "#"` to `href: "/content"` and remove `disabled: true`. Add a "Content Library" navigation card to `app/page.tsx` home page, following the existing card pattern for Knowledge Base and Skills Library. Card shows: brief description, content count (total), and link to `/content`.

Sub-agent directive: execute navigation changes.

**CL12 — Phase 3 Testing and Validation** — ✅ Done (2026-03-25)
Browser-based smoke testing: navigate all content pages (`/content`, `/content/new`, `/content/[id]`, `/content/[id]/edit`), verify rendering, form submission, status badge display, markdown rendering, responsive layout. Verify navigation card on home page. Verify filter tabs and search work correctly. Verify sidebar "Content" link is active and navigates correctly. Verify: `npm run build` passes.

Sub-agent directive: execute browser tests, verify UX, fix any issues.

## Phase 4 — Editorial Workflow UI — ✅ Done (2026-03-25)

**CL13 — Workflow Action Buttons** — ✅ Done (2026-03-25)
Wire up the action buttons in `content-detail-actions.tsx` to call the workflow API routes:

- "Submit for Review" calls `POST /api/content/[id]/submit`, transitions to `submitted`, shows success toast
- "Approve" calls `POST /api/content/[id]/review` with `{ action: "approve" }`, transitions to `approved`
- "Reject" opens a modal requiring a non-empty comment, calls `POST /api/content/[id]/review` with `{ action: "reject", comment }`, transitions to `draft`
- "Publish" calls `POST /api/content/[id]/publish`, transitions to `published`
- "Edit" on approved/published content shows a confirmation dialog ("Editing will reset this content to draft for re-review"), then calls `PUT /api/content/[id]` which triggers `resetToDraft()`, then navigates to edit page

Use the shared `Button` component from `app/components/ui/button.tsx` for all actions. Use the `ConfirmDialog` pattern from `app/skills/components/skill-detail-actions.tsx` for destructive/state-changing confirmations.

Sub-agent directive: execute workflow action wiring.

**CL14 — Reviewer Feedback Display and Status Guards** — ✅ Done (2026-03-25)
On the content detail page:

- When `reviewComment` is present and status is `draft` (indicating a rejection-and-return), display a prominent feedback banner: "Reviewer Feedback from [reviewedBy] on [reviewedAt]: [reviewComment]". Use `bg-status-warning-bg` / `text-status-warning` styling.
- Status-dependent read-only enforcement: when status is `submitted` or `in_review`, the "Edit" button is hidden for the content creator. Reviewers see Approve/Reject. Role-based visibility using the `useSession()` hook and permission checks.
- Invalid transition guard: if a user somehow triggers an invalid transition (e.g., approve a draft), the API returns 409 and the UI shows an error toast with a descriptive message.

Sub-agent directive: execute feedback display and guards.

**CL15 — Phase 4 Testing and Validation** — ✅ Done (2026-03-25)
Test full workflow end-to-end via the UI: create draft → submit for review → approve → publish. Test reject flow: create → submit → reject with comment → verify comment displays → edit → re-submit → approve. Test edit-approved flow: create → submit → approve → edit (confirm dialog) → verify status resets to draft. Test role-based visibility: contributor sees only creator actions, editor sees review actions, admin sees publish action. Verify: `npm run build` passes.

Sub-agent directive: execute workflow tests, verify UX, fix any issues.

## Phase 5 — Dashboard Integration — ✅ Done (2026-03-25)

**CL16 — Content Metrics on Health Dashboard** — ✅ Done (2026-03-25)
Extend `getDashboardData()` in `lib/dashboard.ts` with content metrics: total content count, count by status (draft, submitted, in_review, approved, rejected, published), count by content type. Add content stat cards to `/dashboard` using the existing `StatCard` component. Add a "Content by Status" breakdown section.

Data source: new `getContentCounts()` function in `lib/content.ts` that runs aggregate queries against the `GeneratedContent` collection.

Sub-agent directive: execute dashboard extension.

## Phase 6 — Testing and Documentation

**CL17 — Comprehensive Testing**
Complete test coverage across all phases:

- Unit tests for `lib/content-types.ts`: all utility functions
- Unit tests for `lib/content.ts`: CRUD operations, workflow transitions, invalid state transitions throw errors, cross-reference resolution, semantic search
- Integration tests for all `/api/content/` routes: status codes, error cases, auth, pagination
- Integration tests for workflow routes: valid transition sequences, invalid transitions return 409
- Verify `npm run build` passes with zero type errors
- Verify `npm test` passes

Sub-agent directive: execute full test suite, fix any failures.

**CL18 — Documentation Updates**
Update all project documentation to reflect the Content Library module:

- `docs/KNOWLEDGE_BASE.md` — Verify `GeneratedContent` collection schema matches implementation (properties, cross-references, descriptions). The schema is already documented; verify accuracy after CL1 migration.
- `docs/API.md` — Add all `/api/content/` route contracts (CRUD + workflow actions) with request/response shapes, status codes, and error cases.
- `docs/BUSINESS_LOGIC.md` — Add Content Library lifecycle description: editorial workflow states, transition rules, how content differs from knowledge in the review model. Update the "Content Write Path" section to reflect implementation status.
- `docs/CHANGELOG.md` — Add Group CL entry summarizing all phases.
- `docs/SCOPE.md` — Update module status table with Content Library status.
- `docs/user-guides/content-library.md` — End-user guide covering: what the Content Library is, how to submit content manually, browsing and searching, the editorial workflow (submit, review, approve, reject, publish), editing approved content, exporting content.
- `.cursor/rules/start.mdc` — Regenerate via sync-start rule to include content routes, pages, and lib files.

Sub-agent directive: execute all doc updates as a single task.

## Interoperability

| System | Integration |
|---|---|
| Generate UI (Module 2) | The Generate UI calls `createContent()` to save generated content as a `draft`. The Content Library stores the result with full metadata (prompt, content type, knowledge objects used, skills applied). The Generate UI is a separate group and is not required for the Content Library to function — content can be created manually. |
| Knowledge Base | Knowledge object detail pages can display a "Referenced By" count showing how many content pieces used this object as context. `checkGeneratedContentReferences()` in `lib/knowledge.ts` already queries this — verify it works with the new cross-references. |
| Skills Module | Skill detail pages can display usage counts showing how many content pieces were generated with this skill. `lib/skills.ts` already references `usedSkills` on `GeneratedContent`. |
| External REST API ([Group K](./group-k.md)) | K13–K16 content endpoints call `listContent()`, `getContent()`, `semanticSearchContent()` from `lib/content.ts`. These functions are built in CL3. |
| MCP Server ([Group J](./group-j.md)) | J26–J28 content tools call the same `lib/content.ts` functions. `submit_content` (J27) calls `createContent()` with `sourceChannel: "mcp"`. |
| Health Dashboard | Dashboard gains content stat cards via CL16. |
| Content Narratives ([Group R](./group-r.md)) | Future: `usedNarrative` cross-reference on `GeneratedContent` tracks which narrative was used. Added as a schema extension when Group R is implemented. |
| Bulk Upload | Not applicable. Bulk upload is for knowledge objects. Content bulk import (Module 5) is a future extension. |

## Risks and Gaps

| Risk | Impact | Mitigation |
|---|---|---|
| Schema migration on a live collection | Adding properties to an existing `GeneratedContent` collection could fail or cause downtime | Migration script is idempotent and additive-only (no property removal or modification). New properties have no default values — existing records will have `null` for new fields. All code handles `null`/`undefined` gracefully. |
| No content versioning | Editing a draft overwrites the previous version with no history | Acceptable for Phase 1. Content version history is tracked in [deferred.md](./deferred.md). The editorial workflow (review before publish) is the quality gate. |
| Editorial workflow is simpler than knowledge review | No AI merge, no diff view, no deferred status for content | Content review is intentionally lighter than knowledge review. Content pieces are individual drafts, not shared source-of-truth records. If richer review is needed later, it can be added. |
| `usedSkills` cross-reference missing from seed | Existing `GeneratedContent` records (if any) will not have `usedSkills` links | CL1 adds the cross-reference. Existing records are unaffected (empty cross-ref). New content created via the Generate UI or API will populate `usedSkills`. |
| Content search quality depends on vectorizer | `semanticSearchContent()` searches the `body` field via `nearText`. Poor embeddings return irrelevant results. | Expose `certaintyThreshold` parameter. The `body` field is vectorized by Weaviate's default vectorizer (same as knowledge objects, which work well). |
| No reviewer assignment | The workflow supports approve/reject but not explicit reviewer assignment (WF-2 from phase-2.md) | Phase 1 uses open review — any editor can review any submitted content. Reviewer assignment can be added later if needed. |
| Sidebar nav change is visible immediately | Activating the "Content" link before the pages are built would lead to a broken link | CL11 (navigation) runs after CL8–CL10 (pages). The link is only activated when the pages exist. |
| Content count grows unbounded | No archival or cleanup mechanism for old published content | Acceptable for internal tool scale. If needed, add a `deprecated` field (matching the knowledge pattern) or an archive workflow in a future group. |

**Open Questions:**

| Question | Context |
|---|---|
| Should the editorial workflow include a `submitted` → `in_review` explicit step? | The current design collapses this: when a reviewer acts, the content transitions from `submitted` through `in_review` to the terminal state in one operation. An explicit "claim" step could prevent two reviewers from reviewing the same content simultaneously. Recommendation: collapse for simplicity in Phase 1; add explicit claim if contention becomes an issue. |
| Should content have a `deprecated` soft-delete flag? | Knowledge objects use `deprecated` for soft-delete. Content currently uses hard delete (draft only). Adding `deprecated` would allow archival of published content without deletion. Recommendation: defer to a future enhancement; hard delete of drafts is sufficient for Phase 1. |
| Should editing approved content create a new version or reset in place? | The current design resets status to `draft` in place. A versioning model would create a new record and link to the previous version (like Content Narratives). Recommendation: reset in place for Phase 1; versioning adds complexity without proportional benefit at current scale. |
| How should the Content Library handle content from the Generate UI? | The Generate UI (Module 2) will call `createContent()` with the assembled context metadata. Should the Generate UI be a page within `/content` (e.g., `/content/generate`) or a separate top-level route (`/generate`)? Recommendation: separate `/generate` route (matching the current sidebar structure), which saves to the Content Library on completion. |
| Should the content detail page show the full assembled system prompt? | GEN-5 in phase-2.md specifies a "View system prompt" panel. This requires storing the assembled prompt alongside the content. The current `prompt` field stores the user's input prompt, not the full system prompt. Recommendation: add an optional `systemPrompt` text field to `GeneratedContent` in a future enhancement, or store it as generation metadata. |

## Recommended Build Order

1. **CL1 → CL2 → CL3 → CL4** (Phase 1: schema migration, types, CRUD, testing) — prerequisite for everything
2. **CL5 → CL6 → CL7** (Phase 2: API routes, testing) — prerequisite for UI
3. **CL8 → CL9 → CL10 → CL11 → CL12** (Phase 3: UI pages, navigation, testing) — prerequisite for user interaction
4. **CL13 → CL14 → CL15** (Phase 4: editorial workflow UI, testing) — prerequisite for review
5. **CL16** (Phase 5: dashboard integration) — can begin after CL3
6. **CL17 → CL18** (Phase 6: comprehensive testing, documentation) — after all other phases

Phases 1–4 are sequential (each depends on the prior). Phase 5 can begin after Phase 1 (CRUD functions exist for counting). Phase 6 runs last.

**Estimated effort: 5–8 days**, depending on UI complexity and test coverage depth. Phase 1 (backend) is 1–2 days. Phase 2 (API) is 1 day. Phase 3 (UI) is 2–3 days. Phase 4 (workflow UI) is 1 day. Phase 5 (dashboard) is 0.5 day. Phase 6 (testing + docs) is 1 day.
