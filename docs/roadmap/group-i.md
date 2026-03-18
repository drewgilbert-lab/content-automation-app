> Back to [Roadmap Index](./README.md)

# Group I — Skills Module — **Done**

> Scope: New module separating procedural task instructions ("Skills") from passive constraints ("Business Rules"). Skills are active, task-specific instructions that tell the AI how to perform a specific type of work — analogous to Cursor's SKILL.md files or Claude's system instructions.
> Dependencies: [Group B](./group-b.md) (write layer for migration). Module 2 Generate (for context assembly integration).

## Separation Criteria

| Attribute | Business Rule | Skill |
|---|---|---|
| Nature | Passive constraint | Active procedural instruction |
| Application | Always included when active | Conditionally selected by content type or manual choice |
| Prompt role | "Constraints" section — what not to do | "Instructions" section — how to do the task |
| Scope | Broad, cross-cutting | Task-specific |
| Format | "Don't mention competitors" / "Use confident tone" | "Step 1: Extract the key metrics. Step 2: Structure as..." |
| Current storage | `BusinessRule` with `subType: "tone"` or `"constraint"` | `BusinessRule` with `subType: "instruction_template"` (to be migrated) |

**I1 — Skill Collection Schema** — **Done**
Create a new `Skill` Weaviate collection. Properties: `name` (text, vectorized), `description` (text, vectorized — short summary of what the skill does), `content` (text, vectorized — full instruction body in markdown), `active` (boolean — toggle to enable/disable), `contentType` (text[] — which content types trigger this skill, e.g. `["email", "internal_doc"]`), `triggerConditions` (text — optional JSON for complex trigger logic), `parameters` (text — optional JSON array of `SkillParameter` objects defining expected inputs), `outputFormat` (text — description of expected output structure), `version` (text — semantic version string), `previousVersionId` (text — UUID of the prior version for rollback), `tags` (text[]), `category` (text — e.g. `"content_generation"`, `"documentation"`, `"transformation"`), `author` (text), `sourceFile` (text), `deprecated` (boolean), `createdAt` (date), `updatedAt` (date). Cross-references: `GeneratedContent ──usedSkills──► Skill[]`.

**I2 — Skill CRUD API** — **Done**
Build `GET /api/skills` (list with optional filters: `contentType`, `active`, `category`), `POST /api/skills` (create), `GET /api/skills/[id]` (detail), `PUT /api/skills/[id]` (update — prompts version bump), `DELETE /api/skills/[id]` (with reference check), `PATCH /api/skills/[id]` (activate/deactivate/deprecate/restore). Implementation in `lib/skills.ts` and `lib/skill-types.ts`, mirroring the existing knowledge CRUD pattern. Enforces name uniqueness within the `Skill` collection.

**I3 — Skills Library UI** — **Done**
Build `/skills` list page with filters (active/inactive, content type, category), search, and activation toggle per skill. `/skills/[id]` detail page showing full instruction content (markdown), metadata sidebar (category, tags, content types, version, author, timestamps), activation toggle, and usage stats (count of `GeneratedContent` objects that used this skill). `/skills/new` and `/skills/[id]/edit` forms with fields for name, description, content (markdown editor with preview), content types (multi-select), category (dropdown), tags, parameters (dynamic form builder), and output format. Version bump prompt on edit (patch/minor/major).

**I4 — Context Assembly Integration** — **Done**
Build `lib/context-assembly.ts` with an `assembleContext()` function. During content generation, the function: (1) queries active skills matching the requested content type, (2) retrieves relevant knowledge objects via semantic search, (3) appends active business rules as constraints. The assembled system prompt follows this structure:

```
You are a B2B content writer creating [CONTENT_TYPE] for [COMPANY_NAME].

## Active Skills
### Skill: [Skill Name] (v[version])
[Skill instruction content]

## Target Persona
[Persona content]

## Target Account Segment
[Segment content]

## Use Case / Topic
[Use case content]

## Business Rules (Constraints)
[Business rule content — tone, what not to say]

Follow the Active Skills above to structure and format your output.
Respect all Business Rules for tone and constraints.
```

