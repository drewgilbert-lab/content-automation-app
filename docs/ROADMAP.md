# Content Engine — Roadmap

> Last updated: February 2026

This is the single source of truth for future plans, phased delivery, deferred scope, and open questions.

---

## Module 1 Build Plan — Knowledge Base

> Scope: Managing knowledge objects and the relationships between them. No content generation in this module.
> Full user stories: see the Module 1 planning document.

Each step below is independently shippable. Steps within a group can be built in parallel; groups should be completed in order.

---

### Group A — Read Layer (foundation for everything else) — **Done**

**A1 — Weaviate list API** — **Done**
Build `GET /api/knowledge` route that returns all objects across all collections (Persona, Segment, UseCase, BusinessRule, ICP). Supports optional `type` query param to filter by collection. Returns: `id`, `name`, `type`, `tags`, `createdAt`, `updatedAt`.

**A2 — Weaviate detail API** — **Done**
Build `GET /api/knowledge/[id]` route that returns a single object by Weaviate UUID. Returns all fields including full `content`, cross-reference IDs and names, and `subType` for BusinessRule objects.

**A3 — Knowledge Base list page** — **Done**
Render all objects grouped by type. Each row shows name, type badge, tags, and `updatedAt`. Includes type filter tabs (All / Personas / Segments / Use Cases / Business Rules / ICPs) and a name/tag search field.

**A4 — Knowledge Base detail page** — **Done**
Render a single object at `/knowledge/[id]`. Full `content` rendered as formatted markdown. Metadata sidebar: type, subType (if applicable), tags, `createdAt`, `updatedAt`. Cross-references listed with clickable links to their own detail pages.

---

### Group B — Write Layer — **Done**

**B1 — Create API** — **Done**
`POST /api/knowledge` route. Accepts type, name, content, tags, and type-specific fields. Writes to the correct Weaviate collection. Enforces name uniqueness within collection (returns 409 on conflict).

**B2 — Update API** — **Done**
`PUT /api/knowledge/[id]` route. Accepts any writable fields. Updates the Weaviate object and sets `updatedAt`.

**B3 — Delete API** — **Done**
`DELETE /api/knowledge/[id]` route. Checks `GeneratedContent` references and returns a warning count. Deletes on `?confirm=true` or zero references.

**B4 — Create/Edit forms** — **Done**
Adaptive form component (`knowledge-form.tsx`) with type-specific fields, markdown preview, and validation. Create page at `/knowledge/new`, edit page at `/knowledge/[id]/edit`.

**B5 — Deprecation** — **Done**
Added `deprecated: boolean` field to all 5 knowledge collections via migration script. `PATCH /api/knowledge/[id]` supports deprecate/restore actions. Detail page shows deprecated banner and action buttons (Edit/Delete/Deprecate). Deprecated objects display a "Deprecated" badge in the list view.

---

### Group C — Relationship Layer — **Done**

**C1 — Relationship write API** — **Done**
Build `POST /api/knowledge/[id]/relationships` and `DELETE /api/knowledge/[id]/relationships` routes. Accept `targetId` and `relationshipType`. Write Weaviate cross-references directly.

**C2 — Manage Relationships panel** — **Done**
On every object detail page, add a "Manage Relationships" panel (separate from the content editor). Shows current cross-references grouped by type. Search/select to add new cross-references from compatible collections. Remove button on each existing reference. Saves immediately via C1.

---

### Group D — Health Dashboard — **Done**

**D1 — Dashboard data API** — **Done**
`GET /api/dashboard` route. Returns object count per collection type, objects with `updatedAt === createdAt` (never reviewed), objects not updated in 90+ days (stale), and relationship gap analysis (zero cross-references, partial relationships, asymmetric relationships, ICPs missing persona/segment, BusinessRules with no `subType`). Business logic in `lib/dashboard.ts`; fetches all 5 collections in parallel with cross-references and runs analysis in memory.

**D2 — Dashboard page** — **Done**
Health dashboard at `/dashboard`. Sections: overview stat cards (total count, per-type counts, never-reviewed, stale, gap counts), relationship gap report (collapsible sections by gap category with "Fix" CTA linking to object detail page), staleness report (sorted list with "Never Reviewed" / "Stale" badges), and review queue placeholder (disabled, pending Group E). Home page updated with active Dashboard navigation card.

---

### Group E — Review Queue — **Done**

**E1 — Submission API** — **Done**
Build `POST /api/submissions` route. Accepts: `objectType`, `proposedContent`, optional `targetObjectId` (if updating an existing object), submitter identifier. Stores the submission as a pending record (not yet written to Weaviate). Returns submission ID and status `pending`.

**E2 — Queue list API** — **Done**
Build `GET /api/submissions` route. Returns all pending submissions with: submitter, object name, object type, submission type (new / update / relationship change), submitted date. Supports filter by submission type.

**E3 — Queue review API** — **Done**
Build `POST /api/submissions/[id]/review` route. Accepts action: `accept`, `reject` (requires comment), `defer` (optional note). Accept writes to Weaviate and closes the submission. Reject records the comment and closes. Defer leaves it open with a note.

**E4 — Queue UI** — **Done**
Render the review queue at `/queue`. List of pending items with filter by type. Clicking an item opens:
- For new object submissions: full content preview, Accept / Reject / Defer actions
- For update submissions: side-by-side diff (current vs. proposed), Accept / Trigger AI Merge / Reject actions

**E5 — Connector/User submission flow** — **Done**
When a Connector or User saves a create or edit form, route the save through E1 (submission) instead of directly to Weaviate. Show a "Pending review" status on the submitted object. User and Connector cannot directly write to the live knowledge base.

---

### Group F — AI Merge Workflow — **Done**

**F1 — Merge API** — **Done**
`POST /api/submissions/[id]/merge` streams an AI-merged document. Fetches the current live version of the target object and the proposed content from the submission. Sends both to Claude with a merge system prompt via `lib/merge.ts`. Returns a streaming text response. `POST /api/submissions/[id]/merge/save` accepts the reviewer-edited merged content, updates the target knowledge object, and closes the submission as accepted.

**F2 — Tracked-changes diff** — **Done**
Character-level diff computed client-side via `diff-match-patch`. Added text in green, removed text as red strikethrough, unchanged text as normal. Two-panel layout: read-only tracked-changes view (left) and editable textarea (right). Diff recalculates live as the reviewer edits.

**F3 — Merge review UI** — **Done**
"Merge with AI" button on the Queue review panel (E4) for update submissions. Calls F1, renders the tracked-changes diff (F2) in a full-width editor. Actions: "Save" (commits the merged result to Weaviate and closes the queue item) or "Discard" (returns to the side-by-side review panel).

---

### Group G — Bulk Upload with AI Classification

> Scope: Upload multiple documents at once, classify each into the correct knowledge object type using AI, review classifications, then route to the admin review queue.
> Dependencies: Groups A–F (existing submission/review queue infrastructure). Shares document parser with Group H.

**G1 — Document Parser** — **Done**
Build `lib/document-parser.ts` supporting four file formats: Markdown (`.md`), PDF (`.pdf`), DOCX (`.docx`), and plain text (`.txt`). PDF extraction via `pdf-parse`; DOCX conversion via `mammoth`. Returns a `ParsedDocument` containing extracted text content, filename, original format, word count, and any parse errors. Enforces configurable limits: 10 MB per file, 100 MB per batch, 50 files per batch. Validates MIME types server-side.

**G2 — AI Classification API** — **Done**
Build `POST /api/bulk-upload/classify` route. For each parsed document, calls Claude with the document content plus a summary of all existing knowledge objects in the system. Claude returns a JSON classification: `objectType`, `objectName`, `tags`, `suggestedRelationships` (with target names resolved to IDs via Weaviate lookup), and a `confidence` score (0.0–1.0). Items below 0.7 confidence are flagged for manual review. Processing is sequential to avoid rate limits, with progress reported via Server-Sent Events.

**G3 — Upload Session Management** — **Done**
Build `POST /api/bulk-upload/parse` route accepting `FormData` with multiple files. Parses all files via G1, creates a transient upload session stored server-side (in-memory with optional Redis persistence). Each session stores parsed documents, classification results, and user edits. Sessions expire after 24 hours. `GET /api/bulk-upload/session/[sessionId]` retrieves session state. `POST /api/bulk-upload/reclassify` re-runs classification on a single document within a session.

