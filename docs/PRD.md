# Content Engine — Product Requirements Document

> Last updated: February 2026

---

## Modules

```
Dashboard
├── 1. Knowledge Base    ← Manage company context
├── 2. Generate          ← AI content generation using knowledge as context
├── 3. Content           ← Browse and manage generated content      [ROADMAP.md]
└── 4. Workflows         ← Approval and publishing pipeline          [ROADMAP.md]
```

Modules 1 and 2 are Phase 1. Modules 3 and 4 are defined in [ROADMAP.md](./ROADMAP.md).

---

## Module 1: Knowledge Base

### Purpose
Store, view, create, edit, and delete the company knowledge objects that power all content generation.

Knowledge object types and their roles are defined in [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md). Weaviate schema and seed data inventory are in [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md).

### Functional Requirements

- [ ] List all knowledge objects by type
- [ ] View a single knowledge object (full content rendered as markdown)
- [ ] Create a new knowledge object with name, type, content, and optional tags
- [ ] Edit an existing knowledge object
- [ ] Delete a knowledge object
- [ ] Filter objects by type
- [ ] Search objects by name or tag

### User Stories

**As a content creator**, I want to browse all personas so I can understand who we're writing for before generating content.

**As a marketing manager**, I want to edit a persona's pain points so the generated content reflects our current positioning.

**As a new team member**, I want to read our use case library so I understand the business problems we solve.

**As an admin**, I want to add a new business rule (e.g. "never mention competitor names directly") so all future generations respect that constraint.

---

## Module 2: Generate

### Purpose
Generate content for any format by selecting a content type, providing a brief prompt, and letting the system retrieve the most relevant knowledge objects as context for Claude.

Content type specs (structure, tone, context priority) are defined in [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md).

### Functional Requirements

- [ ] Select a content type
- [ ] Enter a generation prompt (e.g. "Write an outbound email for an Enterprise Sales persona about High-Intent Lead Generation")
- [ ] System automatically retrieves relevant knowledge objects from Weaviate based on the prompt
- [ ] Display which knowledge objects were used as context (transparency)
- [ ] Stream Claude's response to the UI in real time
- [ ] Save generated content to the Content library with metadata (type, date, knowledge objects used)
- [ ] Allow user to regenerate with the same or modified context

### User Stories

**As a content creator**, I want to generate a blog post about ICP segmentation so I have a strong first draft in seconds rather than hours.

**As an SDR**, I want to generate a personalized outbound email for a Sales persona at an Enterprise account so my outreach is grounded in real pain points.

**As a marketing manager**, I want to see which knowledge objects Claude used so I can verify the output is based on approved company context.

---

## Module 1 Extensions: Bulk Upload, Enhanced Review, Skills

> These features extend the Knowledge Base module. Full technical scope and risks are in [ROADMAP.md](./ROADMAP.md) Groups G, H, and I.

### Bulk Upload with AI Classification (Group G)

#### Purpose
Upload multiple documents at once, have the system parse and classify each into the correct knowledge object type using AI, then review and approve before routing to the admin review queue.

#### Functional Requirements

- [ ] Upload multiple files (Markdown, PDF, DOCX, plain text) via drag-and-drop or file picker
- [ ] Parse each document and extract text content
- [ ] Classify each document into a knowledge object type using Claude AI
- [ ] Suggest name, tags, and relationships for each document
- [ ] Display confidence scores for each classification
- [ ] Allow the uploader to review, edit, and correct classifications one-by-one
- [ ] Provide "Accept All" and "Accept Selected" bulk approval actions
- [ ] Route approved documents to the existing admin review queue as submissions

#### User Stories

**BU-1** — As a **marketing manager**, I want to upload a folder of persona documents at once so I don't have to create each knowledge object manually.
- Drag-and-drop zone accepts multiple files
- File list shows name, size, and format before processing
- Progress indicator during classification

**BU-2** — As a **content creator**, I want the system to automatically detect what type of document I uploaded so I don't have to classify each one myself.
- AI classification returns object type, name, and tags
- Confidence score displayed per document
- Low-confidence items (below 0.7) are flagged for review

