# Content Engine — Knowledge Base

> Last updated: February 2026

This document defines the Weaviate schema, the full content inventory to be seeded, the cross-reference design, and the seed plan. It is the technical reference for the knowledge store layer.

---

## Weaviate Collections

Each knowledge object type maps to a Weaviate collection. Collections must be created before data is seeded.

### Collection: `Persona`

| Property | Type | Description |
|---|---|---|
| `name` | `text` | Persona name (e.g. "Sales") |
| `content` | `text` | Full markdown content — vectorized for semantic search |
| `tags` | `text[]` | Optional labels (e.g. ["gtm", "revenue"]) |
| `sourceFile` | `text` | Original filename from seed import |
| `deprecated` | `boolean` | Soft-delete flag; deprecated objects are excluded from generation context |
| `createdAt` | `date` | Record creation timestamp |
| `updatedAt` | `date` | Last modification timestamp |

Cross-references:
- `hasSegments` → `Segment[]` (which segments this persona most commonly appears in)
- `hasUseCases` → `UseCase[]` (which use cases are most relevant to this persona)

---

### Collection: `Segment`

| Property | Type | Description |
|---|---|---|
| `name` | `text` | Segment name (e.g. "Enterprise Account Segment") |
| `content` | `text` | Full markdown content — vectorized for semantic search |
| `revenueRange` | `text` | Revenue band (e.g. "$1B–$10B") |
| `employeeRange` | `text` | Employee count range |
| `tags` | `text[]` | Optional labels |
| `sourceFile` | `text` | Original filename from seed import |
| `deprecated` | `boolean` | Soft-delete flag; deprecated objects are excluded from generation context |
| `createdAt` | `date` | Record creation timestamp |
| `updatedAt` | `date` | Last modification timestamp |

Cross-references:
- `hasPersonas` → `Persona[]` (which personas operate within this segment)
- `hasUseCases` → `UseCase[]` (which use cases are relevant to this segment)

---

### Collection: `UseCase`

| Property | Type | Description |
|---|---|---|
| `name` | `text` | Use case name (e.g. "High-Intent Lead Generation") |
| `content` | `text` | Full markdown content — vectorized for semantic search |
| `tags` | `text[]` | Optional labels |
| `sourceFile` | `text` | Original filename from seed import |
| `deprecated` | `boolean` | Soft-delete flag; deprecated objects are excluded from generation context |
| `createdAt` | `date` | Record creation timestamp |
| `updatedAt` | `date` | Last modification timestamp |

---

### Collection: `ICP`

| Property | Type | Description |
|---|---|---|
| `name` | `text` | ICP name |
| `content` | `text` | Full definition — vectorized for semantic search |
| `tags` | `text[]` | Optional labels |
| `deprecated` | `boolean` | Soft-delete flag; deprecated objects are excluded from generation context |
| `createdAt` | `date` | Record creation timestamp |
| `updatedAt` | `date` | Last modification timestamp |

Cross-references:
- `persona` → `Persona` (the target persona for this ICP)
- `segment` → `Segment` (the target segment for this ICP)

---

### Collection: `BusinessRule`

| Property | Type | Description |
|---|---|---|
| `name` | `text` | Rule name (e.g. "Tone Guide", "Campaign Brief Generator") |
| `content` | `text` | Rule content or instruction template — vectorized |
| `subType` | `text` | `"tone"`, `"constraint"`, `"instruction_template"` |
| `tags` | `text[]` | Optional labels |
| `sourceFile` | `text` | Original filename if seeded from file |
| `deprecated` | `boolean` | Soft-delete flag; deprecated objects are excluded from generation context |
| `createdAt` | `date` | Record creation timestamp |
| `updatedAt` | `date` | Last modification timestamp |

---

### Collection: `Skill`

Stores procedural task instructions that tell the AI how to perform specific types of work. Separated from `BusinessRule` (which stores passive constraints). See [ROADMAP.md](./ROADMAP.md) Group I for full scope and migration plan.

| Property | Type | Description |
|---|---|---|
| `name` | `text` | Skill name (e.g. "Campaign Brief Generator") — vectorized |
| `description` | `text` | Short summary of what this skill does — vectorized |
| `content` | `text` | Full instruction body in markdown — vectorized (primary) |
| `active` | `boolean` | Toggle to enable/disable; inactive skills excluded from context assembly |
| `contentType` | `text[]` | Content types that trigger this skill (e.g. `["email", "internal_doc"]`) |
| `triggerConditions` | `text` | Optional JSON for complex trigger logic |
| `parameters` | `text` | Optional JSON array of `SkillParameter` objects (`{ name, type, description, required }`) |
| `outputFormat` | `text` | Description of expected output structure |
| `version` | `text` | Semantic version string (e.g. `"1.0.0"`) |
| `previousVersionId` | `text` | UUID of the prior version (for rollback) |
| `tags` | `text[]` | Categorization labels |
| `category` | `text` | Skill category (e.g. `"content_generation"`, `"documentation"`, `"transformation"`) |
| `author` | `text` | Who created this skill |
| `sourceFile` | `text` | Original file path if migrated from seed |
| `deprecated` | `boolean` | Soft-delete flag |
| `createdAt` | `date` | Creation timestamp |
| `updatedAt` | `date` | Last modification timestamp |

