# Content Engine — Business Logic

> Last updated: March 23, 2026 (Group M Knowledge-Linked Skills; CW17 budget policy; CW20/CW21 test matrix and validation policy complete)

This document defines the rules that govern how knowledge is stored, how context is assembled, and how content is generated. It is the reference for all AI generation behavior at runtime.

---

## Knowledge Object Types

Nine types of knowledge objects are stored in Weaviate. Each type has a distinct role in the context assembly process.

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
| `content_narrative` | Strategic document aggregating core knowledge around a theme, audience, and intent — serves as the instruction layer between raw knowledge and content generation; lifecycle: draft → in_review → approved → archived | "Competitive Displacement: ZoomInfo to HG Insights", "Enterprise GTM Data Quality" |

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

Current state: Two `BusinessRule` objects with `subType: "instruction_template"` (Campaign Brief Generator, Ops Configuration Guide) were migrated to the `Skill` collection as part of Group I. See [roadmap/README.md](./roadmap/README.md) Group I.

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

Updated template (with skills — implemented, Group I):

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

Updated template (with Content Narrative — planned, Group R):

```
You are a B2B content writer creating [CONTENT_TYPE] for [COMPANY_NAME].

## Content Narrative: [Narrative Name]
[Full narrative content — strategic direction, messaging, angle]

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

Follow the Content Narrative for strategic direction, messaging, and angle.
Follow the Active Skills above to structure and format your output.
Respect all Business Rules for tone and constraints.
Use the Persona, Segment, and Use Case context to inform your content.
```

When a Content Narrative is selected, it is injected as the primary strategic context above Active Skills. The narrative defines WHAT to say and WHY. Skills define HOW to produce the specific content type. Business rules define constraints and tone. See [roadmap/README.md](./roadmap/README.md) Group R for full scope.

Skill selection logic:
1. **Automatic**: Query active skills where `contentType` includes the requested content type
2. **Manual**: User selects skills from a picker in the generation UI
3. **Hybrid** (recommended): Auto-select by content type, user can add/remove before generating
4. **Limit**: Max 3–5 active skills per generation to manage context window size

Implementation: `lib/context-assembly.ts` provides the `assembleContext()` function.

---

## Content Types

Canonical source: `lib/skill-types.ts` (`CONTENT_TYPES`, `getContentTypeLabel()`).

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

### Content Narrative
- **Purpose:** Strategic narrative artifacts used to align messaging and downstream generation
- **Length:** Variable
- **Structure:** Narrative sections (theme, audience, angle, strategic guidance)
- **Context priority:** Strategic positioning and cross-object synthesis
- **Tone:** Strategic, cohesive, opinionated

### Pillar Research
- **Purpose:** Long-form research synthesis used by the pillar workflow orchestration
- **Length:** 10-15 pages typical output
- **Structure:** Research report with citations and evidence sections
- **Context priority:** Transcript findings, competitor and market evidence
- **Tone:** Analytical, evidence-first

### Competitor Functionality Brief
- **Purpose:** Structured comparative analysis of competitor product capabilities
- **Length:** Variable
- **Structure:** Capability matrix, differentiators, gaps, implications
- **Context priority:** Competitor research artifacts and HG positioning
- **Tone:** Precise, comparative, defensible

### Competitor Persona + Messaging Brief
- **Purpose:** Competitive messaging and audience-positioning synthesis
- **Length:** Variable
- **Structure:** Persona mapping, message pillars, competitive narrative analysis
- **Context priority:** Persona evidence, messaging extraction, branch synthesis
- **Tone:** Strategic, audience-aware

### Market Content Brief
- **Purpose:** Market landscape synthesis feeding pillar planning and narrative generation
- **Length:** Variable
- **Structure:** Trends, drivers, whitespace, risk/opportunity framing
- **Context priority:** Market research branch outputs
- **Tone:** Insight-driven, strategic

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

## Pillar Research Workflow — Token and Context Budget Policy (CW17)

The content workflow enforces token and context budgets to prevent context overflow in multi-artifact aggregation. Policy is defined per step type and artifact type.

**Budget exceed policies:**
- `truncate` — cut text at max token boundary; preserves head of content.
- `summarize` — replace middle content with `[summary: middle content omitted to fit token budget]`; preserves head and tail.
- `fail` — throw `BudgetExceededError`; step fails, no retry (deterministic).

**Step-level budgets:** Each step type has `maxInputTokens`, `maxOutputTokens`, and `onExceed`. Defaults: transcript research (2500/4500, summarize), extract entities (1800/1200, fail), aggregates (2800/4200, truncate), market research (2500/4200, summarize).

**Artifact-level output budgets:** Per `artifactType`, `maxOutputTokens` and `onExceed` are enforced when persisting artifacts. Artifacts that exceed budget are adjusted (truncate/summarize) or cause failure (fail) before storage. Metadata records `outputTokenBudget`, `outputTokenPolicy`, `outputTokens`, `outputTokensOriginal`, `outputAdjusted`.

