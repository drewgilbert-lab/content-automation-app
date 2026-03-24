# Claude Skills Standard

This document defines the repository standard for authoring skills that are compatible with Claude skill packaging (`SKILL.md`-based bundles).

## Scope

- Applies to new skill content authored in this repository.
- Applies to API/MCP import-export contracts that serialize skill content for Claude-compatible usage.
- Complements roadmap work in `docs/roadmap/group-i.md`, `docs/roadmap/group-n.md`, `docs/roadmap/group-j.md`, and `docs/roadmap/group-x.md`.

## Canonical Package Shape

Each skill package is a folder:

```text
skill-name/
├── SKILL.md                # required
├── reference.md            # optional
├── examples/               # optional
│   └── sample.md
└── scripts/                # optional
    └── helper.sh
```

`SKILL.md` is the canonical entrypoint and must include YAML frontmatter at the top.

## SKILL.md Requirements

Frontmatter fields:

- Required:
  - `name`: lowercase letters, numbers, and hyphens only; max 64 chars.
  - `description`: clear activation guidance for when Claude should use the skill.
- Optional:
  - `disable-model-invocation` (boolean)
  - `user-invocable` (boolean)
  - `allowed-tools` (string or list, depending on implementation)
  - `context` (for example `fork`)
  - `agent` (subagent type when `context` is set)
  - `argument-hint`, `model`, `hooks`

Body requirements:

- Markdown body contains operational instructions and expected output behavior.
- Keep `SKILL.md` concise; move large references into supporting files and link them from the body.
- Reference optional files explicitly (for example `[reference.md](reference.md)`).

## Repository Authoring Rules

- Store reusable templates at `.claude/skills/_template/`.
- Use one skill directory per skill, named to match `name` (kebab-case).
- Do not include secrets, tokens, or credentials in `SKILL.md` or scripts.
- Include at least one example section showing expected inputs/outputs for non-trivial skills.
- If scripts are included, document runtime assumptions in the skill body.

## Internal Skill Object Mapping

When converting between internal `Skill` objects and `SKILL.md` packages:

- `name` -> frontmatter `name`
- `description` -> frontmatter `description`
- `content` -> markdown body
- `contentType`, `category`, `tags`, `parameters`, `outputFormat`, `triggerConditions` -> preserved as structured metadata in API/MCP payloads and/or package-side companion metadata files when needed.

If a field cannot be represented directly in `SKILL.md`, conversion logic must:

1. Preserve it in a documented companion structure, and
2. Mark round-trip behavior in tests as intentionally lossy/non-lossy.

## Export and Import APIs

### Export: `GET /api/skills/[id]/export`

Downloads a skill as a `.skill` ZIP file containing:
- `{skill-name}/SKILL.md` — frontmatter + markdown body
- `{skill-name}/metadata.json` — internal fields not representable in frontmatter (`contentType`, `category`, `tags`, `parameters`, `outputFormat`, `version`, `author`, `triggerConditions`, `sourceKnowledgeObjects`)

### Import: `POST /api/skills/import`

Accepts `multipart/form-data` with a `file` field (`.skill` ZIP or raw `SKILL.md`). Returns the parsed `SkillCreateInput` and validation warnings for review before creation.

### CLI Packager: `scripts/package-skill.ts`

TypeScript reimplementation of Claude's `package_skill.py`. Same interface and exclusion rules.

```bash
npx tsx scripts/package-skill.ts <path/to/skill-folder> [output-directory]
```

Exclusion rules: `__pycache__`, `node_modules`, `*.pyc`, `.DS_Store`, `evals/` (at skill root only).

## Companion Metadata File

`metadata.json` stores internal Content Engine fields that have no representation in the `SKILL.md` frontmatter:

```json
{
  "contentType": ["email", "blog"],
  "category": "content_generation",
  "tags": ["marketing"],
  "parameters": [{ "name": "tone", "type": "select", "description": "...", "required": false, "options": ["formal", "casual"] }],
  "outputFormat": "Markdown document with H2 sections",
  "version": "1.2.0",
  "author": "marketing-team"
}
```

When importing a `.skill` package that includes `metadata.json`, these fields are merged into the `SkillCreateInput`. When importing a bare `SKILL.md` without metadata, only `name`, `description`, and `content` are populated.

## Validation and Testing Baseline

At minimum, tests must verify:

- Frontmatter is parseable and includes required fields.
- `name` and `description` meet constraints (`name`: `/^[a-z0-9][a-z0-9-]*[a-z0-9]$/`, max 64 chars).
- Internal-to-package and package-to-internal conversion is deterministic.
- Invalid payloads return stable, machine-readable validation errors.
- Round-trip `skillToPackage -> packageToSkillInput` preserves all non-lossy fields.

Test coverage: `__tests__/lib/skill-package.test.ts` (42 tests), `__tests__/api/skills-export-route.test.ts`, `__tests__/api/skills-import-route.test.ts`.

Optional live checks (env-gated) can validate acceptance with Claude-connected flows.