Skill selection modes: automatic (by content type), manual (user picks from a list), or hybrid (auto-select + user override). Limit: max 3–5 active skills per generation to manage context window size.

**I5 — Migration Script** — **Done**
Build `scripts/migrate-instruction-templates.ts`. Reads all `BusinessRule` objects with `subType: "instruction_template"`, creates corresponding `Skill` objects (preserving name, content, tags, sourceFile; setting `active: true`, `version: "1.0.0"`, `contentType: ["internal_doc"]`), and deprecates the original BusinessRule objects. Does not delete originals — backward-compatible until migration is verified. Includes a `--dry-run` flag to preview changes without writing. Logs a migration map (old BusinessRule UUID → new Skill UUID).

**I6 — Skill Testing Interface** (future)
Build `/skills/[id]/test` page where a user can run a skill against sample inputs and preview the generated output. Accepts a content type, optional parameters, and sample context. Calls the generation pipeline with the selected skill and displays the result. Enables validation before activating a skill in production. Includes side-by-side comparison of output with and without the skill applied.

**I7 — Claude Skill Package Compatibility Standard** (planned extension)
Define a canonical Claude-compatible skill package format and enforce it as the authoring standard for new skill content in this repo. The canonical artifact is a folder containing `SKILL.md` with YAML frontmatter and markdown instructions, plus optional supporting files (`reference.md`, `examples/`, `scripts/`). Baseline requirements: `name` (lowercase letters/numbers/hyphens, max 64 chars), `description` (clear activation guidance), optional invocation controls (`disable-model-invocation`, `user-invocable`), and optional execution controls (`allowed-tools`, `context`, `agent`). Add a translation contract between internal `Skill` objects and package format so skills can be pushed/pulled via MCP/API without losing metadata. Publish contributor guidance for creating new skills content in-repo (folder naming, frontmatter validation, supporting-file references, and compatibility checks before merge).

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Skill conflicts — two active skills give contradictory instructions | AI produces confused or inconsistent output | `conflictsWith` field for explicit declarations; UI warns when conflicting skills are both active; admin resolves before generation |
| Context window bloat — many skills + knowledge objects + rules | System prompt exceeds Claude's context window | Limit active skills per generation (max 3–5); track total prompt token count; warn when approaching limits; skill content length guidelines |
| No automated skill testing | Cannot verify a skill produces correct output before activation | Manual test interface (I6); track acceptance rates of content generated with each skill; A/B comparison |
| Bad skill version degrades all content for a type | Single point of failure for content quality | `previousVersionId` for one-click rollback; semantic versioning; version diff UI; gradual rollout option |
| Migration breaks existing workflows | Instruction templates stop working during migration | Feature flag to toggle between old and new systems; gradual migration (one template at a time); deprecate but don't delete old BusinessRules |
| Skills must still respect business rules | Skill instructions could override or contradict constraints | Always include business rules after skills in the prompt; document that skills define "how" while rules define "constraints" |
| Skill discovery — users don't know which skills exist | Skills go unused or wrong skills are selected | Auto-suggest skills based on content type in generation UI; skill library with clear descriptions and examples |
| Skill maintenance — skills become stale | Outdated skills produce poor output | Staleness alerts (same 90-day threshold as knowledge objects); usage tracking; deprecation workflow |
| Skill composability — skills referencing other skills | Circular dependencies, ordering issues | `dependsOn` field with circular dependency detection; resolve dependencies before injection; defer full chaining to a future enhancement |
| Skill parameter handling | Parameters add complexity to the generation UI | Start with skills that take no parameters; add parameter UI incrementally; validate parameter types at runtime |
| Claude format drift | Internal skill representation diverges from Claude-compatible package expectations | Canonical `SKILL.md` schema, bidirectional mapping tests, and pre-merge validation for package compatibility |