**Hierarchical aggregation constraints:** Aggregate per-competitor docs into branch brief first; final aggregation consumes branch briefs, not raw competitor docs. Artifact references (IDs) are passed between steps instead of full payloads to avoid pushing prior outputs through every call.

---

## Pillar Research Workflow — Fan-In and Final Package (CW14–CW16)

The content workflow orchestration (Group Content Workflow) produces pillar-ready outputs through a strict fan-in process:

1. **Branch aggregate validation (CW14):** Before fan-in completion, the orchestrator validates that each branch (A: competitor functionality, B: competitor personas + messaging, C: market research) has produced its required aggregate artifact. Missing artifacts cause explicit validation failure with an error summary; the run transitions to `failed` and no final package is assembled.

2. **Final package assembly and lineage (CW15):** When all three branch aggregates are present, the assembler builds a `final_pillar_package` artifact. The payload contains content refs for `functionalityBriefRef`, `personaMessagingBriefRef`, and `marketBriefRef`, plus an optional `finalAggregationRef`. Lineage records `parentArtifactIds` pointing to the three branch aggregate artifacts, enabling traceability from final package back to source briefs.

3. **Downstream handoff contract (CW16):** The `GET /api/content-workflow/runs/[id]/package` endpoint returns the latest final package payload and artifact metadata. Future workflows (including Group R Content Narratives) consume these refs to pull branch briefs for narrative generation or other downstream use. The `run.package_assembled` event is emitted on successful assembly.

**Test and validation coverage (CW20–CW21):** The workflow has full test matrix coverage for lifecycle transitions, retries, branch isolation, fan-in correctness, artifact-type validation, and artifact lineage integrity. All content-workflow tests pass.

---

Workflow states and planned business rules are defined in [roadmap/README.md](./roadmap/README.md).

---

## Instruction Templates (Migrated to Skills)

Two instruction templates from `content-automation/content_transformation/` were stored as `business_rule` objects with `subType: "instruction_template"`. These were procedural instructions, not passive constraints, and have been migrated to the `Skill` collection as part of Group I.

| Template | File | Previous Location | Current Location |
|---|---|---|---|
| Campaign Brief Generator | `campaign_brief_instructions.md` | `BusinessRule` (`subType: "instruction_template"`) | `Skill` (`contentType: ["internal_doc"]`) |
| Ops Configuration Guide | `ops_guide_instructions.md` | `BusinessRule` (`subType: "instruction_template"`) | `Skill` (`contentType: ["internal_doc"]`) |

After migration, the `instruction_template` subType was removed from the `BusinessRule` collection. Business rules only contain passive constraints (`subType: "tone"` or `"constraint"`). See [roadmap/README.md](./roadmap/README.md) Group I and [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) for the `Skill` collection schema.

---

## Knowledge-Linked Skills (Group M)

Skills can declare dependencies on knowledge objects via the `sourceKnowledgeObjects` field. Each link includes an `integrationPrompt` that instructs how the knowledge object's content should influence the skill.

### Refresh Flow

When a knowledge object is updated (via merge/save or review accept):

1. `triggerSkillRefreshCheck()` fires asynchronously (fire-and-forget, does not block the acceptance response).
2. All active skills are scanned for `sourceKnowledgeObjects` containing the updated object ID.
3. For each matched skill, `evaluateSkillRefreshSignificance()` runs a lightweight Claude call to assess whether the change warrants a skill update.
4. If significant, a system-generated submission enters the review queue (`objectType: "skill"`, `sourceChannel: "system"`).
5. Admin reviews the suggestion at `/queue`. "Merge with AI" uses `buildSkillRefreshPrompt` with the integration prompt from the link.
6. On accept, the skill content is updated via `updateSkill()`.

### Duplicate Prevention

Before creating a refresh submission, the system checks for existing pending or deferred system submissions targeting the same skill. If found, the new submission is skipped.

### Suggested Links (M7)

The `POST /api/skills/:id/suggest-links` endpoint uses Weaviate `nearText` semantic search to find knowledge objects similar to a skill's content. Results are ranked by cosine similarity score. Admins can accept suggestions (pre-populates the link editor) or dismiss them.

---

## External Access Patterns

The system is accessible through three channels. Each channel supports both the **Knowledge Base** (personas, segments, use cases, skills, etc.) and — in Phase 2 — the **Content Library** (generated and submitted content). See [roadmap/README.md](./roadmap/README.md) Groups J, K and [TECH_DECISIONS.md](./TECH_DECISIONS.md) ADR-006, ADR-007 for full scope and architecture decisions.

### Access Channels

