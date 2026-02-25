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