**BU-3** — As a **marketing manager**, I want to review all classified documents before they enter the review queue so I can catch any misclassifications.
- Review list shows each document with editable type, name, tags, and relationships
- Expandable preview shows parsed content
- Individual edit, remove, and reclassify actions available

**BU-4** — As a **marketing manager**, I want to accept all correctly classified documents at once so I can move quickly through large batches.
- "Accept All" approves all documents in one action
- "Accept Selected" approves only checked items
- Each approved document becomes a submission in the review queue

**BU-5** — As an **admin**, I want bulk-uploaded documents to appear in the normal review queue so I review them with the same workflow as any other submission.
- Bulk upload submissions appear in `/queue` with `submissionType: "new"`
- Submissions include AI-suggested relationships in the proposed content
- Admin accepts, rejects, or defers using existing review actions

---

### Enhanced Change Review Workflows (Group H)

#### Purpose
Improve how document changes are reviewed in the admin queue: (1) allow uploading a document to supplement an existing knowledge object via AI merge, and (2) add visual diff highlighting for manual edits.

#### Functional Requirements

- [ ] Upload a document to add content to an existing knowledge object
- [ ] AI merges uploaded document content into the existing object
- [ ] Document additions route through the review queue with tracked changes
- [ ] Manual edits display a visual diff with additions (green) and deletions (red strikethrough)
- [ ] Toggle between unified and side-by-side diff views
- [ ] Collapse unchanged sections in long diffs

#### User Stories

**CR-1** — As a **content creator**, I want to upload a new research document to an existing persona so the persona's content is enriched without me manually editing it.
- "Add Document" button on the knowledge detail page
- Upload form accepts a single file (Markdown, PDF, DOCX, TXT)
- System creates a submission that routes to the admin review queue

**CR-2** — As an **admin**, I want to see exactly what the AI changed when it merged a new document into an existing object so I can verify the merge quality.
- Review queue shows old version vs. AI-merged version
- Tracked changes: additions in green, deletions in red with strikethrough
- Admin can edit the merged version before accepting

**CR-3** — As an **admin**, I want to see a clear visual diff when a contributor manually edits a knowledge object so I can quickly understand what changed.
- Diff highlighting replaces the current static side-by-side comparison
- Additions highlighted in green, deletions in red with strikethrough
- Toggle between unified view (single panel) and side-by-side view

**CR-4** — As an **admin**, I want to collapse unchanged sections in a long diff so I can focus on what actually changed.
- Unchanged sections collapse by default when the diff is long
- "Show unchanged" toggle expands collapsed sections
- Line counts indicate how many unchanged lines are hidden

---

### Skills Module (Group I)

#### Purpose
Separate procedural task instructions ("Skills") from passive constraints ("Business Rules"). Skills are active, task-specific instructions that tell the AI how to perform specific types of work. Business rules remain as broad constraints (tone, what not to say).

#### Functional Requirements

- [ ] Create, view, edit, and delete skills
- [ ] Activate and deactivate individual skills
- [ ] Assign skills to specific content types
- [ ] Include active skills in the content generation system prompt
- [ ] Version skills with rollback capability
- [ ] Migrate existing `instruction_template` BusinessRules to Skills
- [ ] Detect and warn about conflicting skills

#### User Stories

**SK-1** — As an **admin**, I want to create a skill that defines how to write a campaign brief so the AI follows a specific structure every time.
- Skill creation form with name, description, instruction content (markdown), and content type assignment
- Markdown editor with preview
- Activation toggle (default: active)

**SK-2** — As a **content creator**, I want the system to automatically apply the right skills when I select a content type so I don't have to remember which instructions exist.
- Skills auto-selected based on content type match
- Selected skills displayed in generation UI
- User can add or remove skills before generating

**SK-3** — As an **admin**, I want to deactivate a skill without deleting it so I can temporarily remove it from content generation.
- Active/inactive toggle on the skill detail page and in the list view
- Inactive skills are not included in context assembly
- Inactive skills remain visible and editable

