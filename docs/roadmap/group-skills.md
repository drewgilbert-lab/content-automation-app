> Back to [Roadmap Index](./README.md)

# Group SK — Skills Resource Parity

> Scope: Extend the Skills module to achieve full structural parity with Claude's skill format by adding first-class resource file support (references, scripts, agents, assets), progressive context loading, enhanced import/export with full folder trees, and a structured eval framework.
> Dependencies: Group I (Skills Module — Done), Group M (Knowledge-Linked Skills — Done), Group N (Unified Object Type Support — N9 "Internal Skill ⇄ Claude Bundle Mapping" is directly related; this group supersedes N9).

## Why This Matters

The current Skills module stores each skill as a single `content` text field in Weaviate. Claude skills are multi-file folders with a `SKILL.md` entrypoint plus `references/`, `scripts/`, `agents/`, and `assets/` sub-folders loaded progressively. This structural mismatch means:

1. **No reference documents.** A skill that needs to reference schema definitions, style guides, or domain-specific docs must cram everything into one monolithic markdown body. Claude skills offload these to `references/` files that are loaded on demand, keeping the core instructions lean.

2. **No executable scripts.** Claude skills can bundle helper scripts for deterministic, repetitive tasks (data transforms, validation, packaging). Our skills have no concept of bundled code.

3. **No sub-agent definitions.** Claude skills can include `agents/` markdown files with specialized instructions for grading, comparison, and analysis sub-agents. Our skills cannot delegate sub-tasks.

4. **No progressive disclosure.** Claude uses a three-level loading model: metadata (always in context), SKILL.md body (on activation), bundled resources (on demand). Our context assembly injects the entire `content` field as a single block with no selective loading.

5. **Import/export is lossy.** The `SkillPackage.supportingFiles` field exists in `lib/skill-package-types.ts` but is never read or written. Exporting produces only `SKILL.md` + `metadata.json`; importing ignores all other files in a ZIP. Round-tripping a Claude skill through our system strips its resources.

6. **Skill testing is shallow.** The current test page (`/skills/[id]/test`) runs a single prompt/response. Claude's skill-creator has a structured eval framework with test cases, expectations, baseline comparison, grading, and iteration tracking.

Closing this gap transforms skills from flat prompt templates into rich, composable packages that match the Claude ecosystem standard.

## Current State vs Target State

### Current State

- Skills are flat: one `content` field in Weaviate holds the entire SKILL.md body
- `SkillPackage.supportingFiles` exists in `lib/skill-package-types.ts` but is never read or written
- Export produces a ZIP with only `SKILL.md` + `metadata.json` (`lib/skill-package.ts` `skillToPackage()`)
- Import ignores all files except `SKILL.md` and `metadata.json`
- Context assembly in `lib/context-assembly.ts` injects `skill.content` as a monolithic block (no progressive loading)
- The skill form in `app/skills/components/skill-form.tsx` has no resource file management UI
- The skill test page (`/skills/[id]/test`) does a single prompt/response with no structured eval

### Target State (Claude Parity)

```
skill-name/
├── SKILL.md              (required — YAML frontmatter + markdown instructions)
├── agents/               (sub-agent instruction markdown files)
├── references/           (docs loaded into context on demand)
├── scripts/              (executable code for deterministic tasks)
└── assets/               (templates, icons, static files used in output)
```

Three-level progressive disclosure:
1. **Metadata** (name + description) — always in context for skill selection (~100 words)
2. **SKILL.md body** (`content` field) — loaded when skill activates (<500 lines ideal)
3. **Bundled resources** — loaded on demand based on instructions in the body (unlimited, scripts can execute without loading)

## Relationship to Existing Modules

| Module | Relationship |
|---|---|
| Knowledge Base | Unchanged. `sourceKnowledgeObjects` on skills still links to knowledge objects. Resource files are a parallel concept (internal to the skill, not cross-referenced knowledge). |
| Context Assembly | SK10 extends `assembleContext()` to load reference resources on demand. Skills still inject their `content` body; references are additive context. |
| Content Library | No direct dependency. `GeneratedContent.usedSkills` cross-reference is unaffected. Future: `loadedResources` metadata could be stored on content for traceability. |
| MCP Server | SK13 adds resource-aware tools. Existing skill tools unchanged. |
| External REST API | SK12 adds resource endpoints under `/api/v1/skills/[id]/resources`. |
| Group N (N9) | N9 ("Internal Skill ⇄ Claude Bundle Mapping") is superseded by SK7, which implements the full bidirectional mapping including resource files. |
| Import/Export | SK7 upgrades the `.skill` ZIP format from 2 files to full folder tree. Backward compatible: imports without resources still work. |

