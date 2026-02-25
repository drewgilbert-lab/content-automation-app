# Content Engine — Business Logic

> Last updated: February 2026

This document defines the rules that govern how knowledge is stored, how context is assembled, and how content is generated. It is the reference for all AI generation behavior at runtime.

---

## Knowledge Object Types

Five types of knowledge objects are stored in Weaviate. Each type has a distinct role in the context assembly process.

| Type | Role | Examples |
|---|---|---|
| `persona` | Who we are selling to — their goals, pain points, responsibilities, and language | Sales, Marketing, RevOps, Strategy |
| `segment` | Which companies we target — firmographic profile, qualification criteria | Enterprise, Mid-Market, SMB, Commercial, Strategic |
| `use_case` | What business problems we solve — scenarios, benefits, business drivers | High-Intent Lead Generation, ICP Segmentation Refinement |
| `icp` | The intersection of persona and segment — the ideal buyer profile | To be defined |
| `business_rule` | Constraints and guidelines that apply to all content — tone, brand, what not to say | To be defined |

---

## Source of Truth

- **Weaviate** is the live, queryable source of truth for all knowledge
- **`content-automation/`** folder is the seed source — a one-time import populates Weaviate; after that, Weaviate is the system of record
- Edits made in the application write back to Weaviate directly
- The `content-automation/` markdown files are not consulted at runtime

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

icp = persona ∩ segment ──────────► all content types (targeting precision)
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

## Instruction Templates

Two instruction templates exist in `content-automation/content_transformation/` and are treated as special `business_rule` objects — they define the generation behavior for structured document types rather than constraining tone.

| Template | File | Purpose |
|---|---|---|
| Campaign Brief Generator | `campaign_brief_instructions.md` | Generates a business-facing campaign summary after a campaign is built in Octave |
| Ops Configuration Guide | `ops_guide_instructions.md` | Generates a handoff document for ops team to configure Salesforce, Clay, and Instantly |

These will be seeded into Weaviate as `business_rule` type objects with a sub-type tag of `instruction_template`.
