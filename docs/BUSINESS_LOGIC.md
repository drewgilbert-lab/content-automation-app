# Content Engine — Business Logic

> Last updated: February 2026

This document defines the rules that govern how knowledge is stored, how context is assembled, and how content is generated. It is the reference for all AI generation behavior at runtime.

---

## Knowledge Object Types

Eight types of knowledge objects are stored in Weaviate. Each type has a distinct role in the context assembly process.

| Type | Role | Examples |
|---|---|---|
| `persona` | Who we are selling to — their goals, pain points, responsibilities, and language | Sales, Marketing, RevOps, Strategy |
| `segment` | Which companies we target — firmographic profile, qualification criteria | Enterprise, Mid-Market, SMB, Commercial, Strategic |
| `use_case` | What business problems we solve — scenarios, benefits, business drivers | High-Intent Lead Generation, ICP Segmentation Refinement |
| `icp` | The intersection of persona and segment — the ideal buyer profile | To be defined |
| `business_rule` | Passive constraints and guidelines that apply to all content — tone, brand, what not to say | Tone Guide, Competitor Policy, Prohibited Terms |
| `skill` | Active procedural instructions for specific tasks — how to structure and generate specific content types | Campaign Brief Generator, Ops Configuration Guide |
| `competitor` | Competitive intelligence about rival products and companies — injected when generating competitive content such as battlecards, positioning, and objection responses | Competitor strengths/weaknesses, pricing, positioning |
| `customer_evidence` | Customer proof points and named references — injected to ground claims in real customer outcomes; subTypes: `proof_point` (quantified results) and `reference` (named customers/quotes) | "Customer reduced churn by 30%", Named customer quote |

---

## Source of Truth

- **Weaviate** is the live, queryable source of truth for all knowledge
- **`content-automation/`** folder is the seed source — a one-time import populates Weaviate; after that, Weaviate is the system of record
- Edits made in the application write back to Weaviate directly
- The `content-automation/` markdown files are not consulted at runtime

---

## Skills vs Business Rules

Skills and business rules both influence AI generation, but they serve different roles in the system prompt.

| Attribute | Business Rule | Skill |
|---|---|---|
| Nature | Passive constraint | Active procedural instruction |
| When applied | Always included (when active and not deprecated) | Conditionally selected by content type or manual choice |
| Prompt placement | "Constraints" section | "Instructions" section (before constraints) |
| Scope | Broad, cross-cutting — applies to all content types | Task-specific — applies to one or a few content types |
| Format | "Don't mention competitors by name" / "Use confident, data-driven tone" | "Step 1: Extract the key metrics. Step 2: Structure the brief as..." |
| Examples | Tone Guide, Competitor Policy, Claim Standards, CTA Standards, Prohibited Terms | Campaign Brief Generator, Ops Configuration Guide, Email Writing Skill |

**Business rules** define what NOT to do and the general tone/brand voice. They are always injected into the system prompt for every generation request, regardless of content type.

**Skills** define HOW to do a specific task. They are selected based on the content type being generated (automatic) or by the user (manual), and are injected as the primary instructions the AI should follow.

Skills must still respect business rules. In the assembled prompt, skills appear before business rules so the AI receives task-specific instructions first, then constraints that apply universally.

Current state: Two `BusinessRule` objects with `subType: "instruction_template"` (Campaign Brief Generator, Ops Configuration Guide) are actually skills and will be migrated to the `Skill` collection. See [ROADMAP.md](./ROADMAP.md) Group I for the migration plan.

---

## Context Assembly Logic

When a user requests content generation, the system assembles a context package before calling Claude. This is how raw knowledge becomes a useful system prompt.

### Step-by-step

```
1. User submits a generation request
   (e.g. "Write an outbound email for Sales persona at Enterprise accounts about High-Intent Lead Generation")

2. System performs semantic search in Weaviate
   → Query: the user's prompt
   → Collections searched: persona, segment, use_case, business_rule
   → Returns top N objects ranked by semantic relevance

3. System assembles a structured system prompt
   → Persona section: who the reader is, their pain points, their language
   → Segment section: firmographic context, qualification criteria
   → Use case section: the business problem, benefits, scenarios
   → Business rules: constraints, tone guidelines, what to avoid

4. System calls Claude with:
   → system: assembled context prompt
   → user: the generation request

5. Claude streams the response

6. Generated content is saved with metadata:
   → content type
   → generation date
   → knowledge objects used (IDs)
   → raw prompt
```

### Context Prompt Template Structure