## Weaviate Collection Schema: `SkillResource`

A new collection storing resource files attached to skills. One skill can have many resources; resources are identified by their `path` (unique per `skillId`).

| Property | Type | Description |
|---|---|---|
| `skillId` | text | UUID of the parent Skill |
| `path` | text | Relative path within the skill folder (e.g. `references/schemas.md`, `scripts/build.py`) |
| `category` | text | One of: `reference`, `script`, `agent`, `asset` |
| `filename` | text | Just the filename (e.g. `schemas.md`) |
| `content` | text | File contents (text-based); vectorized for reference files |
| `description` | text | Optional human description of what this resource is for |
| `mimeType` | text | MIME type (e.g. `text/markdown`, `text/x-python`, `application/octet-stream`) |
| `sizeBytes` | int | File size for display and budget tracking |
| `createdAt` | date | Creation timestamp |
| `updatedAt` | date | Last modification timestamp |

**Constraints:**
- `path` must be unique per `skillId`
- `category` must be one of: `reference`, `script`, `agent`, `asset`
- Category is inferred from path prefix when not explicitly provided: `references/` → `reference`, `scripts/` → `script`, `agents/` → `agent`, `assets/` → `asset`

## Phase 1 — Resource Storage, CRUD, and UI

Phase 1 adds the ability to store, manage, and view resource files attached to skills. After Phase 1, users can create skills with sub-folders of reference docs, scripts, agent prompts, and assets — matching Claude's folder structure.

**SK1 — SkillResource Weaviate Collection Schema** — Planned
Create a new `SkillResource` collection in Weaviate via a migration script (`scripts/migrate-skill-resources-schema.ts`). Properties as defined in the schema table above. Idempotent migration — safe to re-run (checks for existing collection before creating). Logs all changes to stdout.

Sub-agent directive: execute schema migration as a standalone task.

**SK2 — SkillResource Type Definitions** — Planned
Create `lib/skill-resource-types.ts` with:

- `RESOURCE_CATEGORIES = ["reference", "script", "agent", "asset"] as const`
- `ResourceCategory` type
- `SkillResourceListItem`: `id`, `skillId`, `path`, `category`, `filename`, `description`, `mimeType`, `sizeBytes`, `createdAt`, `updatedAt`
- `SkillResourceDetail`: extends list item with `content`
- `SkillResourceCreateInput`: `skillId`, `path`, `category`, `filename`, `content`, `description?`, `mimeType?`
- `SkillResourceUpdateInput`: `content?`, `description?`, `path?`
- Utility: `categorizeByPath(path)` — infers category from path prefix (`references/` → `reference`, etc.)
- Utility: `buildResourceTree(resources)` — groups flat list into a folder tree structure for UI rendering

Follows `lib/skill-types.ts` and `lib/content-types.ts` patterns.

Sub-agent directive: execute type definitions as a standalone task.

**SK3 — SkillResource CRUD Operations** — Planned
Create `lib/skill-resources.ts` with CRUD operations. All functions use `withWeaviate()` from `lib/weaviate.ts`. Follows `lib/skills.ts` and `lib/knowledge.ts` patterns.

| Function | Description |
|---|---|
| `listSkillResources(skillId, category?)` | List all resources for a skill, optionally filtered by category. Sorted by `path` ascending. |
| `getSkillResource(id)` | Get single resource with full content. Returns `null` if not found. |
| `createSkillResource(input)` | Create resource; validates path uniqueness per skill; infers category from path if not provided. Returns created resource ID. |
| `updateSkillResource(id, input)` | Update content, description, or path. Sets `updatedAt`. |
| `deleteSkillResource(id)` | Delete a single resource. |
| `deleteAllSkillResources(skillId)` | Delete all resources for a skill (used on skill deletion). |
| `getSkillResourceByPath(skillId, path)` | Lookup by path within a skill. Returns `null` if not found. |
| `countSkillResources(skillId)` | Count resources for list display. |

Update `lib/skills.ts` `deleteSkill()` to call `deleteAllSkillResources(skillId)` as cleanup.

