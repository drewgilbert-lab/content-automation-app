# Content Engine — Roadmap

> Last updated: February 2026

This is the single source of truth for future plans, phased delivery, deferred scope, and open questions.

---

## Phase 1 — Foundation (Current)

### Remaining Work

| Module | What's Left | Requirements |
|---|---|---|
| Knowledge Base UI | CRUD interface for all knowledge object types | See [PRD.md](./PRD.md) Module 1 |
| Generate UI | Content generation with Weaviate context retrieval + Claude streaming | See [PRD.md](./PRD.md) Module 2 |

### Acceptance Criteria

Phase 1 is complete when:

1. Weaviate Cloud is connected and all credentials are in `.env.local` — **Done**
2. All 24 seed knowledge objects (4 personas + 5 segments + 15 use cases) are imported into Weaviate — **Done**
3. Knowledge Base UI allows viewing, creating, editing, and deleting objects
4. Generate UI produces streaming output from Claude using Weaviate-retrieved context
5. Generated content is saved to Weaviate with metadata
6. Dashboard shows green status for both Weaviate and Claude connections

---

## Phase 2 — Content Management

### Module 3: Content Library

Browse, search, and manage all content that has been generated or saved through the platform.

**Functional Requirements:**

- [ ] List all content pieces with metadata (type, date created, knowledge objects used, status)
- [ ] Filter by content type, date, status
- [ ] Full-text search across generated content
- [ ] View a single content piece with its generation metadata
- [ ] Edit and save revised versions
- [ ] Export content as plain text or markdown

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
- A content piece retains all previous versions when edited after rejection
- Approved content cannot be edited without resetting to `draft`

**Functional Requirements:**

- [ ] Submit content for review
- [ ] Assign reviewer
- [ ] Reviewer approves or rejects with comments
- [ ] Approved content is marked as published
- [ ] Audit trail of all state transitions with timestamps and users

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