Current template (without skills):

```
You are a B2B content writer creating [CONTENT_TYPE] for [COMPANY_NAME].

## Target Persona
[Persona content from Weaviate]

## Target Account Segment
[Segment content from Weaviate]

## Use Case / Topic
[Use case content from Weaviate]

## Business Rules
[Applicable business rules from Weaviate]

Use the above context to write content that is accurate, on-brand, and directly relevant to the persona's real pain points and goals.
```

Updated template (with skills — planned, Group I):

```
You are a B2B content writer creating [CONTENT_TYPE] for [COMPANY_NAME].

## Active Skills
### Skill: [Skill Name] (v[version])
[Skill instruction content from Weaviate]

## Target Persona
[Persona content from Weaviate]

## Target Account Segment
[Segment content from Weaviate]

## Use Case / Topic
[Use case content from Weaviate]

## Business Rules (Constraints)
[Applicable business rules from Weaviate — tone, what not to say]

Follow the Active Skills above to structure and format your output.
Respect all Business Rules for tone and constraints.
Use the Persona, Segment, and Use Case context to inform your content.
```

Skill selection logic:
1. **Automatic**: Query active skills where `contentType` includes the requested content type
2. **Manual**: User selects skills from a picker in the generation UI
3. **Hybrid** (recommended): Auto-select by content type, user can add/remove before generating
4. **Limit**: Max 3–5 active skills per generation to manage context window size

Implementation: `lib/context-assembly.ts` (planned) will replace the inline prompt construction in the generation route.

---

## Content Types

### Email
- **Purpose:** Outbound prospecting or nurture
- **Length:** 150–300 words
- **Structure:** Subject line, opening hook, value statement tied to a pain point, single CTA
- **Context priority:** Persona (primary), Segment (secondary), Use Case (topic)
- **Tone:** Direct, empathetic, concise

### Blog Post
- **Purpose:** Thought leadership, SEO, nurture
- **Length:** 800–1,500 words
- **Structure:** H1 title, intro, 3–5 H2 sections, conclusion with CTA
- **Context priority:** Use Case (primary), Persona (audience lens), Segment (examples)
- **Tone:** Authoritative, educational, conversational

### Social Post
- **Purpose:** LinkedIn or Twitter/X engagement
- **Length:** 50–280 characters (Twitter) or 150–700 characters (LinkedIn)
- **Structure:** Hook line, 2–3 supporting lines, optional CTA or hashtags
- **Context priority:** Use Case (topic), Persona (audience)
- **Tone:** Punchy, human, insight-driven

### Thought Leadership
- **Purpose:** Executive byline, industry perspective
- **Length:** 500–1,000 words
- **Structure:** Strong opening claim, supporting evidence, counterpoint acknowledgment, call to action
- **Context priority:** Use Case (primary), Business Rules (tone), Persona (audience)
- **Tone:** Confident, strategic, forward-looking

### Internal Doc
- **Purpose:** Process documentation, campaign briefs, ops guides
- **Length:** Variable
- **Structure:** Depends on template (see Campaign Brief and Ops Guide instruction files)
- **Context priority:** Instruction template (primary), all other context as needed
- **Tone:** Clear, structured, actionable

---

## Knowledge Object Relationships

These relationships define which knowledge types are most relevant for each content type and how they inform each other.

```
persona ──────────────────────────► email (primary)
persona ──────────────────────────► social post (audience lens)
persona ──────────────────────────► blog post (audience lens)

segment ──────────────────────────► email (firmographic context)
segment ──────────────────────────► blog post (example accounts)

use_case ─────────────────────────► blog post (primary topic)
use_case ─────────────────────────► email (value statement topic)
use_case ─────────────────────────► thought leadership (primary topic)

business_rule ────────────────────► all content types (constraints)

skill ────────────────────────────► matched content types (instructions)

icp = persona ∩ segment ──────────► all content types (targeting precision)

competitor ───────────────────────► competitive content (battlecards, positioning, objection handling)

customer_evidence ────────────────► all content types (grounding claims in real outcomes)
```

### Cross-Reference Map

| Persona | Likely Segments | Most Relevant Use Cases |
|---|---|---|
| Sales | Enterprise, Strategic, Mid-Market | High-Intent Lead Generation, Competitor Analysis, Territory Planning |
| Marketing | Enterprise, Mid-Market, Commercial | ICP Segmentation, Inbound Marketing Automation, Signal-based Prioritization |
| RevOps | Enterprise, Mid-Market | Predictive Account Scoring, Territory Coverage Optimization, B2B Data Enrichment |
| Strategy | Strategic, Enterprise | Market Sizing, Whitespace Analysis, Revenue Growth Intelligence Platform |