**SK-4** — As an **admin**, I want to see which content was generated using a specific skill so I can evaluate the skill's effectiveness.
- Skill detail page shows usage count
- Generated content records which skills were used (cross-reference)

**SK-5** — As an **admin**, I want to roll back a skill to a previous version if a new version produces poor results.
- Version history with semantic versioning
- Previous version linked via `previousVersionId`
- One-click rollback restores the prior version's content

**SK-6** — As an **admin**, I want to be warned if two active skills conflict with each other so I can resolve contradictions before they affect content quality.
- Skills declare conflicts via `conflictsWith` field
- UI shows a warning banner when conflicting skills are both active
- Conflict resolution: admin deactivates one or edits to resolve

---

## Module 1 Extensions: External Access (Groups J, K, L)

> These features extend the Knowledge Base with programmatic access for external tools and LLMs. Full technical scope and risks are in [ROADMAP.md](./ROADMAP.md) Groups J, K, and L. Cross-cutting architecture notes (consolidation, shared auth) are in the ROADMAP.md Cross-Cutting Notes section.

### Inbound MCP Server for 3rd Party Write Access (Group J)

#### Purpose
Allow external applications (automation workflows, Slack bots, custom scripts, AI agents) to push knowledge content into the Content Engine via the Model Context Protocol. All inbound content routes through the existing review queue.

#### Functional Requirements

- [ ] Expose an MCP server with tools for creating and updating knowledge objects
- [ ] Provide read-only discovery tools (list types, search, get object) for MCP clients
- [ ] Route all write operations through the Submission system (never write to Weaviate directly)
- [ ] Track submission source (channel, app ID, description) for audit and filtering
- [ ] Authenticate external apps via API keys with per-key identification
- [ ] Display source badges and source channel filter in the review queue UI

#### User Stories

**MCP-1** — As a **workflow builder**, I want to configure an n8n workflow that pushes competitive intelligence into the Content Engine so insights are captured automatically without manual copy-paste.
- Workflow calls MCP `create_knowledge_object` tool with content and metadata
- Submission enters the review queue with source badge showing the workflow name
- Admin reviews, accepts, or rejects using the existing queue UI

**MCP-2** — As a **Slack bot developer**, I want the bot to call `search_knowledge_objects` before proposing a new object so it can check whether similar content already exists.
- MCP read tools return existing objects with relevance scores
- Bot warns the user if a similar object is found (score > 0.9) before submitting

**MCP-3** — As an **admin**, I want to see which submissions came from external tools vs. the web UI so I can prioritize and filter my review queue.
- Queue list shows source badge (UI / MCP / Bulk Upload) on each item
- Filter dropdown allows selecting by source channel
- Submission detail shows full source metadata (app ID, description)

**MCP-4** — As an **admin**, I want to deactivate an API key for a misbehaving external tool so I can stop it from flooding the review queue.
- API keys can be deactivated via environment variable update
- Deactivated keys receive authentication errors on all tool calls

**MCP-5** — As an **external tool developer**, I want to check the status of a submission I created so I can confirm whether it was accepted, rejected, or is still pending.
- `check_submission_status` tool returns current status and reviewer comment if rejected

**MCP-6** — As an **AI agent**, I want to read an existing knowledge object's full content before proposing an update so my proposed changes are informed by the current state.
- `get_knowledge_object` tool returns full content, metadata, and cross-references
- Agent can compare current content with new information before calling `update_knowledge_object`

---

### External REST API for 3rd Party Read Access (Group K)

#### Purpose
Provide a versioned, read-only REST API that allows other internal applications to query knowledge objects programmatically without sharing raw Weaviate credentials.

#### Functional Requirements

- [ ] Expose read-only REST endpoints under `/api/v1/` with API key authentication
- [ ] Support listing, detail retrieval, and semantic search across knowledge objects
- [ ] Return versioned response schemas decoupled from Weaviate internal structure
- [ ] Filter deprecated objects by default
- [ ] Resolve cross-references to human-readable names and types
- [ ] Rate limit requests to prevent abuse
- [ ] Provide an unauthenticated health endpoint for monitoring

#### User Stories