Cross-references:
- Referenced by `GeneratedContent ──usedSkills──► Skill[]`

---

### Collection: `GeneratedContent`

Stores all content produced by the system with full generation metadata.

| Property | Type | Description |
|---|---|---|
| `title` | `text` | Auto-generated or user-provided title |
| `contentType` | `text` | `"email"`, `"blog"`, `"social"`, `"thought_leadership"`, `"internal_doc"` |
| `body` | `text` | The generated content |
| `prompt` | `text` | The user's original generation request |
| `status` | `text` | `"draft"`, `"submitted"`, `"in_review"`, `"approved"`, `"rejected"`, `"published"` |
| `createdAt` | `date` | Generation timestamp |
| `updatedAt` | `date` | Last modification timestamp |

Cross-references:
- `usedPersona` → `Persona` (which persona was used as context)
- `usedSegment` → `Segment` (which segment was used as context)
- `usedUseCases` → `UseCase[]` (which use cases were used as context)
- `usedBusinessRules` → `BusinessRule[]` (which rules were applied)
- `usedSkills` → `Skill[]` (which skills were applied — added by Group I)

---

### Collection: `Submission`

Stores pending knowledge base submissions for the review queue. Not vectorized.

| Property | Type | Notes |
|---|---|---|
| `submitter` | text | Who submitted |
| `objectType` | text | Knowledge type (persona, segment, etc.) |
| `objectName` | text | Proposed object name |
| `submissionType` | text | `"new"`, `"update"`, or `"document_add"` |
| `proposedContent` | text | JSON-serialized proposed data (not vectorized) |
| `targetObjectId` | text | UUID of existing object (updates only) |
| `status` | text | pending / accepted / rejected / deferred |
| `reviewComment` | text | Reviewer comment (on reject) |
| `reviewNote` | text | Reviewer note (on defer) |
| `sourceChannel` | text | How the submission was created: `"ui"`, `"mcp"`, or `"bulk_upload"`. Default: `"ui"`. Added by Group J. |
| `sourceAppId` | text | Identifier for the external application (from MCP API key record). Added by Group J. |
| `sourceDescription` | text | Free-text describing where the content came from (provided by MCP client). Added by Group J. |
| `createdAt` | date | Submission timestamp |
| `reviewedAt` | date | Review timestamp |

No cross-references. No vectorization.

The `sourceChannel`, `sourceAppId`, and `sourceDescription` properties are planned additions from [ROADMAP.md](./ROADMAP.md) Group J (Inbound MCP Server). Existing submissions default to `sourceChannel: "ui"` with the other fields empty.

---

## Cross-Reference Design

Weaviate cross-references are directional links between objects. They allow the application to traverse relationships (e.g. "give me the personas and use cases linked to Enterprise segment") and provide transparency about which knowledge informed a generated piece.

```
Persona ──hasSegments──► Segment
Persona ──hasUseCases──► UseCase

Segment ──hasPersonas──► Persona
Segment ──hasUseCases──► UseCase

ICP ──persona──► Persona
ICP ──segment──► Segment

GeneratedContent ──usedPersona──► Persona
GeneratedContent ──usedSegment──► Segment
GeneratedContent ──usedUseCases──► UseCase[]
GeneratedContent ──usedBusinessRules──► BusinessRule[]
GeneratedContent ──usedSkills──► Skill[]
```

Cross-references are populated:
- For seeded objects: manually mapped during seed script execution
- For generated content: automatically recorded at generation time

---

## Content Inventory

Full list of files in `content-automation/` and their target Weaviate collection.

### Personas → `Persona` collection

| File | Object Name | Status |
|---|---|---|
| `Octave/Library/Personas/Marketing.md` | Marketing | Seeded |
| `Octave/Library/Personas/RevOps.md` | RevOps | Seeded |
| `Octave/Library/Personas/Sales.md` | Sales | Seeded |
| `Octave/Library/Personas/Strategy.md` | Strategy | Seeded |

### Account Segments → `Segment` collection

| File | Object Name | Status |
|---|---|---|
| `Octave/Library/Account Segments/Commercial Account Segment.md` | Commercial | Seeded |
| `Octave/Library/Account Segments/Enterprise Account Segment.md` | Enterprise | Seeded |
| `Octave/Library/Account Segments/Mid-Market Account Segment.md` | Mid-Market | Seeded |
| `Octave/Library/Account Segments/SMB Account Segment.md` | SMB | Seeded |
| `Octave/Library/Account Segments/Strategic Account Segment.md` | Strategic | Seeded |

### Use Cases → `UseCase` collection

