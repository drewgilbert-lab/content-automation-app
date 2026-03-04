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
