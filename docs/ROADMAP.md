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

### Group D — Health Dashboard

**D1 — Dashboard data API**
Build `GET /api/dashboard` route. Returns:
- Object count per collection type
- Objects with `updatedAt === createdAt` (never reviewed)
- Objects not updated in 90+ days (stale)
- Relationship gap analysis:
  - Objects with zero cross-references
  - Objects with partial relationships by type (e.g. UseCase with no linked Personas)
  - Asymmetric relationships (A→B exists but B→A does not)
  - ICPs missing persona or segment reference
  - BusinessRules with no `subType`

**D2 — Dashboard page**
Render the manager health dashboard at `/dashboard` (or as the Knowledge Base landing page). Sections: health summary (counts + flags), relationship gap report (gap category, object name, "Fix" CTA linking to that object's relationship panel), staleness report (sorted list with "Never reviewed" / "Stale" labels). Queue badge showing pending submission count.

---

### Group E — Review Queue

**E1 — Submission API**
Build `POST /api/submissions` route. Accepts: `objectType`, `proposedContent`, optional `targetObjectId` (if updating an existing object), submitter identifier. Stores the submission as a pending record (not yet written to Weaviate). Returns submission ID and status `pending`.

**E2 — Queue list API**
Build `GET /api/submissions` route. Returns all pending submissions with: submitter, object name, object type, submission type (new / update / relationship change), submitted date. Supports filter by submission type.

**E3 — Queue review API**
Build `POST /api/submissions/[id]/review` route. Accepts action: `accept`, `reject` (requires comment), `defer` (optional note). Accept writes to Weaviate and closes the submission. Reject records the comment and closes. Defer leaves it open with a note.

**E4 — Queue UI**
Render the review queue at `/queue`. List of pending items with filter by type. Clicking an item opens:
- For new object submissions: full content preview, Accept / Reject / Defer actions
- For update submissions: side-by-side diff (current vs. proposed), Accept / Trigger AI Merge / Reject actions

**E5 — Connector/User submission flow**
When a Connector or User saves a create or edit form, route the save through E1 (submission) instead of directly to Weaviate. Show a "Pending review" status on the submitted object. User and Connector cannot directly write to the live knowledge base.

---

### Group F — AI Merge Workflow

**F1 — Merge API**
Build `POST /api/submissions/[id]/merge` route. Fetches the current live version of the target object and the proposed content from the submission. Sends both to Claude with a merge system prompt: "Given the current version and a proposed update, produce a single best-version document that preserves all accurate information from both. Return the merged document only." Streams or returns the merged text.

**F2 — Tracked-changes diff**
On the client, compute a character-level diff between the current version and the AI-merged result. Render: added text in green, removed text as red strikethrough, unchanged text as normal. The diff view is a live editor — edits update the diff highlighting in real time.

**F3 — Merge review UI**
Accessible from the Queue review panel (E4) via "Merge with AI" button. Calls F1, renders the tracked-changes diff (F2) in a full-page editor. Actions: "Save" (commits the merged result to Weaviate and closes the queue item) or "Discard" (returns to the side-by-side review panel).

---

## Phase 1 — Foundation (Current)

### Remaining Work

| Module | What's Left | Requirements |
|---|---|---|
| Knowledge Base UI | Relationship management (Group C), health dashboard (Group D), review queue (Group E) | See [PRD.md](./PRD.md) Module 1 |
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
| Auth / RBAC | User authentication and role-based access — not needed for single-user internal tool in Phase 1 |
| External integrations | CRM, MAP, social platforms — future consideration |
| Databricks sync | Canonical account/segment data may already exist in Databricks; a sync pipeline (Databricks → Weaviate) could replace manual entry |

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