Extend `SkillDetail` in `lib/skill-types.ts` with `resourceCount: number` and optional `resources?: SkillResourceListItem[]` (populated on detail fetch).

Sub-agent directive: execute CRUD operations as a single task.

**SK4 — SkillResource API Routes** — Planned
Build API routes at `app/api/skills/[id]/resources/` following established patterns from `app/api/skills/`.

| Method | Route | Description | Auth |
|---|---|---|---|
| `GET` | `/api/skills/[id]/resources` | List resources for a skill (optional `?category=` filter) | `requireRole("contributor")` |
| `POST` | `/api/skills/[id]/resources` | Create a new resource file | `requireRole("contributor")` |
| `GET` | `/api/skills/[id]/resources/[resourceId]` | Get resource detail with content | `requireRole("contributor")` |
| `PUT` | `/api/skills/[id]/resources/[resourceId]` | Update resource | `requireRole("contributor")` |
| `DELETE` | `/api/skills/[id]/resources/[resourceId]` | Delete resource | `requireRole("editor")` |

Implementation files: `app/api/skills/[id]/resources/route.ts` (GET list, POST create), `app/api/skills/[id]/resources/[resourceId]/route.ts` (GET detail, PUT update, DELETE).

Sub-agent directive: execute API routes as a single task.

**SK5 — Skill Detail Page: Resource Tree View** — Planned
Update `app/skills/[id]/page.tsx` and create `app/skills/components/resource-tree.tsx`:

- Fetch resources alongside skill detail
- Render a collapsible folder tree grouped by category (`references/`, `scripts/`, `agents/`, `assets/`)
- Each file shows: filename, description (if present), size, last updated
- Clicking a file opens an inline viewer: markdown rendering for `.md` files, syntax-highlighted code view for scripts, raw text for others
- Empty state: "No resource files. Add references, scripts, or agent prompts to extend this skill."
- Resource count badge in the sidebar metadata section

Sub-agent directive: execute resource tree component and detail page updates.

**SK6 — Skill Form: Resource File Management** — Planned
Update `app/skills/components/skill-form.tsx` and create `app/skills/components/resource-editor.tsx`:

- New "Resources" tab/section in the skill form (below the main content editor)
- File tree view showing existing resources (on edit) with add/edit/remove actions
- "Add Resource" button opens a modal with:
  - Path input (e.g. `references/tone-guide.md`) — auto-infers category from prefix
  - Category dropdown (auto-selected from path, overridable)
  - Description input (optional)
  - Content editor: markdown editor for `.md`, code editor for scripts, file upload for assets
- Inline editing: click a resource to edit its content in-place
- Delete confirmation dialog
- On skill create: resources are created via sequential `POST /api/skills/[id]/resources` calls after the skill itself is created
- On skill edit: resources are created/updated/deleted individually

Sub-agent directive: execute resource editor component and form updates.

**SK7 — Import/Export: Full Folder Tree Support** — Planned
Update `lib/skill-package.ts` and the import/export API routes:

**Export** (`GET /api/skills/[id]/export`):
- Fetch all `SkillResource` records for the skill
- Write each resource into the ZIP at its `path` relative to the skill folder (e.g. `my-skill/references/schemas.md`)
- Existing `SKILL.md` + `metadata.json` remain at the root of the skill folder
- Wire up `supportingFiles` on `SkillPackage` during export

**Import** (`POST /api/skills/import`):
- When processing a `.skill` ZIP, read ALL files (not just `SKILL.md` + `metadata.json`)
- Categorize each file by path prefix: `references/` → reference, `scripts/` → script, `agents/` → agent, `assets/` → asset
- Files outside known prefixes: categorize as `reference` with a warning
- Populate `SkillPackage.supportingFiles` with path → content mappings
- Return resource list in the import response so the UI can preview before creation
- On skill creation from import, create `SkillResource` records for each supporting file

Update `docs/CLAUDE_SKILLS_STANDARD.md` to document the full folder structure in export/import.

Sub-agent directive: execute import/export updates as a single task.

**SK8 — Phase 1 Testing and Validation** — Planned
- Unit tests for `lib/skill-resource-types.ts`: `categorizeByPath()`, `buildResourceTree()`
- Unit tests for `lib/skill-resources.ts`: CRUD operations, path uniqueness enforcement, cascade delete
- Integration tests for `/api/skills/[id]/resources` routes: status codes, auth, CRUD
- Import/export round-trip test: export a skill with resources → re-import → verify all resources preserved
- Verify: `npm run build` passes with zero type errors

