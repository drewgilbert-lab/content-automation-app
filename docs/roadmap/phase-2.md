> Back to [Roadmap Index](./README.md)

# Phase 2 — Content Management

## Module 2: Generate

Generate content for any format by selecting a content type, providing a brief prompt, and letting the system retrieve the most relevant knowledge objects as context for Claude. Content type specs (structure, tone, context priority) are defined in [BUSINESS_LOGIC.md](../BUSINESS_LOGIC.md).

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

## Module 3: Content Library

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

## Module 4: Workflows

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

## Module 5: External Content Ingestion

> Scope: The Content Library accepts content from multiple channels — not just the in-app Generate UI. Users working in Claude Desktop, Cursor, or other MCP-compatible tools can push finished content directly into the library. Automation workflows and REST API consumers can do the same. All externally submitted content enters as `draft` and goes through the Module 4 editorial workflow. No separate content review queue is needed — the editorial pipeline is the quality gate.
> Dependencies: Module 3 (Content Library) and Module 4 (Workflows) must be built first. MCP tools depend on [Group J](./group-j.md) Phase 7. REST API endpoints depend on [Group K](./group-k.md) Phase 3.

### Why This Matters

The Generate UI (Module 2) is one way to create content, but not the only way content gets created. Marketing teams draft content in Claude Desktop conversations, SDRs iterate on emails in Cursor, and automation workflows produce content from templates. Without an ingestion path, all of that content lives outside the system — untracked, unreviewed, and disconnected from the knowledge base.

External content ingestion turns the Content Library into a **platform** rather than a single-app feature. The same editorial workflow (Module 4) that governs in-app generated content also governs externally submitted content, so quality standards are enforced regardless of source.

### Source Channels

| Channel | `sourceChannel` value | Entry Point | Auth |
|---|---|---|---|
| Generate UI (Module 2) | `generate_ui` | In-app generation flow | Session auth |
| Direct Upload UI | `direct_upload` | Content Library "Submit Content" action | Session auth |
| MCP Server | `mcp` | `submit_content` tool ([Group J](./group-j.md) J27) | API key (mcp-content-write scope) |
| REST API | `api` | `POST /api/v1/content` ([Group K](./group-k.md) K14) | API key (X-API-Key header) |
| Bulk Content Import | `bulk_import` | Batch upload of markdown files | Session auth |

### Design Decisions

**No submission review queue for content.** Knowledge Base writes go through the `Submission` review queue because knowledge objects are shared, long-lived source-of-truth records. Content pieces are individual drafts owned by their creator. The Module 4 editorial workflow (draft → submitted → in_review → approved → published) already provides the review gate. Adding a separate review queue would create unnecessary friction.

**Source provenance on `GeneratedContent`.** The `GeneratedContent` collection gains `sourceChannel`, `sourceAppId`, and `sourceDescription` fields — the same provenance pattern used on `Submission` records (J10). This enables filtering and auditing by source.

**Content type validation on ingest.** External submissions must specify a valid `contentType` from the canonical list. Invalid types are rejected with a descriptive error. This prevents the library from accumulating untyped or mistyped content.

**Optional knowledge object linking.** External submissions can optionally declare which knowledge objects informed the content (persona, segment, use cases). These are stored as cross-references on `GeneratedContent`, identical to how the Generate UI records context. If omitted, the cross-references are left empty.

### Functional Requirements

- [ ] Accept content directly in the Content Library UI without going through the Generate flow
- [ ] Accept content via MCP `submit_content` tool from any MCP-compatible client
- [ ] Accept content via REST API `POST /api/v1/content` from automation workflows
- [ ] Accept bulk content import from markdown files
- [ ] Track source provenance (channel, app ID, description) on every content piece
- [ ] Display source badges and source filter in the Content Library list view
- [ ] Validate `contentType` on all external submissions
- [ ] Support optional knowledge object linking on external submissions

### User Stories

**EXT-1** — As a **content creator**, I want to submit existing content directly into the Content Library so I can track and manage content I wrote outside the app.
- "Submit Content" action on the Content Library page opens a form with: title, content type (dropdown), body (markdown editor with preview), optional tags
- Submitted content enters as `draft` with `sourceChannel: "direct_upload"`
- No generation prompt or knowledge object context is required

**EXT-2** — As a **content creator working in Claude Desktop**, I want to push content I've drafted in a Claude conversation into the Content Library so it enters the editorial workflow without copy-pasting.
- Claude calls the MCP `submit_content` tool with body, content type, and optional metadata
- Content appears in the Content Library as `draft` with `sourceChannel: "mcp"` and the `sourceAppId` from the authenticated API key
- The MCP tool returns the content ID and status for confirmation

**EXT-3** — As a **marketing ops engineer**, I want to push content from automation workflows via the REST API so templated or AI-generated content from external tools enters the editorial pipeline.
- `POST /api/v1/content` accepts `body`, `contentType`, `title`, optional `tags`, optional knowledge object IDs, and optional `sourceDescription`
- Response returns `{ data: { id, status: "draft", sourceChannel: "api" } }`
- Source provenance auto-populated from the authenticated API key

**EXT-4** — As a **marketing manager**, I want to see where a content piece originated so I can assess whether it needs more review.
- Content detail page shows a source badge (e.g. "MCP — claude-desktop", "Direct Upload", "Generated")
- `sourceDescription` displayed if present (e.g. "Drafted during Q3 campaign planning session")

**EXT-5** — As a **marketing manager**, I want to filter the Content Library by source channel so I can review all externally submitted content separately from in-app generated content.
- Filter dropdown in Content Library list view with options: All, Generated, Direct Upload, MCP, API, Bulk Import
- Filter combines with existing content type and status filters

**EXT-6** — As a **system**, I want to validate content type on all external submissions so the library maintains consistent categorization.
- MCP `submit_content` and REST `POST /api/v1/content` reject submissions with invalid `contentType` values
- Error response includes the list of valid content types
- Valid types sourced from the canonical `CONTENT_TYPES` list in `lib/skill-types.ts`

**EXT-7** — As a **content creator**, I want to optionally link knowledge objects when submitting external content so the Content Library tracks which personas, segments, and use cases informed the piece.
- Direct Upload form, MCP tool, and REST API all accept optional knowledge object IDs: `personaId`, `segmentId`, `useCaseIds[]`
- Linked objects are stored as cross-references on `GeneratedContent` (same as Generate UI)
- If omitted, cross-references are empty — linking is not required

**EXT-8** — As a **content creator**, I want to bulk import content from markdown files so I can migrate existing content into the library without submitting each piece individually.
- Bulk import page accepts multiple `.md` files
- Each file requires a YAML frontmatter block with `title` and `contentType`; optional `tags` and `sourceDescription`
- All imported content enters as `draft` with `sourceChannel: "bulk_import"`
- Import summary shows success/failure count per file

### Risks and Gaps

| Risk | Impact | Mitigation |
|---|---|---|
| External content quality varies widely | Low-quality content clutters the library | Editorial workflow (Module 4) is the quality gate; reviewers can reject |
| No duplicate detection on content submissions | Same content submitted multiple times from different channels | Defer to Phase 2+ hardening; manual detection by reviewers initially |
| Bulk import YAML frontmatter errors | Files without valid frontmatter fail silently | Validate frontmatter before import; show per-file error messages |
| MCP content tools increase attack surface | Unauthorized content pushed into library | Permission scoping (mcp-content-write); all content enters as draft, never published directly |
| Content submitted without knowledge object links | Loss of context traceability | Links are optional by design; Generate UI content always has links; external content may not |