**API-1** — As a **developer**, I want to query all personas from another internal application so I can personalize content recommendations using our canonical persona definitions.
- `GET /api/v1/knowledge?type=persona` returns all active personas with metadata
- Response includes `id`, `name`, `tags`, `createdAt`, `updatedAt`
- Full content available via the detail endpoint

**API-2** — As a **chatbot developer**, I want to run a semantic search against the knowledge base so my chatbot can find the most relevant use cases for a user's question.
- `GET /api/v1/knowledge/search?q=territory+planning&type=use_case` returns ranked results
- Each result includes a relevance score and content snippet (first 500 chars)

**API-3** — As a **BI engineer**, I want to pull knowledge base health metrics into a Grafana dashboard so I can monitor object counts and staleness trends over time.
- `GET /api/v1/health` returns collection counts and Weaviate connection status
- Unauthenticated access enables automated monitoring without key management

**API-4** — As a **developer**, I want versioned API responses so a Weaviate schema change doesn't break my integration.
- API responses are shaped by TypeScript types in the application, not raw Weaviate output
- API version prefix (`/v1/`) ensures backward compatibility; breaking changes go to `/v2/`

**API-5** — As an **admin**, I want to see rate limit headers on API responses so I can configure consumers to respect throttling.
- Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- `429 Too Many Requests` returned when limit is exceeded with a `retryAfter` value

---

### MCP Server for LLM Read Access — RAG Interface (Group L)

#### Purpose
Build an MCP server that LLMs (Claude Desktop, Claude Code, Cursor, Gemini) can connect to for direct read access to the knowledge base. Enables using the knowledge store as a RAG system from any AI conversation. Future: write access through the review queue.

#### Functional Requirements

- [ ] Expose an MCP server with tools for listing, searching, and retrieving knowledge objects
- [ ] Support semantic search across all collections via Weaviate `nearText`
- [ ] Expose cross-reference relationships (outbound and inbound) for any object
- [ ] Provide knowledge base health metrics and schema information
- [ ] Support stdio transport (Claude Desktop/Code/Cursor) and SSE transport (Gemini, remote access)
- [ ] Return LLM-optimized responses with content truncation to manage context window size
- [ ] Expose MCP resources for knowledge base orientation (overview, relationship map, collection summaries)

#### User Stories

**RAG-1** — As a **user in Claude Desktop**, I want to ask "What personas do we have?" and get an answer grounded in our actual knowledge base so I don't have to open the Content Engine UI.
- Claude calls `list_objects({ type: "persona" })` and `get_object` for each
- Response synthesizes persona names, roles, and key pain points from the knowledge base

**RAG-2** — As a **user in Claude Code**, I want to search for knowledge related to a topic so the AI can find relevant company context while I'm working.
- Claude calls `search_objects({ query: "predictive scoring" })` using Weaviate semantic search
- Results ranked by vector similarity with relevance scores and content snippets

**RAG-3** — As a **user in Claude Desktop**, I want to explore how knowledge objects are connected so I understand which personas map to which segments and use cases.
- Claude calls `get_relationships({ id: "<persona-id>" })` to retrieve outbound and inbound links
- Response shows linked segments, use cases, and any other cross-referenced objects

**RAG-4** — As a **user in Cursor**, I want the Content Engine MCP server available alongside my other MCP tools so I can reference company knowledge while writing code or documentation.
- Server configured in `.cursor/mcp.json` using stdio transport
- Tools appear in Cursor's MCP tool list; invokable naturally in conversation

**RAG-5** — As a **user in any MCP-compatible LLM**, I want to get a health summary of the knowledge base so I know if objects are stale or relationships are missing.
- LLM calls `get_dashboard_health()` and receives aggregated counts
- Response includes total objects, stale count, never-reviewed count, and gap summary

**RAG-6** — As a **user in Claude Desktop** (future, Phase 2), I want to propose a new knowledge object or update an existing one from my conversation so I can contribute knowledge without switching to the web UI.
- LLM calls `create_object` or `update_object` write tools
- MCP server creates a Submission routed through the review queue
- Admin reviews via the existing queue UI at `/queue`