Sub-agent directive: execute tests, verify build, fix any failures.

**SK9 — Phase 1 Documentation** — Planned
- Update `docs/KNOWLEDGE_BASE.md` with `SkillResource` collection schema
- Update `docs/API.md` with `/api/skills/[id]/resources` route contracts
- Update `docs/BUSINESS_LOGIC.md` with resource categories, progressive disclosure model
- Update `docs/CLAUDE_SKILLS_STANDARD.md` with full folder structure
- Update `docs/CHANGELOG.md` with Group SK Phase 1 entry
- Update `docs/roadmap/README.md` with Group SK row
- Regenerate `.cursor/rules/start.mdc`

Sub-agent directive: execute all doc updates as a single task.

## Phase 2 — Progressive Context Loading and Eval Framework

Phase 2 makes resource files functional at runtime: reference docs are injected into context assembly on demand, and the skill testing interface evolves into a structured eval framework matching Claude's skill-creator pattern.

**SK10 — Progressive Context Assembly** — Planned
Update `lib/context-assembly.ts` to support three-level loading:

**Level 1 — Metadata** (no change, already works): skill `name` + `description` used for selection.

**Level 2 — SKILL.md body** (current behavior, refined): inject `skill.content` when skill activates. Add a size guard: warn if content exceeds 500 lines (matching Claude's recommendation).

**Level 3 — On-demand reference loading**: Parse `skill.content` for explicit resource references (markdown links like `[schemas](references/schemas.md)`). When a resource link is found in the active skill body:
- Fetch the referenced `SkillResource` by path
- Inject its content into the system prompt after the skill body, under a `#### Reference: {filename}` subheading
- Respect a configurable `maxReferenceTokens` budget (default: 2000 tokens per skill) to prevent context bloat
- References marked with a `<!-- always-load -->` comment in the skill body are always injected
- References not explicitly marked are injected only when the user prompt semantically matches the reference description (using Weaviate `nearText` on the resource's vectorized content)

Update `AssembledContext` to track which resources were loaded:

```typescript
skills: Array<{
  id: string;
  name: string;
  version: string;
  loadedResources: Array<{ path: string; reason: string }>;
}>;
```

Sub-agent directive: execute context assembly updates as a standalone task.

**SK11 — Skill Test Page: Structured Eval Framework** — Planned
Extend `/skills/[id]/test` page and API to support structured evaluations matching Claude's skill-creator eval pattern:

**Eval definitions** — stored as a `SkillResource` with category `reference` and path `evals/evals.json`:

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected result",
      "expectations": ["The output includes X", "The skill used Y format"]
    }
  ]
}
```

**UI updates to `/skills/[id]/test`**:
- "Test Cases" tab: list of saved eval prompts with add/edit/remove
- "Run All" button: executes each test case sequentially, streaming results
- Per-test result display: prompt, output, expected vs actual comparison
- "Run with Skill" / "Run without Skill" toggle for baseline comparison
- Results saved to `SkillResource` at `evals/results/iteration-{N}.json`
- System prompt preview includes loaded resources (from SK10)

**API updates**:
- `POST /api/skills/[id]/test/batch` — run multiple test cases, returns results array
- `GET /api/skills/[id]/test/evals` — fetch eval definitions
- `PUT /api/skills/[id]/test/evals` — save eval definitions

Sub-agent directive: execute eval framework as a single task.

**SK12 — External API: Skill Resources** — Planned
Extend `/api/v1/skills` endpoints for external consumers:

| Method | Route | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/skills/[id]/resources` | List resources for a skill | API key required |
| `GET` | `/api/v1/skills/[id]/resources/[resourceId]` | Get resource content | API key required |

Update `docs/EXTERNAL_API.md` with resource endpoints.

Sub-agent directive: execute external API extension as a standalone task.

**SK13 — MCP Server: Skill Resource Tools** — Planned
Extend the MCP server (`mcp-server/src/tools/`) with resource-aware skill tools:

| Tool | Description |
|---|---|
| `list_skill_resources` | List resources for a skill, filtered by category |
| `get_skill_resource` | Retrieve a specific resource file's content |
| `create_skill_with_resources` | Create a skill with inline resource files (full folder submission) |