---

Workflow states and planned business rules are defined in [ROADMAP.md](./ROADMAP.md).

---

## Instruction Templates (Migrating to Skills)

Two instruction templates exist in `content-automation/content_transformation/` and are currently stored as `business_rule` objects with `subType: "instruction_template"`. These are procedural instructions, not passive constraints, and will be migrated to the new `Skill` collection as part of Group I.

| Template | File | Current Location | Migration Target |
|---|---|---|---|
| Campaign Brief Generator | `campaign_brief_instructions.md` | `BusinessRule` (`subType: "instruction_template"`) | `Skill` (`contentType: ["internal_doc"]`) |
| Ops Configuration Guide | `ops_guide_instructions.md` | `BusinessRule` (`subType: "instruction_template"`) | `Skill` (`contentType: ["internal_doc"]`) |

After migration, the `instruction_template` subType will be removed from the `BusinessRule` collection. Business rules will only contain passive constraints (`subType: "tone"` or `"constraint"`). See [ROADMAP.md](./ROADMAP.md) Group I for the full migration plan and [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) for the `Skill` collection schema.

---

## External Access Patterns

The knowledge base is accessible through three channels. Each channel has different capabilities and constraints. See [ROADMAP.md](./ROADMAP.md) Groups J, K, L and [TECH_DECISIONS.md](./TECH_DECISIONS.md) ADR-006, ADR-007 for full scope and architecture decisions.

### Access Channels

| Channel | Protocol | Direction | Auth | Hosted |
|---|---|---|---|---|
| Web UI | HTTP (Next.js) | Read + Write (via review queue) | None (internal tool) | Vercel |
| External REST API (Group K) | REST over HTTP (`/api/v1/`) | Read-only | `X-API-Key` header | Vercel (same app) |
| MCP Server (Groups J + L) | MCP over stdio / SSE | Read + Write-to-submission | API key (SSE) / local (stdio) | Standalone (Railway/Fly.io) |

### Write Path: All Channels Converge on the Review Queue

Regardless of source, all content modifications follow the same path:

```
Source (UI / MCP / Bulk Upload)
  │
  ▼
createSubmission()
  │ submissionType: "new" | "update" | "document_add"
  │ sourceChannel: "ui" | "mcp" | "bulk_upload"
  │ sourceAppId: identifier (MCP only)
  ▼
Submission (status: "pending") → stored in Weaviate
  │
  ▼
Admin reviews at /queue
  │ Accept → writes to Weaviate knowledge collection
  │ Reject → closed with comment
  │ Defer → stays open with note
  │ Merge with AI → Claude merges, admin edits, then accepts
  ▼
Live knowledge object in Weaviate
```

The review queue is the **universal authorization layer** for writes. No external channel can bypass it. This design means:
- The admin always has final control over what enters the live knowledge base
- Source provenance is tracked on every submission (`sourceChannel`, `sourceAppId`, `sourceDescription`)
- The same merge, diff, and review UI works for all submission sources

### Read Path: Protocol-Specific but Shared Implementation

All read operations use the same `lib/knowledge.ts` functions regardless of channel:

| Operation | Web UI | REST API (K) | MCP Server (L) |
|---|---|---|---|
| List objects | `listKnowledgeObjects()` | `GET /api/v1/knowledge` | `list_objects` tool |
| Get detail | `getKnowledgeObject()` | `GET /api/v1/knowledge/:id` | `get_object` tool |
| Semantic search | (planned, Module 2) | `GET /api/v1/knowledge/search` | `search_objects` tool |
| Health metrics | `getDashboardData()` | `GET /api/v1/health` | `get_dashboard_health` tool |

### RAG via MCP

The MCP server's `search_objects` tool is the primary RAG (Retrieval-Augmented Generation) capability. It enables any MCP-compatible LLM to query the knowledge base by semantic similarity:

1. User asks a question in Claude Desktop / Claude Code / Cursor / Gemini
2. LLM calls `search_objects({ query: "..." })` via MCP
3. MCP server runs Weaviate `nearText` search across collections
4. Results returned ranked by vector similarity with content snippets
5. LLM uses retrieved knowledge to ground its response

This is the same semantic retrieval pattern used by the internal context assembly logic (see Context Assembly Logic above), but exposed to external LLMs rather than the internal generation pipeline.
