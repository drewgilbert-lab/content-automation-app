# Content Engine — Product Requirements Document

> Last updated: February 2026
> Status: In development — Phase 1

---

## Product Vision

A single internal platform where company knowledge is stored, maintained, and used to generate strategically aligned content across all formats — powered by AI with human oversight.

---

## Modules

The application is organized into four modules. Modules 1 and 2 are Phase 1. Modules 3 and 4 are defined but not yet built.

```
Dashboard
├── 1. Knowledge Base    ← Manage company context (personas, segments, use cases, etc.)
├── 2. Generate          ← AI content generation using knowledge as context
├── 3. Content           ← Browse and manage all generated content  [future]
└── 4. Workflows         ← Approval and publishing pipeline          [future]
```

---

## Module 1: Knowledge Base

### Purpose
Store, view, create, edit, and delete the company knowledge objects that power all content generation. This is the source of truth for who we sell to, what problems we solve, and how we talk about our value.

### Knowledge Object Types

| Type | Description | Source Files |
|---|---|---|
| `persona` | Buyer personas by role/function | `content-automation/Octave/Library/Personas/` |
| `segment` | Account segments by size/profile | `content-automation/Octave/Library/Account Segments/` |
| `use_case` | Use cases and value scenarios | `content-automation/Octave/Library/Use Cases/` |
| `icp` | Ideal customer profile definitions | To be created |
| `business_rule` | Tone, brand, messaging constraints | To be created |

### Seed Data Inventory

**Personas (4)**
- Marketing
- RevOps
- Sales
- Strategy

**Account Segments (5)**
- Commercial Account Segment
- Enterprise Account Segment
- Mid-Market Account Segment
- SMB Account Segment
- Strategic Account Segment

**Use Cases (15)**
- AI-Driven Sales Plays
- B2B Data Enrichment For GTM Precision
- Competitor Analysis And Takeout
- High-Intent Lead Generation
- ICP Segmentation Refinement
- Inbound Marketing Automation
- Market Sizing
- Maximize ABM Performance
- Predictive Account Scoring
- Revenue Growth Intelligence Platform
- Signal-based Account Prioritization
- Territory Coverage Optimization
- Territory Planning and Optimization
- Voice-of-the-Customer Generation and Activation
- Whitespace Analysis And Activation

**Instruction Templates (2)**
- Campaign Brief Generator (`content-automation/content_transformation/campaign_brief_instructions.md`)
- Ops Configuration Guide Generator (`content-automation/content_transformation/ops_guide_instructions.md`)

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

### Content Types

| Type | Description | Typical Length |
|---|---|---|
| Email | Outbound or nurture email | 150–300 words |
| Blog Post | Long-form thought leadership | 800–1500 words |
| Social Post | LinkedIn or Twitter/X post | 50–280 characters |
| Thought Leadership | Opinion piece or industry insight | 500–1000 words |
| Internal Doc | Process documentation, briefs, guides | Variable |

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

## Module 3: Content Library (Future)

### Purpose
Browse, search, and manage all content that has been generated or saved through the platform.

### Functional Requirements (Defined, Not Built)

- [ ] List all content pieces with metadata (type, date created, knowledge objects used, status)
- [ ] Filter by content type, date, status
- [ ] Full-text search across generated content
- [ ] View a single content piece with its generation metadata
- [ ] Edit and save revised versions
- [ ] Export content as plain text or markdown

---

## Module 4: Workflows (Future)

### Purpose
Move content through a structured editorial pipeline from draft to approved to published.

### Workflow States

```
draft → submitted → in_review → approved → published
                              ↓
                           rejected → draft
```

### Functional Requirements (Defined, Not Built)

- [ ] Submit content for review
- [ ] Assign reviewer
- [ ] Reviewer approves or rejects with comments
- [ ] Approved content is marked as published
- [ ] Audit trail of all state transitions with timestamps and users

---

## Acceptance Criteria — Phase 1 Complete

Phase 1 is complete when:

1. Weaviate Cloud is connected and all credentials are in `.env.local`
2. All 24 seed knowledge objects (4 personas + 5 segments + 15 use cases) are imported into Weaviate
3. Knowledge Base UI allows viewing, creating, editing, and deleting objects
4. Generate UI produces streaming output from Claude using Weaviate-retrieved context
5. Generated content is saved to Weaviate with metadata
6. Dashboard shows green status for both Weaviate and Claude connections