**G4 — Uploader Review UI** — **Done**
Build `/bulk-upload` page. Step 1: drag-and-drop file upload zone with file list preview (name, size, format). Step 2: classification progress indicator ("Classifying document 3 of 10...") with per-document status. Step 3: review list where the uploader can verify and edit the AI-assigned type (dropdown), name (text input), tags (tag editor), and suggested relationships (expandable panel with add/remove) for each document. Confidence scores displayed per item; low-confidence items highlighted. Expandable document preview shows parsed content. Bulk actions: "Accept All", "Accept Selected", "Reclassify Selected". Individual actions: edit, remove from batch, view original.

**G5 — Submission Bridge** — **Done**
Build `POST /api/bulk-upload/approve` route. For each approved document, creates a `Submission` via the existing `createSubmission()` function with `submissionType: "new"`. The `proposedContent` JSON includes `name`, `content`, `tags`, and `relationships` (with resolved target IDs). Approved documents enter the existing admin review queue at `/queue`. Returns an array of created submission IDs with per-document error reporting for partial failures.

**Bug fixes applied (February 26, 2026):** Critical fixes to make the pipeline functional end-to-end: `pdf-parse` downgraded from v2.x to v1.x (v2 crashed Node.js via `DOMMatrix`), lazy PDF import to isolate parser failures, error surfacing in upload wizard, step-back to Step 1 on classification failure, try/catch in reclassify route, missing type labels added, `sourceFile` provenance added to approve route, and `globalThis` session store for Turbopack dev mode stability. See CHANGELOG.md for full details.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| PDF/DOCX parsing loses formatting, tables, images | Extracted content may be incomplete or garbled | Show parsed preview before classification; allow manual content editing; log parse errors per document |
| No OCR for scanned PDFs | Image-based PDFs produce empty or minimal text extraction | Document the limitation; consider `tesseract.js` or cloud OCR as a future enhancement |
| AI misclassifies object type | Wrong type assigned to a document | Confidence scoring with 0.7 threshold; flag low-confidence items; user corrects before submitting |
| Claude API rate limits on large batches | 50 documents = 50 API calls; may hit rate limits | Sequential processing with configurable delays; exponential backoff on 429 responses; batch size limit |
| Partial batch failures | Some documents fail to parse or classify while others succeed | Continue processing remaining documents; surface per-document errors; allow retry of failed items |
| No semantic duplicate detection | User may upload documents that duplicate existing knowledge objects | Add Weaviate `nearText` similarity check during classification; flag potential duplicates in review UI |
| Upload session lost on server restart | In-memory session storage is volatile | Persist sessions to Redis or a temp database for production; show "Resume Upload" if session exists |
| High API costs for large batches | No visibility into token usage per batch | Track token consumption; consider a cheaper model for initial classification; display cost estimate |
| Reviewing 50+ documents is overwhelming | Poor UX at scale | Pagination, type/confidence filters, bulk actions, keyboard shortcuts |
| Malicious file uploads | Security risk from unvalidated files | Validate MIME types + extensions server-side; enforce size limits; sanitize filenames |

---

### Group H — Enhanced Change Review Workflows

> Scope: Two improvements to the review queue: (1) upload a document to supplement an existing knowledge object via AI merge, and (2) visual diff highlighting for all manual edits.
> Dependencies: Groups E–F (review queue, AI merge). G1 document parser (shared).

#### Workflow H-a: Add Document to Existing Object

A user uploads a new document (research report, updated spec, etc.) to add information to an existing knowledge object. The system uses Claude to produce a merged version incorporating the new document's information, then routes it to the review queue with tracked changes.

**H1 — Document Upload for Existing Objects**
Build `/knowledge/[id]/add-document` page. File upload form accepts a single document (same formats as G1). On upload, the system parses the document via `lib/document-parser.ts`, then creates a submission with a new `submissionType: "document_add"`. The submission's `proposedContent` stores the raw extracted document text. The `targetObjectId` points to the existing knowledge object. Add a "Add Document" button to the knowledge detail page action bar (visible to Contributors).

**H2 — Document Addition Merge Prompt**
Extend `lib/merge.ts` with a new `buildDocumentAdditionPrompt()` function. The prompt framing differs from the existing update merge: instead of "resolve differences between two versions," it instructs Claude to "incorporate the new document's information into the existing knowledge object while preserving the existing structure and removing redundancies." The existing object content is provided as the base; the uploaded document is provided as supplementary material to integrate.