| Channel | Protocol | Knowledge Direction | Content Direction (Phase 2) | App-Level Auth | Hosted |
|---|---|---|---|---|---|
| Web UI | HTTP (Next.js) | Read + Write (via review queue) | Read + Write (Generate UI, Direct Upload) | Session auth | Vercel |
| External REST API (Group K) | REST over HTTP (`/api/v1/`) | Read-only (K3) | Read + Write-as-draft (K13–K14) | `X-API-Key` header | Vercel (same app) |
| MCP Server (Group J) | MCP over stdio / Streamable HTTP | Read + Write-to-submission (J5, J9) | Read + Write-as-draft (J26–J27) | API key (HTTP) / local (stdio) | Standalone (Railway) |

### Knowledge Write Path: Channels Converge on the Review Queue

All knowledge modifications follow the same path regardless of source:

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

The review queue is the **universal authorization layer** for knowledge writes. No external channel can bypass it. This design means:
- The admin always has final control over what enters the live knowledge base
- Source provenance is tracked on every submission (`sourceChannel`, `sourceAppId`, `sourceDescription`)
- The same merge, diff, and review UI works for all submission sources

Each access channel connects to Weaviate with a dedicated user whose permissions match only what that channel needs (defense-in-depth). Even if application-level auth is bypassed, the Weaviate user limits the blast radius. See [TECH_DECISIONS.md](./TECH_DECISIONS.md) ADR-014 and [roadmap/README.md](./roadmap/README.md) Group K Architecture Decisions.

### Content Write Path: Channels Converge on Draft (Phase 2)

Content entering the Content Library follows a different path from knowledge. External content enters the `GeneratedContent` collection directly as `draft` — the Module 4 editorial workflow is the quality gate, not a separate review queue. See [phase-2.md](./roadmap/phase-2.md) Module 5 for the full spec.

```
Source (Generate UI / Direct Upload / MCP / REST API / Bulk Import)
  │
  ▼
createContent()
  │ sourceChannel: "generate_ui" | "direct_upload" | "mcp" | "api" | "bulk_import"
  │ sourceAppId: identifier (MCP / API only)
  │ sourceDescription: free-text provenance
  ▼
GeneratedContent (status: "draft") → stored in Weaviate
  │
  ▼
Editorial workflow (Module 4)
  │ Submit for review → in_review
  │ Approve → approved
  │ Reject → draft (with reviewer comments)
  │ Publish → published
  ▼
Published content
```

**Why no review queue for content?** Knowledge objects are shared, long-lived source-of-truth records — a bad knowledge update affects every future generation. Content pieces are individual drafts owned by their creator. The editorial workflow already provides review and approval gates. Adding a separate submission queue would create friction without proportional benefit.

**Source provenance** is tracked on every content piece using the same field pattern as knowledge submissions: `sourceChannel`, `sourceAppId`, `sourceDescription`. The Content Library UI displays source badges and supports filtering by source channel.

### Read Path: Protocol-Specific but Shared Implementation

All read operations use the same `lib/knowledge.ts` and `lib/content.ts` functions regardless of channel:

**Knowledge reads:**

| Operation | Web UI | REST API (K) | MCP Server (J) |
|---|---|---|---|
| List objects | `listKnowledgeObjects()` | `GET /api/v1/knowledge` | `list_objects` tool |
| Get detail | `getKnowledgeObject()` | `GET /api/v1/knowledge/:id` | `get_object` tool |
| Semantic search | (planned, Module 2) | `GET /api/v1/knowledge/search` | `search_objects` tool |
| Health metrics | `getDashboardData()` | `GET /api/v1/health` | `get_dashboard_health` tool |

**Content reads (Phase 2):**

| Operation | Web UI | REST API (K13) | MCP Server (J26) |
|---|---|---|---|
| List content | Content Library page | `GET /api/v1/content` | `list_content` tool |
| Get detail | Content detail page | `GET /api/v1/content/:id` | `get_content` tool |
| Semantic search | Content Library search | `GET /api/v1/content/search` | `search_content` tool |

### RAG via MCP

The MCP server's `search_objects` tool is the primary RAG (Retrieval-Augmented Generation) capability. It enables any MCP-compatible LLM to query the knowledge base by semantic similarity:

1. User asks a question in Claude Desktop / Claude Code / Cursor / Gemini
2. LLM calls `search_objects({ query: "..." })` via MCP
3. MCP server runs Weaviate `nearText` search across collections
4. Results returned ranked by vector similarity with content snippets
5. LLM uses retrieved knowledge to ground its response

This is the same semantic retrieval pattern used by the internal context assembly logic (see Context Assembly Logic above), but exposed to external LLMs rather than the internal generation pipeline.

In Phase 2, the `search_content` tool (J26) extends RAG to the Content Library — an LLM can search existing content to avoid duplication or build on prior work before generating new content.