Update `mcp-server/src/schema.ts` with `SkillResource` metadata. Update `mcp-server/README.md`.

Sub-agent directive: execute MCP tools as a standalone task.

**SK14 — Phase 2 Testing and Validation** — Planned
- Unit tests for progressive context loading: verify reference injection, token budget, semantic matching
- Integration tests for eval framework: batch test execution, result storage
- Integration tests for external API resource endpoints
- Integration tests for MCP resource tools
- Round-trip test: create skill with resources via MCP → fetch via external API → verify resources intact
- Verify: `npm run build` passes

Sub-agent directive: execute tests, verify build, fix any failures.

**SK15 — Phase 2 Documentation** — Planned
- Update all affected docs with Phase 2 additions
- Add user guide: `docs/user-guides/skill-resources.md` covering resource management, progressive loading, eval framework
- Update `docs/CHANGELOG.md` with Group SK Phase 2 entry
- Update N9 in `docs/roadmap/group-n.md` to reference Group SK as the implementation
- Regenerate `.cursor/rules/start.mdc`

Sub-agent directive: execute all doc updates as a single task.

## Risks and Gaps

| Risk | Impact | Mitigation |
|---|---|---|
| Resource content bloats context window | Large reference files exceed Claude's context budget | Token budget per skill (SK10 `maxReferenceTokens`); size validation on upload; content length warnings in UI |
| Weaviate text field size limits | Very large scripts or reference docs may exceed field limits | Validate on create; warn for files > 100KB; consider Vercel Blob for binary assets in future |
| Resource path conflicts on import | Two resources with same path in different imports | Path uniqueness enforced per skill; import validation rejects duplicates |
| Backward compatibility on export | Older importers may not understand resource files in ZIP | Resources are in sub-folders; old importers ignore them and still find `SKILL.md` + `metadata.json` at the expected paths |
| Progressive loading adds latency | Fetching resources during context assembly adds DB calls | Batch-fetch all resources for active skills in one query; cache resources for the duration of the generation |
| Eval framework complexity | Full Claude skill-creator eval loop is very complex | Phase 2 implements the core pattern (test cases, batch run, baseline comparison) without the full grading/benchmark/viewer pipeline. That can be a future Phase 3 if needed. |

**Open Questions:**

| Question | Context |
|---|---|
| Should binary assets (images, fonts) be stored in Weaviate or Vercel Blob? | Text-based resources (markdown, scripts) fit naturally in a Weaviate text field. Binary assets may be better served by Vercel Blob with a URL reference stored in the `SkillResource`. Recommendation: start with text-only resources in Phase 1; add Blob support for binary assets as a future enhancement. |
| Should resource vectorization be selective? | Only `reference` category resources benefit from vectorization (for semantic matching in SK10). Scripts and assets do not. Recommendation: vectorize the `content` field by default (Weaviate handles this); the semantic matching in SK10 only targets reference-category resources. |
| How should resource size limits be enforced? | Claude skills have no explicit size limits, but recommend keeping SKILL.md under 500 lines and loading large references on demand. Recommendation: warn at 100KB per resource, hard limit at 500KB. Aggregate limit per skill: 2MB total resource content. |
| Should the eval framework support parallel test execution? | Claude's skill-creator runs test cases in parallel via sub-agents. Our skill test page runs sequentially. Recommendation: sequential execution in Phase 2 for simplicity. Parallel execution (via background jobs) can be added later. |

## Recommended Build Order

**Phase 1** (sequential within, SK1 → SK9):
1. **SK1 → SK2 → SK3 → SK4** (schema, types, CRUD, API — backend prerequisite)
2. **SK5 → SK6** (UI — depends on API)
3. **SK7** (import/export — depends on CRUD)
4. **SK8 → SK9** (testing and docs — after all implementation)

**Phase 2** (sequential within, SK10 → SK15):
1. **SK10** (progressive context loading — core runtime change)
2. **SK11** (eval framework — depends on SK10 for resource-aware testing)
3. **SK12, SK13** (external API and MCP — can run in parallel, depend on SK3)
4. **SK14 → SK15** (testing and docs — after all implementation)

Phase 1 is independent and can begin immediately. Phase 2 depends on Phase 1 completion.

**Estimated effort:** Phase 1: 3–5 days. Phase 2: 3–5 days.