**H3 — Review Queue Integration for Document Additions**
When an admin opens a `document_add` submission in the review queue, the UI offers a "Merge Document" button (similar to the existing "Merge with AI" for updates). Clicking it calls `POST /api/submissions/[id]/merge` (which detects the `document_add` type and uses H2's prompt). The admin sees the existing content vs. the AI-merged result with tracked changes via the existing `MergeEditor` component. The admin can edit the merged version before saving. Alternatively, the admin can view the raw uploaded document alongside the current content for manual comparison.

#### Workflow H-b: Visual Diff for Manual Edits

Currently, `ContentDiff` (`app/queue/components/content-diff.tsx`) shows a side-by-side comparison of current vs. proposed content without diff highlighting. This needs to match the quality of the `MergeEditor`'s tracked-changes view.

**H4 — Visual Diff Component**
Build a reusable `VisualDiff` component at `app/queue/components/visual-diff.tsx`. Uses the existing `diff-match-patch` library (already installed) with `diff_cleanupSemantic()` for word-level granularity. Supports two display modes:
- **Unified view** (default): single panel showing inline changes — additions in green highlight, deletions in red with strikethrough, unchanged text rendered normally. Collapsible unchanged sections for long documents.
- **Side-by-side view**: two synchronized-scroll panels — left shows original with deletions highlighted, right shows modified with additions highlighted.

Extract the existing diff rendering logic from `MergeEditor` into this shared component so both `MergeEditor` and `ContentDiff` use the same rendering.

**H5 — ContentDiff Upgrade**
Replace the current static side-by-side comparison in `content-diff.tsx` with the new `VisualDiff` component. Add a toggle to switch between unified and side-by-side views. Keep the metadata comparison (name, tags, type changes) as a separate section above the content diff. The content diff uses `VisualDiff` to show exactly what text was added, removed, or unchanged.

**Existing code to leverage:**
- `diff-match-patch` (v1.0.5) and `diff` (v8.0.3) are already installed
- `MergeEditor` already implements tracked-changes rendering — the green/red highlighting pattern can be extracted into the shared `VisualDiff` component
- `ContentDiff` at `app/queue/components/content-diff.tsx` provides the current side-by-side layout structure

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Large document diffs (50K+ chars) become unreadable | Overwhelming diff output | Collapse unchanged sections by default; virtual scrolling for very long diffs; paginate changes |
| AI merge quality for document additions | Claude may incorrectly integrate new information or lose nuance | Admin can always edit before accepting; track post-merge edit frequency as a quality signal |
| Concurrent edits to the same object | Multiple pending submissions for one object create conflicts | Detect and warn when multiple pending submissions target the same `targetObjectId`; consider object-level locking during active review |
| Markdown formatting changes create noisy diffs | Reformatting (e.g. line wrapping) appears as content changes | Diff operates on raw markdown source; optionally normalize whitespace before diff; show rendered preview alongside |
| Green/red diff colors are not colorblind-accessible | Some users cannot distinguish changes | Use patterns (underline for additions, strikethrough for deletions) in addition to color; support high-contrast mode |
| No version history for knowledge objects | Cannot view or restore previous versions after accepting a merge | Note as a dependency on the deferred "Event Logging & Audit Trails" section; consider lightweight version snapshots |
| `document_add` is a new submission type | Existing code assumes only "new" or "update" | Ensure all submission list/filter/review code handles the new type gracefully; add to filter options in queue UI |

---

### Group I — Skills Module

> Scope: New module separating procedural task instructions ("Skills") from passive constraints ("Business Rules"). Skills are active, task-specific instructions that tell the AI how to perform a specific type of work — analogous to Cursor's SKILL.md files or Claude's system instructions.
> Dependencies: Group B (write layer for migration). Module 2 Generate (for context assembly integration).

#### Separation Criteria

| Attribute | Business Rule | Skill |
|---|---|---|
| Nature | Passive constraint | Active procedural instruction |
| Application | Always included when active | Conditionally selected by content type or manual choice |
| Prompt role | "Constraints" section — what not to do | "Instructions" section — how to do the task |
| Scope | Broad, cross-cutting | Task-specific |
| Format | "Don't mention competitors" / "Use confident tone" | "Step 1: Extract the key metrics. Step 2: Structure as..." |
| Current storage | `BusinessRule` with `subType: "tone"` or `"constraint"` | `BusinessRule` with `subType: "instruction_template"` (to be migrated) |

**I1 — Skill Collection Schema**
Create a new `Skill` Weaviate collection. Properties: `name` (text, vectorized), `description` (text, vectorized — short summary of what the skill does), `content` (text, vectorized — full instruction body in markdown), `active` (boolean — toggle to enable/disable), `contentType` (text[] — which content types trigger this skill, e.g. `["email", "internal_doc"]`), `triggerConditions` (text — optional JSON for complex trigger logic), `parameters` (text — optional JSON array of `SkillParameter` objects defining expected inputs), `outputFormat` (text — description of expected output structure), `version` (text — semantic version string), `previousVersionId` (text — UUID of the prior version for rollback), `tags` (text[]), `category` (text — e.g. `"content_generation"`, `"documentation"`, `"transformation"`), `author` (text), `sourceFile` (text), `deprecated` (boolean), `createdAt` (date), `updatedAt` (date). Cross-references: `GeneratedContent ──usedSkills──► Skill[]`.

**I2 — Skill CRUD API**
Build `GET /api/skills` (list with optional filters: `contentType`, `active`, `category`), `POST /api/skills` (create), `GET /api/skills/[id]` (detail), `PUT /api/skills/[id]` (update — prompts version bump), `DELETE /api/skills/[id]` (with reference check), `PATCH /api/skills/[id]` (activate/deactivate/deprecate/restore). Implementation in `lib/skills.ts` and `lib/skill-types.ts`, mirroring the existing knowledge CRUD pattern. Enforces name uniqueness within the `Skill` collection.

**I3 — Skills Library UI**
Build `/skills` list page with filters (active/inactive, content type, category), search, and activation toggle per skill. `/skills/[id]` detail page showing full instruction content (markdown), metadata sidebar (category, tags, content types, version, author, timestamps), activation toggle, and usage stats (count of `GeneratedContent` objects that used this skill). `/skills/new` and `/skills/[id]/edit` forms with fields for name, description, content (markdown editor with preview), content types (multi-select), category (dropdown), tags, parameters (dynamic form builder), and output format. Version bump prompt on edit (patch/minor/major).

**I4 — Context Assembly Integration**
Build `lib/context-assembly.ts` with an `assembleContext()` function. During content generation, the function: (1) queries active skills matching the requested content type, (2) retrieves relevant knowledge objects via semantic search, (3) appends active business rules as constraints. The assembled system prompt follows this structure:

```
You are a B2B content writer creating [CONTENT_TYPE] for [COMPANY_NAME].

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
[Business rule content — tone, what not to say]

Follow the Active Skills above to structure and format your output.
Respect all Business Rules for tone and constraints.
```

Skill selection modes: automatic (by content type), manual (user picks from a list), or hybrid (auto-select + user override). Limit: max 3–5 active skills per generation to manage context window size.

**I5 — Migration Script**
Build `scripts/migrate-instruction-templates.ts`. Reads all `BusinessRule` objects with `subType: "instruction_template"`, creates corresponding `Skill` objects (preserving name, content, tags, sourceFile; setting `active: true`, `version: "1.0.0"`, `contentType: ["internal_doc"]`), and deprecates the original BusinessRule objects. Does not delete originals — backward-compatible until migration is verified. Includes a `--dry-run` flag to preview changes without writing. Logs a migration map (old BusinessRule UUID → new Skill UUID).

**I6 — Skill Testing Interface** (future)
Build `/skills/[id]/test` page where a user can run a skill against sample inputs and preview the generated output. Accepts a content type, optional parameters, and sample context. Calls the generation pipeline with the selected skill and displays the result. Enables validation before activating a skill in production. Includes side-by-side comparison of output with and without the skill applied.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Skill conflicts — two active skills give contradictory instructions | AI produces confused or inconsistent output | `conflictsWith` field for explicit declarations; UI warns when conflicting skills are both active; admin resolves before generation |
| Context window bloat — many skills + knowledge objects + rules | System prompt exceeds Claude's context window | Limit active skills per generation (max 3–5); track total prompt token count; warn when approaching limits; skill content length guidelines |
| No automated skill testing | Cannot verify a skill produces correct output before activation | Manual test interface (I6); track acceptance rates of content generated with each skill; A/B comparison |
| Bad skill version degrades all content for a type | Single point of failure for content quality | `previousVersionId` for one-click rollback; semantic versioning; version diff UI; gradual rollout option |
| Migration breaks existing workflows | Instruction templates stop working during migration | Feature flag to toggle between old and new systems; gradual migration (one template at a time); deprecate but don't delete old BusinessRules |
| Skills must still respect business rules | Skill instructions could override or contradict constraints | Always include business rules after skills in the prompt; document that skills define "how" while rules define "constraints" |
| Skill discovery — users don't know which skills exist | Skills go unused or wrong skills are selected | Auto-suggest skills based on content type in generation UI; skill library with clear descriptions and examples |
| Skill maintenance — skills become stale | Outdated skills produce poor output | Staleness alerts (same 90-day threshold as knowledge objects); usage tracking; deprecation workflow |
| Skill composability — skills referencing other skills | Circular dependencies, ordering issues | `dependsOn` field with circular dependency detection; resolve dependencies before injection; defer full chaining to a future enhancement |
| Skill parameter handling | Parameters add complexity to the generation UI | Start with skills that take no parameters; add parameter UI incrementally; validate parameter types at runtime |

---


### Group J — Inbound MCP Server for 3rd Party Write Access

> Scope: Expose a Model Context Protocol (MCP) server that allows external applications (n8n, Zapier, Slack bots, custom scripts, AI agents) to push knowledge content into the Content Engine. All inbound content routes through the existing Submission system and review queue — nothing writes directly to Weaviate.
> Dependencies: Groups A–F (knowledge CRUD, submission/review queue, AI merge). Optionally benefits from Group I (Skills) for skill-type submissions. Group L (LLM MCP server) shares infrastructure — see Cross-Cutting Notes below.

#### Why This Matters

The Content Engine currently accepts knowledge contributions only through its own web UI. External automation workflows (n8n, Zapier), AI agents (Slack bots, browser extensions, internal copilots), and custom scripts cannot push content into the system without manual copy-paste. Group J adds a programmatic inbound channel where external tools connect as MCP clients, propose new or updated knowledge objects, and those proposals enter the same admin review queue used by the web UI. The admin retains full control — the review queue is the universal gatekeeper regardless of content source.

#### Architecture

The MCP server is a **standalone Node.js process** using the `@modelcontextprotocol/sdk` TypeScript SDK, separate from the Next.js app. MCP servers are long-running processes that maintain persistent connections, which conflicts with Vercel's stateless serverless model. The server uses the **Streamable HTTP** transport (the stateless HTTP-based transport defined in the MCP spec), suitable for remotely-accessible servers behind reverse proxies or load balancers.

The server imports the same `lib/submissions.ts`, `lib/knowledge.ts`, and `lib/knowledge-types.ts` modules used by the Next.js API routes. This avoids duplicating business logic — the MCP server is a thin transport layer that translates MCP tool calls into the same function calls the API routes make.

| Consideration | Standalone process | Next.js API route adapter |
|---|---|---|
| MCP protocol compliance | Full SDK lifecycle management | Must shim MCP framing into Next.js request/response |
| Vercel deployment | Requires separate hosting (Railway, Fly.io) | Fits serverless model but limited by 60s timeout, no persistent state |
| Session management | Can hold MCP session state in memory | Stateless — must externalize all session state |

**Recommendation:** Standalone process deployed on Railway or Fly.io, separate URL from the Next.js app (e.g. `mcp.content-engine.example.com`).

```
mcp-server/
  index.ts           — Entry point, creates MCP server, registers tools, starts HTTP transport
  auth.ts            — API key validation middleware
  tools/
    create-object.ts — create_knowledge_object tool handler
    update-object.ts — update_knowledge_object tool handler
    list-types.ts    — list_knowledge_types tool handler
    get-schema.ts    — get_object_schema tool handler
    search-objects.ts — search_knowledge_objects tool handler
    get-object.ts    — get_knowledge_object tool handler
    list-objects.ts  — list_knowledge_objects tool handler
  types.ts           — MCP-specific type definitions
```

**J1 — MCP Server Process**
Build the MCP server as a standalone Node.js process using `@modelcontextprotocol/sdk`. Configure the Streamable HTTP transport. The server registers all tools (J2, J3), starts the HTTP listener, and validates the Weaviate connection on startup. Entry point at `mcp-server/index.ts`. Imports shared `lib/` modules for knowledge operations and submission creation.

**J2 — Read-Only Discovery Tools**
Expose tools that allow MCP clients to understand the knowledge base schema and find existing objects before proposing changes. These do not create submissions.

| Tool | Description | Input | Returns |
|---|---|---|---|
| `list_knowledge_types` | All supported knowledge object types with descriptions and required/optional fields | None | Array of `{ type, label, description, requiredFields, optionalFields, typeSpecificFields }` |
| `get_object_schema` | Full field schema for a specific knowledge type including constraints and examples | `objectType` (string) | Field-level schema with types, required flags, and example values |
| `search_knowledge_objects` | Semantic search to find existing content related to a query | `query` (string), `objectType?`, `limit?` (max 20) | Array of `{ id, name, type, tags, score, snippet }` sorted by relevance |
| `get_knowledge_object` | Full detail of a single object by ID | `objectId` (string) | Full `KnowledgeDetail` including content, cross-references, metadata |
| `list_knowledge_objects` | List objects with optional type filter | `objectType?`, `limit?` (max 200) | Array of `KnowledgeListItem` objects |

**J3 — Write Tools (Submission Creators)**
Expose tools that create Submission records entering the review queue. These never write directly to Weaviate knowledge collections.

| Tool | Description | Key Input | Returns |
|---|---|---|---|
| `create_knowledge_object` | Propose a new knowledge object for review | `objectType`, `name`, `content`, `tags?`, type-specific fields, `sourceDescription?` | `{ submissionId, status: "pending" }` |
| `update_knowledge_object` | Propose an update to an existing object | `objectId`, any writable fields, `sourceDescription?` | `{ submissionId, status: "pending", targetObjectId }` |
| `check_submission_status` | Check the status of a previously created submission | `submissionId` | `{ submissionId, status, reviewComment?, reviewedAt? }` |

Write tool flow: validate input → serialize proposed fields into `proposedContent` JSON → call `createSubmission()` with `sourceChannel: "mcp"` and `sourceAppId` from the authenticated API key → return submission ID.

**J4 — Submission Metadata Extension**
Extend the `Submission` Weaviate collection schema and `SubmissionCreateInput` type to track MCP-specific provenance:

| Property | Type | Description |
|---|---|---|
| `sourceChannel` | text | `"ui"`, `"mcp"`, or `"bulk_upload"` — how the submission was created |
| `sourceAppId` | text | Identifier for the external application (from API key record) |
| `sourceDescription` | text | Free-text describing where the content came from (provided by MCP client) |

All existing submissions default to `sourceChannel: "ui"`. The `createSubmission()` function accepts optional source parameters — existing callers continue working without changes. The queue UI at `/queue` displays a source badge on each item and adds a filter by source channel.

**J5 — API Key Authentication**
Implement lightweight API key authentication for MCP connections. Phase 1 uses environment variables:

```
MCP_API_KEYS=key1:n8n-competitive-intel:Competitive intelligence workflow,key2:slack-knowledge-bot:Slack bot for meeting notes
```

Format: `key:appId:description`, comma-separated. The `appId` becomes the `sourceAppId` on submissions. Authentication flow: MCP client includes key in HTTP `Authorization: Bearer <api-key>` header → server validates → extracts `appId` → attaches to request context. All valid keys have the same permissions (read + write-to-submission). The review queue is the authorization layer.

**Example Use Cases:**

- **n8n workflow:** Monitors competitor websites and news feeds. On detection, calls `search_knowledge_objects` to check for related objects, then `create_knowledge_object` or `update_knowledge_object` with the new intel. Submission enters queue with `sourceAppId: "n8n-competitive-intel"`.
- **Slack bot:** Extracts insights from meeting transcription tools. User types `/capture-insight`, bot formats as knowledge object and submits. Admin sees `sourceAppId: "slack-knowledge-bot"`.
- **CRM sync script:** Scheduled script reads updated segment data from Salesforce, compares with existing segments via `search_knowledge_objects`, and proposes updates when firmographic data changes.
- **AI agent:** A research assistant running in Claude Desktop discovers information relevant to an existing use case, reads current content via `get_knowledge_object`, proposes additions via `update_knowledge_object`.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| MCP server requires separate hosting from Vercel | Additional infrastructure to manage; separate deploy pipeline | Use Railway or Fly.io for a single Node.js process; document deploy steps; evaluate consolidation with Group L server |
| No rate limiting on MCP endpoints | Misconfigured workflow could flood the review queue | Per-key rate limiting (60 req/min); circuit breaker that pauses keys exceeding thresholds; admin can deactivate a key |
| API key leakage | Unauthorized content pushed into review queue | All content still requires admin approval; hash keys at rest (Phase 2); key rotation endpoint |
| No input sanitization for content field | Malicious markdown/HTML could XSS the review queue UI | Sanitize `proposedContent` before rendering; enforce max content length (100KB) in MCP validation |
| MCP spec is evolving | Transport or protocol changes may require SDK upgrades | Pin `@modelcontextprotocol/sdk` version; monitor spec releases; Streamable HTTP is the recommended stable transport |
| Submission queue overwhelm from automated sources | Admin cannot keep up with high-volume MCP submissions | Source channel filter in queue UI; batch review actions; per-source submission count on dashboard; configurable auto-defer |
| No duplicate detection | External tools may submit the same content repeatedly | Add `nearText` similarity check in write tools before creating submission; warn if similar pending submission or live object exists |
| Shared lib imports between Next.js and MCP server | Build/bundling complexity if modules have Next.js-specific imports | Keep shared libs framework-agnostic; no `next/` imports in shared code; verify with MCP server's own `tsconfig.json` |

**Open Questions:**

| Question | Context |
|---|---|
| Where to host the MCP server? | Railway, Fly.io, and dedicated Vercel Functions (Fluid Compute) are all viable. Decision depends on existing infra preferences and cost. |
| Should write tools validate content quality before creating submissions? | A lightweight Claude call could check if proposed content meets minimum quality standards. Adds latency and cost but reduces low-quality submissions. |
| Should the MCP server support `skill` as an object type from day one? | Group I is scoped but not built. Could support the type in definitions but return an error until the Skill collection exists. |
| Consolidate with Group L MCP server? | Both are MCP servers connecting to Weaviate. Could be a single process with separate tool namespaces. Decide during implementation. |
| Maximum content size per MCP submission? | Need to define a limit (e.g. 100KB) to prevent abuse. |

---

### Group K — External REST API for 3rd Party Read Access

> Scope: Expose a versioned, read-only REST API at `/api/v1/` with API key authentication, allowing other internal applications to query knowledge objects programmatically. Does not include write access.
> Dependencies: Groups A–B (read and write layer must be stable). Group I (Skills) is optional — skill endpoints are additive when that collection exists.

#### Why This Matters

Other internal tools need programmatic access to knowledge data. A recommendation engine might need persona data. A chatbot might look up use cases by semantic similarity. A BI dashboard might pull object counts and staleness metrics. Currently, none of these tools can connect without sharing raw Weaviate admin credentials, which grants full read/write access to every collection including internal ones (`Submission`, `GeneratedContent`).

Group K introduces a REST API gateway that wraps Weaviate with the Content Engine's business logic — deprecated objects are filtered, cross-references are resolved to names, response schemas are versioned and decoupled from Weaviate schema changes. External applications authenticate with an API key and query through well-defined endpoints.

**Target user experience:** A developer receives an API key and a link to the API docs. They can immediately query personas, segments, use cases, and business rules — including semantic search — from any HTTP client, script, or application.

#### Architecture Options Evaluated

| Option | Security | Setup | Query Power | Maintenance | Verdict |
|---|---|---|---|---|---|
| Direct Weaviate access (share read-only key) | Moderate — consumers see raw schema including internal collections | Lowest — create key in Weaviate console | Maximum — full Weaviate query language | Lowest code, highest schema coupling | Rejected — too much exposure, no business logic |
| REST API gateway (new `/api/v1/` routes) | Strong — only explicitly exposed endpoints reachable | Moderate — mirrors existing routes | Good — list, detail, filtered, semantic search | Moderate — reuses `lib/knowledge.ts` | **Recommended** |
| GraphQL API layer | Strong — same as REST | Higher — requires schema, resolvers, server runtime | Excellent — nested queries, field selection | Higher — GraphQL schema + resolvers + dependency | Deferred — can layer on top of REST later |

**Decision:** REST API gateway. Matches existing patterns, right level of abstraction, runs natively on Vercel, versioned from day one.

**K1 — API Key Authentication Middleware**
Build `lib/api-auth.ts` with a `validateApiKey()` function that checks the `X-API-Key` request header against stored keys. Initial implementation: single key stored in `CONTENT_ENGINE_API_KEY` environment variable. Returns `401 Unauthorized` with JSON error body if key is missing or invalid. Constant-time comparison via `crypto.timingSafeEqual` to prevent timing attacks. Build `lib/api-middleware.ts` with a `withApiAuth()` higher-order function wrapping route handlers. All `/api/v1/` routes use this wrapper. Response headers include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

**K2 — List Knowledge Objects Endpoint**
Build `GET /api/v1/knowledge`. Returns all non-deprecated knowledge objects across all collections. Query parameters: `type` (filter by collection), `tags` (comma-separated, matches any), `limit` (default 100, max 500), `offset` (pagination). Response: `{ "data": KnowledgeListItem[], "meta": { "total": number, "limit": number, "offset": number } }`. Deprecated objects excluded by default; pass `include_deprecated=true` to include. Reuses `listKnowledgeObjects()` from `lib/knowledge.ts`.

**K3 — Get Knowledge Object Detail Endpoint**
Build `GET /api/v1/knowledge/:id`. Returns a single object by Weaviate UUID including full `content`, metadata, and resolved cross-references. Response: `{ "data": KnowledgeDetail }` with `crossReferences` as array of `{ relationship, objects: [{ id, name, type }] }`. Returns `404` if not found. Reuses `getKnowledgeObject()` from `lib/knowledge.ts`.

**K4 — Semantic Search Endpoint**
Build `GET /api/v1/knowledge/search`. Performs Weaviate `nearText` query across collections. Query parameters: `q` (required, natural language query), `type` (optional, restrict to one collection), `limit` (default 10, max 50), `certainty` (minimum similarity threshold, default 0.7). Response: `{ "data": SearchResult[] }` where each result includes `KnowledgeListItem` fields plus `score` (float 0.0–1.0) and `snippet` (first 500 characters of content). Implementation: new `semanticSearchKnowledge()` function in `lib/knowledge.ts` running `nearText` queries against each collection in parallel.

**K5 — Knowledge Types and Counts Endpoint**
Build `GET /api/v1/knowledge/types`. Returns available knowledge object types with counts. Response: `{ "data": [{ type, displayName, count, description }] }`. Reuses count logic from `getDashboardData()` in `lib/dashboard.ts`.

**K6 — Skills Endpoints (Conditional on Group I)**
Build `GET /api/v1/skills` and `GET /api/v1/skills/:id`, mirroring K2 and K3 for the `Skill` collection. Additional query parameters: `content_type`, `active` (default `true`), `category`. Endpoints return `404` with `{ "error": "Skills module not yet available" }` if the Skill collection does not exist.

**K7 — API Health Endpoint**
Build `GET /api/v1/health`. Does not require API key authentication (enables uptime monitoring). Returns: `{ "status": "ok" | "degraded", "version": "1", "weaviate": { "connected": boolean }, "collections": { persona: number, ... }, "timestamp": string }`. Reuses `checkWeaviateConnection()` from `lib/weaviate.ts`.

**K8 — OpenAPI Spec and Documentation (Stretch)**
Generate an OpenAPI 3.1 spec at `public/openapi.json` describing all `/api/v1/` endpoints. Serve interactive API docs at `/api-docs` using Scalar or Redoc. Minimum viable: a markdown document at `docs/EXTERNAL_API.md` with base URL, auth instructions, endpoint reference with curl examples, rate limit policy, and error codes.

**Rate Limiting:**

| Parameter | Value |
|---|---|
| Global limit | 100 requests/minute per API key |
| Semantic search limit | 20 requests/minute per API key |
| Burst allowance | 10 requests above limit (token bucket) |
| Limit exceeded response | `429 Too Many Requests` with `retryAfter` |

Implementation: Upstash Redis + `@upstash/ratelimit` (serverless-compatible, free tier sufficient). Fallback: Vercel KV if already provisioned.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Single API key shared across all consumers | One compromised key exposes the entire API; no per-consumer auditing | Start with single key; migrate to multi-key model when consumer count exceeds 3; log all requests with key hash |
| Vercel function timeout on large queries | Listing all objects with cross-references may exceed 10s default | Pagination with 500-object cap; run collection queries in parallel; upgrade to Vercel Pro (60s timeout) if needed |
| Weaviate rate limits from external traffic | External consumers add load on top of internal UI usage | Rate limit external API independently; monitor Weaviate Cloud usage dashboard |
| Schema changes break consumers | Renaming a Weaviate property changes the API response | Version the API (`/v1/`); external response schemas defined in TypeScript types, not derived directly from Weaviate |
| Stale data in consumer caches | Consumers cache responses and serve outdated knowledge | Include `updatedAt` in all responses; document recommended cache TTL (5–15 min); consider `ETag` support as future enhancement |
| Semantic search quality depends on query phrasing | Poorly phrased queries return low-relevance results | Return `score` with every search result; document recommended `certainty` thresholds; consider hybrid search enhancement |
| Deprecated objects leak into consumer data | Consumers unaware of deprecation receive deprecated objects | Filter deprecated by default; require explicit `include_deprecated=true` |

**Open Questions:**

| Question | Context |
|---|---|
| Should the API key be scoped per-collection? | A consumer needing only personas shouldn't necessarily access business rules. Start with full read access; add per-key scoping when needed. |
| Where to store API keys long-term? | Single env var works for 1 key. Options for multiple: JSON config, Weaviate `ApiKey` collection, Vercel KV. Decide when adding second consumer. |
| Should responses include full `content` on list endpoints? | Full content makes list responses large (1–5 KB per object). Current design: list returns metadata only; detail returns full content; search returns 500-char excerpt. |
| What certainty threshold for semantic search? | Default 0.7 based on Weaviate docs. Allow consumers to override via `certainty` param. Monitor actual score distributions. |
| Should the health endpoint require auth? | Unauthenticated enables monitoring but exposes collection counts. Recommend unauthenticated with minimal info; counts only with valid key. |

---

### Group L — MCP Server for LLM Read Access (RAG Interface)

> Scope: Build an MCP server that gives any MCP-compatible LLM — Claude Desktop, Claude Code, Cursor, Gemini, and (via adapter) ChatGPT — direct read access to the Weaviate knowledge base. The LLM can list objects, retrieve details, perform semantic search, and explore relationships, effectively using the knowledge store as a RAG system accessible from any AI conversation. Phase 2 (future) adds write access routed through the review queue.
> Dependencies: Groups A–D (read layer, relationships, health dashboard). Group I (Skills) is optional — exposed if the collection exists. Group J (Inbound MCP) shares infrastructure — see Cross-Cutting Notes below.

#### Why This Matters

A user working in Claude Desktop types: *"What personas do we have and what are their key pain points?"* Claude calls the MCP server's `list_objects` tool, receives the full content, and answers grounded in the company's actual knowledge base. A user in Claude Code asks *"Find use cases related to predictive scoring"* and the MCP server runs a semantic search, returning the most relevant objects ranked by vector similarity.

This eliminates context switching — users get knowledge base answers inside the tool they're already working in. It unlocks semantic search from any LLM conversation, enables AI assistants to ground responses in approved company knowledge, and provides the foundation for agentic workflows (Phase 2) where LLMs can propose knowledge base changes. The knowledge base becomes a platform, not just an app.

#### Architecture

**L1 — Standalone MCP Server Process**
Build the MCP server as a standalone Node.js/TypeScript process in a new `mcp-server/` directory at the repo root. Uses the official `@modelcontextprotocol/sdk` package. Separate from the Next.js app — MCP servers are long-running processes with persistent connections, incompatible with Vercel's serverless model. Environment variables (`WEAVIATE_URL`, `WEAVIATE_API_KEY`) read from the project's `.env.local` or a dedicated `.env` in `mcp-server/`. Includes a health check validating the Weaviate connection on startup with automatic reconnection on failure.

```
mcp-server/
  src/
    index.ts              — Entry point, server initialization
    tools/                — MCP tool handlers (one file per tool)
    resources/            — MCP resource handlers
    weaviate.ts           — Persistent Weaviate client
    schema.ts             — Collection metadata, cross-ref config
    formatters.ts         — Response formatting for LLM consumption
  package.json
  tsconfig.json
  README.md               — Setup instructions for Claude Desktop, Claude Code, Cursor
```

**L2 — Transport Layer: stdio + SSE**
Implement two transport modes. Primary: **stdio** (standard input/output), used by Claude Desktop, Claude Code, and Cursor — the LLM spawns the MCP server as a child process. Secondary: **SSE (Server-Sent Events) over HTTP** for remote connections from cloud-hosted LLMs, web tools, or adapter layers. Transport selected via CLI flag (`--transport stdio` or `--transport sse --port 3100`). Both transports use the same tool and resource handlers.

**L3 — Weaviate Connection Management**
Build `mcp-server/src/weaviate.ts` with a **persistent** Weaviate client (differs from the Next.js `withWeaviate` per-request pattern). Creates a single `WeaviateClient` at startup and reuses for all tool calls. Exposes `getClient()` and `reconnect()` functions. Validates connection via `client.isReady()` on startup with exponential backoff retry (1s, 2s, 4s, 8s, max 30s) on failure.

#### MCP Tools

**L4 — `list_collections`**
Lists all knowledge base collections with object counts and descriptions. No parameters. Returns `{ name, type, description, objectCount, crossReferences }` for each collection. Collection descriptions and cross-reference metadata hardcoded in `schema.ts` (mirroring `KNOWLEDGE_BASE.md`).

**L5 — `list_objects`**
Lists objects with optional type filtering and pagination. Input: `type?`, `includeDeprecated?`, `limit?` (default 50, max 200), `offset?`. Returns `{ id, name, type, tags, deprecated, createdAt, updatedAt }`. Excludes deprecated by default.

**L6 — `get_object`**
Retrieves a single object by ID with full content and resolved cross-references. Input: `id` (string). Returns full detail including markdown content body, metadata, and `crossReferences` grouped by relationship label with resolved names and types.

**L7 — `search_objects` (Core RAG Capability)**
Semantic search using Weaviate `nearText`. Input: `query` (string), `type?`, `limit?` (default 10, max 25), `certaintyThreshold?` (default 0.5). Returns results ranked by vector similarity with `id`, `name`, `type`, `content` (snippet, first 500 chars), `tags`, `score`. Multi-collection search runs `nearText` against each target collection in parallel, merges results, sorts by certainty. The LLM calls `get_object` for full content when needed.

**L8 — `get_relationships`**
Returns all outbound and inbound relationships for an object. Input: `id` (string). Returns `{ objectId, objectName, objectType, outbound: Record<string, {id, name, type}[]>, inbound: Record<string, {id, name, type}[]> }`. Combines cross-reference resolution with reverse-lookup scanning.

**L9 — `get_dashboard_health`**
Knowledge base health metrics — counts, stale objects, never-reviewed, relationship gaps. No parameters. Returns aggregated counts (not full object lists) to keep responses compact for LLM context windows. The LLM follows up with `list_objects` or `get_object` for details.

**L10 — `get_collection_schema`**
Schema definition for collections. Input: `type?`. Returns property names, data types, descriptions, and cross-reference definitions. Static reference from `schema.ts` — does not query Weaviate at runtime.

#### MCP Resources

**L11 — Static and Dynamic Resources**

| Resource | URI | Description |
|---|---|---|
| Knowledge Base Overview | `knowledge://overview` | Static markdown: what the Content Engine is, what each collection stores, how objects relate. Helps the LLM understand the domain before querying. |
| Relationship Map | `knowledge://relationships` | Text representation of the cross-reference graph (all directional relationships). |
| Collection Summaries | `knowledge://collections/{type}` | Dynamic: count, list of names, common tags for a collection. Updated on each read. |

#### Semantic Search Design

**L12 — Semantic Search Flow**

1. LLM calls `search_objects` with natural language `query` (e.g. "territory planning for enterprise accounts")
2. MCP server sends query to Weaviate as `nearText` search across specified collections (or all if unfiltered)
3. Weaviate vectorizes the query and compares against stored content vectors
4. Results returned ranked by certainty score (cosine similarity)
5. MCP server formats results with `id`, `name`, `type`, `score`, and content snippet
6. LLM receives results and can call `get_object` on any result for full content

Response formatting optimized for LLM consumption: structured JSON with clear field names, content snippets truncated to 500 characters to prevent context window overflow.

#### Cross-LLM Compatibility

**L13 — Compatibility Strategy**

| LLM Client | Transport | Support | Notes |
|---|---|---|---|
| Claude Desktop | stdio | Native | Add to `claude_desktop_config.json` |
| Claude Code | stdio | Native | Same stdio mechanism |
| Cursor | stdio | Native | Add to `.cursor/mcp.json` |
| Gemini | SSE/HTTP | Supported via adapter | SSE transport mode (L2) is compatible |
| ChatGPT | HTTP | Adapter required | Does not natively support MCP; wrap SSE with OpenAPI-compatible layer. Phase 2 concern. |

Phase 1 priority: stdio for Claude Desktop / Claude Code / Cursor, plus SSE for Gemini and general HTTP access. ChatGPT adapter documented but deferred.

#### Example Interactions

**Exploring personas:** User asks *"Show me all our personas and their key pain points."* → LLM calls `list_objects({ type: "persona" })`, then `get_object` for each → synthesizes pain points from content.

**Semantic search:** User asks *"Find knowledge objects related to territory planning."* → LLM calls `search_objects({ query: "territory planning" })` → receives ranked results across UseCases, Personas, Segments with relevance scores.

**Relationship exploration:** User asks *"What segments are linked to the Sales persona?"* → LLM calls `list_objects({ type: "persona" })` to find Sales ID, then `get_relationships({ id })` → returns linked segments and use cases.

**Health check:** User asks *"Give me a summary of our knowledge base health."* → LLM calls `get_dashboard_health()` → returns total counts, stale items, gaps, missing objects.

#### Phase 2 Vision: Write Access (Future)

Phase 2 extends the MCP server with write tools that route through the existing review queue.

| Tool | Description |
|---|---|
| `create_object` | Creates a Submission with `submissionType: "new"` from LLM conversation |
| `update_object` | Creates a Submission with `submissionType: "update"` for an existing object |
| `suggest_relationship` | Proposes a cross-reference (new submission type or special-case update) |

Workflow: LLM calls write tool → MCP server creates Submission → enters review queue at `/queue` → admin reviews via existing UI (Groups E/F).

Challenges to resolve: structured data from natural language, submitter attribution (require `submitter` param or use MCP client identity), validation (same rules as web UI), conflict detection (check for existing pending submissions on same object).

#### Project Setup

**L14 — Project Scaffolding**
Initialize `mcp-server/` with `package.json`, `tsconfig.json`, and dependencies (`@modelcontextprotocol/sdk`, `weaviate-client`, `dotenv`, `zod`). Build script (TypeScript → JavaScript via `tsc`), dev script with watch mode. Update root `README.md` with pointer to `mcp-server/README.md`.

**L15 — Claude Desktop Configuration**
Document integration in `mcp-server/README.md`:

```json
{
  "mcpServers": {
    "content-engine": {
      "command": "node",
      "args": ["<path>/mcp-server/dist/index.js"],
      "env": {
        "WEAVIATE_URL": "<url>",
        "WEAVIATE_API_KEY": "<key>"
      }
    }
  }
}
```

Include setup instructions for Claude Code and Cursor as well.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Context window overflow from large responses | LLM truncates or loses important context | Return 500-char snippets in search/list; require `get_object` for full content; enforce `limit` and `max` on all tools |
| Data exposure via network-accessible SSE transport | Sensitive business knowledge accessible to anyone with SSE access | stdio is local-only by default; SSE requires explicit opt-in; add API key auth to SSE transport |
| Semantic search quality depends on Weaviate vectorizer | Poor embeddings → irrelevant results → bad LLM responses | Expose `certaintyThreshold` parameter; monitor quality; consider vectorizer upgrade per ROADMAP.md open question |
| MCP protocol evolution | Breaking changes may require server updates | Pin SDK version; follow changelog; add new tools rather than modify existing |
| Weaviate connection stability in long-running process | Connection drops cause all tool calls to fail | Reconnection logic with exponential backoff; health check on every tool call; log connection events |
| ChatGPT lacks native MCP support | Users on ChatGPT cannot connect without adapter | Document limitation; SSE transport covers Gemini and HTTP clients; defer ChatGPT adapter to Phase 2 |
| Stale schema mirror diverges from Weaviate | Tools return incorrect schema information | Startup validation comparing `schema.ts` against live Weaviate schema; log warnings on mismatch |
| Duplicated logic between MCP server and Next.js app | Schema definitions and query patterns maintained in two places | Accept duplication for Phase 1; consider extracting shared `@content-engine/core` package if maintenance burden grows |
| No rate limiting on tool calls | Runaway LLM loop could hammer Weaviate | Per-minute rate limits (60 tool calls/min); log all invocations; alert on unusual patterns |

**Open Questions:**

| Question | Context |
|---|---|
| Shared package vs. duplicated logic? | MCP server mirrors collection schemas and query patterns from Next.js app. Extract `@content-engine/core` (npm workspace) or accept duplication? Recommendation: accept duplication in Phase 1; revisit if MCP server grows. |
| SSE authentication? | stdio is inherently local. SSE is network-accessible. Use static API key (simplest) or JWT? Recommendation: static API key matching existing pattern. |
| Content truncation strategy? | 500-char snippet in search/list, full in `get_object`. Should this be configurable per request? |
| Dynamic collection detection? | Should the MCP server hard-code Skill support or dynamically detect available collections at startup? Recommendation: dynamic detection. |
| Deployment model for SSE mode? | Alongside Next.js on Vercel, separate always-on server, or Docker container? Recommendation: separate always-on service for SSE; stdio runs locally. |
| Use official Weaviate MCP server? | ADR-002 notes the official server. Build custom for domain-specific value (health dashboard, formatted responses, knowledge-type awareness); evaluate integrating official server capabilities later. |
| Response format? | JSON (structured) or markdown (human-readable)? Recommendation: JSON with `formattedSummary` field containing markdown version. |

---

### Cross-Cutting Notes: Groups J, K, L

#### J + L Consolidation Opportunity

Groups J and L are both MCP servers connecting to Weaviate. They could be a **single MCP server process** with different tool namespaces — read tools for LLMs (Group L) alongside write-to-submission tools for automation (Group J). This reduces infrastructure (one server to deploy and monitor instead of two) and shares the Weaviate connection, transport layer, and authentication logic.

**Trade-off:** A combined server exposes write tools to LLM users and read tools to automation clients. This may be desirable (LLMs get read + write in Phase 2 anyway) or may create confusion (automation clients don't need `get_dashboard_health`). A configuration flag or tool namespace could control which tools are available per connection.

**Recommendation:** Build as a single `mcp-server/` project with all tools. Use a configuration flag or API key scope to control which tool sets are available per client. Revisit if the two use cases diverge significantly.

#### K + L Data Overlap

Group K (REST API) and Group L (MCP read tools) expose the same underlying data through different protocols — REST for HTTP clients and MCP for LLMs. Both should use the same `lib/knowledge.ts` functions as their implementation layer. Neither should duplicate query logic or maintain separate data-shaping code.

If a consumer can use MCP (e.g. an AI agent), they should use Group L. If they need a standard HTTP API (e.g. a BI tool, CRM sync, or non-MCP application), they should use Group K.

#### Unified API Key Strategy

All three groups need authentication:
- **Group J:** API keys in the MCP `Authorization` header, with `appId` per key
- **Group K:** `X-API-Key` header on REST endpoints
- **Group L:** API keys for SSE transport; stdio is local-only

Design a shared key management approach that serves all three. Phase 1: environment variables with a common format. Future: a single `ApiKey` collection in Weaviate (or external auth service) with properties: `keyHash`, `appId`, `description`, `allowedScopes` (array of `"mcp-read"`, `"mcp-write"`, `"rest-read"`), `active`, `rateLimitTier`, `createdAt`, `lastUsedAt`.

#### No RBAC Dependency

All three groups are designed to work without user authentication or role-based access. The review queue is the authorization layer for writes (Groups J, L Phase 2). Read access (Groups K, L) is protected only by API keys. This is appropriate for the current single-company internal tool. When Auth/RBAC is added (Phase 3+), all three groups should integrate with the auth system for per-user or per-team scoping.


---

## Phase 1 — Foundation (Current)

### Remaining Work

| Module | What's Left | Requirements |
|---|---|---|
| Knowledge Base UI | Done — all groups (A–F) complete | See [PRD.md](./PRD.md) Module 1 |
| Generate UI | Content generation with Weaviate context retrieval + Claude streaming | See [PRD.md](./PRD.md) Module 2 |

### Acceptance Criteria

Phase 1 is complete when:

1. Weaviate Cloud is connected and all credentials are in `.env.local` — **Done**
2. All 24 seed knowledge objects (4 personas + 5 segments + 15 use cases) are imported into Weaviate — **Done**
3. Knowledge Base UI allows viewing, creating, editing, and deleting objects — **Done (Groups A + B)**
4. Generate UI produces streaming output from Claude using Weaviate-retrieved context
5. Generated content is saved to Weaviate with metadata
6. Dashboard shows green status for both Weaviate and Claude connections

---

## Phase 2 — Content Management

### Module 2: Generate

Generate content for any format by selecting a content type, providing a brief prompt, and letting the system retrieve the most relevant knowledge objects as context for Claude. Content type specs (structure, tone, context priority) are defined in [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md).

**Functional Requirements:**

- [ ] Select a content type (email, blog, social, thought leadership, internal doc)
- [ ] Enter a natural-language generation prompt
- [ ] Optionally pin specific knowledge objects to override automatic retrieval
- [ ] System automatically retrieves relevant knowledge objects from Weaviate based on the prompt
- [ ] Display which knowledge objects were used as context (transparency)
- [ ] Stream Claude's response to the UI in real time
- [ ] Save generated content to the Content library with metadata (type, date, knowledge objects used)
- [ ] Allow user to regenerate with the same or modified context

**User Stories:**

**GEN-1** — As a **content creator**, I want to select a content type before writing my prompt so the system applies the right structure and tone rules.
- Dropdown or card selector shows all 5 content types
- Selecting a type shows a brief description of that type's purpose and length
- Content type is passed to the context assembly logic

**GEN-2** — As a **content creator**, I want to write a natural-language generation prompt so I don't need to manually select knowledge objects.
- Free-text prompt field, no minimum required structure
- Prompt is sent to Weaviate semantic search to retrieve context
- Prompt is also sent as the user message to Claude

**GEN-3** — As a **content creator**, I want to optionally pin specific knowledge objects so I can override automatic retrieval when I already know exactly what context I want.
- Optional selectors for persona, segment, use case appear alongside the prompt
- Pinned objects are always included in context regardless of semantic score
- Semantic search supplements any un-pinned context slots

**GEN-4** — As a **marketing manager**, I want to see which knowledge objects Claude used as context so I can verify the output is grounded in approved company knowledge.
- After generation, the UI shows a "Context Used" panel with the retrieved objects
- Each displayed object shows its name and type with a link to its Knowledge Base detail view

**GEN-5** — As a **content creator**, I want to see the assembled system prompt that was sent to Claude so I can debug why the output feels off-brand or irrelevant.
- "View system prompt" is an optional expandable panel (collapsed by default)
- Shows the full context prompt template populated with retrieved content

**GEN-6** — As a **content creator**, I want Claude's response to stream to the screen in real time so I can start reading while it's still generating.
- Text appears incrementally as Claude streams tokens
- A loading/generating indicator is shown until the stream completes
- UI remains responsive during streaming

**GEN-7** — As an **SDR**, I want to generate a personalized outbound email for a Sales persona at an Enterprise account so my outreach is grounded in real pain points.
- Output includes a subject line, opening hook, value statement, and single CTA
- Length is 150–300 words per business logic spec

**GEN-8** — As a **content creator**, I want to save generated content to a library so I can find and reuse it later without regenerating.
- "Save" action stores the content in the `GeneratedContent` Weaviate collection
- Saved record includes: body, content type, prompt, status (`draft`), created date, and cross-references to all knowledge objects used

**GEN-9** — As a **content creator**, I want to regenerate content with the same context so I can get a different variation without re-entering my prompt.
- "Regenerate" button re-runs the same prompt and context
- Previous output is replaced or shown in a "previous version" slot

**GEN-10** — As a **content creator**, I want to edit my prompt and regenerate with updated context so I can iterate toward a better result.
- Prompt and pinned context are editable after generation
- Re-running a modified prompt triggers a new Weaviate semantic search

---

### Module 3: Content Library

Browse, search, and manage all content that has been generated or saved through the platform.

**Functional Requirements:**

- [ ] List all content pieces with metadata (type, date created, knowledge objects used, status)
- [ ] Filter by content type, date, status
- [ ] Full-text search across generated content
- [ ] View a single content piece with its generation metadata
- [ ] Edit and save revised versions
- [ ] Export content as plain text or markdown

**User Stories:**

**LIB-1** — As a **content creator**, I want to browse all previously generated content so I can find and reuse drafts without generating from scratch.
- List view shows title, content type, status, and date created
- Sorted by most recently created by default

**LIB-2** — As a **marketing manager**, I want to filter content by type and status so I can quickly find all approved emails or all draft blog posts.
- Filters for content type and workflow status can be combined

**LIB-3** — As a **content creator**, I want to full-text search across all generated content so I can find a piece I remember writing but can't locate by date.
- Search queries the `body` and `title` fields; results highlight matching terms

**LIB-4** — As a **content creator**, I want to open a saved content piece and see which knowledge objects were used to generate it so I understand why it reads the way it does.
- Detail view shows: prompt, content type, date, knowledge objects used (each a clickable link)

**LIB-5** — As a **content creator**, I want to edit a saved piece and save a revised version so I can polish AI-generated drafts without starting over.
- Edit mode loads the body into an editable field
- Saving increments `updatedAt` and preserves the original generation metadata
- Editing an `approved` piece resets status to `draft` per workflow rules

**LIB-6** — As a **content creator**, I want to export a content piece as plain text or markdown so I can paste it into our CMS, email tool, or doc editor.
- Export button downloads or copies the body in the selected format; no UI formatting artifacts included

---

### Module 4: Workflows

Move content through a structured editorial pipeline from draft to approved to published.

**Workflow States:**

```
draft → submitted → in_review → approved → published
                              ↓
                           rejected → draft (with reviewer comments)
```

| State | Description | Who Acts |
|---|---|---|
| `draft` | Content was generated or saved; not submitted for review | Creator |
| `submitted` | Creator has submitted for review | Creator |
| `in_review` | Assigned reviewer is reviewing | Reviewer |
| `approved` | Content has been approved | Reviewer |
| `rejected` | Rejected with comments; returned to draft | Reviewer |
| `published` | Approved content marked as live | Approver/Admin |

**Workflow Rules:**

- Content cannot move from `draft` directly to `approved` — it must pass through `in_review`
- Rejected content returns to `draft` with reviewer comments attached
- Approved content cannot be edited without resetting to `draft`

**Functional Requirements:**

- [ ] Submit content for review
- [ ] Assign reviewer
- [ ] Reviewer approves or rejects with comments
- [ ] Approved content is marked as published

**User Stories:**

**WF-1** — As a **content creator**, I want to submit a draft for review so that a reviewer can evaluate it before it goes anywhere public.
- "Submit for review" transitions status from `draft` → `submitted`
- Content becomes read-only to the creator after submission

**WF-2** — As a **marketing manager**, I want to assign a reviewer to a submitted piece so the right person is responsible for approving it.
- Reviewer assignment is recorded on the content object
- Assigned reviewer sees a queue of pieces awaiting their review

**WF-3** — As a **reviewer**, I want to approve a piece so it can be marked as ready for publishing.
- "Approve" transitions status from `in_review` → `approved`

**WF-4** — As a **reviewer**, I want to reject a piece with a comment so the creator knows what to fix before resubmitting.
- "Reject" requires a non-empty comment field
- Status transitions `in_review` → `rejected` → `draft`
- Comment is visible to the creator in the content detail view

**WF-5** — As a **content creator**, I want to see reviewer feedback on rejected content so I know exactly what to revise.
- Rejection comment is displayed prominently on the content detail view with reviewer name and timestamp

**WF-6** — As a **marketing manager**, I want to mark an approved piece as published so our team knows it's live.
- "Publish" transitions status from `approved` → `published`
- Published pieces cannot be edited without resetting to `draft`

---

## Phase 3+ — Backlog

Items below are recognized but not yet scheduled. They will be promoted to a phase when prioritized.

### Business Rules to Author

The following `business_rule` objects are planned but not yet created. They will be authored and added to Weaviate via the Knowledge Base UI.

| Rule | Description |
|---|---|
| Tone Guide | Defines overall brand voice — direct, confident, data-driven, human |
| Competitor Policy | How (or whether) to reference competitors by name |
| Claim Standards | Which claims require data backing vs. can be stated generally |
| CTA Standards | Approved CTA language and what to avoid |
| Prohibited Terms | Words or phrases to never use |

### Infrastructure & Integrations

| Item | Notes |
|---|---|
| Vercel deployment | Infrastructure is ready; deployment is a pending step after local dev is confirmed |
| Auth / RBAC | User authentication and role-based access — not needed for single-user internal tool in Phase 1. Groups J, K, L use API keys independently; integrate with RBAC when added. |
| External integrations | CRM, MAP, social platforms — future consideration. Groups J and K provide the programmatic access layer for building these integrations. |
| Databricks sync | Canonical account/segment data may already exist in Databricks; a sync pipeline (Databricks → Weaviate) could replace manual entry |
| MCP server hosting | Groups J and L require a long-running Node.js process (standalone from Vercel). Options: Railway, Fly.io, dedicated Vercel Fluid Compute. Decision needed before implementation. |
| API key management | Groups J, K, L all need API key auth. Phase 1: env vars. Future: shared `ApiKey` collection or external auth service. See Cross-Cutting Notes in Module 1 Build Plan. |
| Rate limiting infrastructure | Group K needs Upstash Redis or Vercel KV for serverless-compatible rate limiting. MCP server (J, L) implements in-process rate limiting. |

---

## Open Questions

| Question | Context |
|---|---|
| Embedding model | Weaviate Cloud's default vectorizer is used. If retrieval quality needs improvement, configure a specific model (e.g. `text-embedding-3-small` via OpenAI or `text2vec-google` for Gemini alignment) |
| Databricks integration | If canonical data (accounts, contacts, segments) already exists in Databricks, a sync pipeline may be more reliable than manual entry. Not in scope for Phase 1 |
| ICP definitions | `ICP` collection exists in Weaviate but no objects have been created yet. Requires persona × segment intersection definitions |

---

## Deferred: Event Logging & Audit Trails

> **Business decision:** Event logging, version history, relationship history, and audit trails are intentionally deferred. The value is understood but the overhead of designing, storing, and surfacing event data is not justified at the current stage. This decision should be revisited once the core knowledge base and content generation workflows are stable and in regular use.

The following capabilities were scoped and removed from the active build plan:

### Content Version History
Track every edit to a knowledge object's `content` field — who changed it, when, and what the previous value was. Enables "restore to previous version" functionality. Would require a dedicated `VersionHistory` collection in Weaviate or a separate data store.

### Relationship History
Track every cross-reference add and remove event — which objects were linked or unlinked, by whom, and when. Enables an "undo last relationship change" capability and a timeline view on each object's detail page. Would require a `RelationshipEvent` log stored outside Weaviate (Weaviate is not optimized for append-only event data).

### Workflow Audit Trail
Track every state transition in the content approval workflow — from state, to state, actor, timestamp. Enables a full accountability record for how a piece of content moved from draft to published. Referenced in WF-6 (removed from the active workflow stories).

### Recent Relationship Changes Dashboard
A "Recent Relationship Changes" panel in the manager dashboard showing the most recent cross-reference modifications across all objects. Depends on the Relationship History log above.

### When to Add This
Event logging becomes valuable when:
- Multiple people are actively editing the knowledge base and accountability is needed
- A bad edit or relationship change causes a content quality regression and recovery is needed
- Compliance or brand governance requirements demand a traceable record of who approved what

The preferred implementation when the time comes is a lightweight append-only log stored in Postgres (or a similar relational store), keeping Weaviate clean as the semantic retrieval layer only.