| File | Object Name | Status |
|---|---|---|
| `Octave/Library/Use Cases/AI-Driven Sales Plays.md` | AI-Driven Sales Plays | Seeded |
| `Octave/Library/Use Cases/B2B Data Enrichment For GTM Precision.md` | B2B Data Enrichment For GTM Precision | Seeded |
| `Octave/Library/Use Cases/Competitor Analysis And Takeout.md` | Competitor Analysis And Takeout | Seeded |
| `Octave/Library/Use Cases/High-Intent Lead Generation.md` | High-Intent Lead Generation | Seeded |
| `Octave/Library/Use Cases/ICP Segmentation Refinement.md` | ICP Segmentation Refinement | Seeded |
| `Octave/Library/Use Cases/Inbound Marketing Automation.md` | Inbound Marketing Automation | Seeded |
| `Octave/Library/Use Cases/Market Sizing.md` | Market Sizing | Seeded |
| `Octave/Library/Use Cases/Maximize ABM Performance.md` | Maximize ABM Performance | Seeded |
| `Octave/Library/Use Cases/Predictive Account Scoring.md` | Predictive Account Scoring | Seeded |
| `Octave/Library/Use Cases/Revenue Growth Intelligence Platform.md` | Revenue Growth Intelligence Platform | Seeded |
| `Octave/Library/Use Cases/Signal-based Account Prioritization.md` | Signal-based Account Prioritization | Seeded |
| `Octave/Library/Use Cases/Territory Coverage Optimization.md` | Territory Coverage Optimization | Seeded |
| `Octave/Library/Use Cases/Territory Planning and Optimization.md` | Territory Planning and Optimization | Seeded |
| `Octave/Library/Use Cases/Voice-of-the-Customer Generation and Activation.md` | Voice-of-the-Customer Generation and Activation | Seeded |
| `Octave/Library/Use Cases/Whitespace Analysis And Activation.md` | Whitespace Analysis And Activation | Seeded |

### Instruction Templates → `BusinessRule` collection (`subType: "instruction_template"`)

| File | Object Name | Status |
|---|---|---|
| `content_transformation/campaign_brief_instructions.md` | Campaign Brief Generator | Seeded |
| `content_transformation/ops_guide_instructions.md` | Ops Configuration Guide Generator | Seeded |

### To Be Created (not in seed files)

| Collection | Object Name | Status |
|---|---|---|
| `ICP` | — | Not yet defined |
| `BusinessRule` | Tone Guide | Not yet written |
| `BusinessRule` | Competitor Policy | Not yet written |
| `BusinessRule` | Claim Standards | Not yet written |
| `BusinessRule` | CTA Standards | Not yet written |
| `BusinessRule` | Prohibited Terms | Not yet written |

---

## Seed Plan

### Prerequisites

1. Weaviate Cloud account created at [console.weaviate.cloud](https://console.weaviate.cloud)
2. `WEAVIATE_URL` and `WEAVIATE_API_KEY` added to `.env.local`
3. `CONTENT_REPO_PATH` added to `.env.local` pointing to the content-automation folder:
   ```
   CONTENT_REPO_PATH=/Users/drew.gilbert/Documents/content-automation
   ```

### Seed Script Plan

A one-time script at `scripts/seed.ts` will:

1. Read each markdown file from `CONTENT_REPO_PATH`
2. Map the file to its target collection and object name
3. Create Weaviate collections if they don't exist (using schema above)
4. Insert each file's content as a Weaviate object
5. Log success/failure per object
6. Report total objects created

The script uses `withWeaviate` from `lib/weaviate.ts` and reads files using Node.js `fs` module.

### Migrations

| Script | Purpose | Status |
|---|---|---|
| `scripts/add-deprecated-field.ts` | Adds `deprecated: boolean` property to all 5 knowledge collections (Persona, Segment, UseCase, BusinessRule, ICP) | Done |
| `scripts/add-submission-collection.ts` | Creates the `Submission` collection for the review queue | Done |
| `scripts/migrate-instruction-templates.ts` | Migrates `BusinessRule` objects with `subType: "instruction_template"` to the new `Skill` collection | Planned (Group I5) |
| `scripts/add-submission-source-fields.ts` | Adds `sourceChannel`, `sourceAppId`, `sourceDescription` properties to the `Submission` collection | Planned (Group J4) |

### Seed Script Status

| Step | Status |
|---|---|
| Collections schema defined | Done (this document) |
| `CONTENT_REPO_PATH` env var added | Done |
| `scripts/seed.ts` created | Done |
| Collections created in Weaviate Cloud | Done |
| Seed script executed | Done |
| Objects verified in Weaviate dashboard | Done |

---

## Vectorizer Configuration

Weaviate Cloud auto-vectorizes text properties on insert using its default vectorizer. The `content` property on each collection is the primary vectorized field — it contains the full markdown text of the knowledge object.

- **Default vectorizer:** Weaviate Cloud default (configurable per collection)
- **Primary vectorized property:** `content`
- **Secondary vectorized properties:** `name`, `tags` (included in vector index)

If retrieval quality needs improvement, the vectorizer can be updated to use a specific embedding model (e.g. `text2vec-openai` or `text2vec-google`) without migrating data — only re-indexing is required.
