# Content Engine — Roadmap

> Last updated: March 31, 2026

This is the single source of truth for future plans, phased delivery, deferred scope, and open questions.

---

## Module 1 Build Plan — Knowledge Base

> Scope: Managing knowledge objects and the relationships between them. No content generation in this module.
> Full user stories: see the Module 1 planning document.

Each step below is independently shippable. Steps within a group can be built in parallel; groups should be completed in order.

## Group Status

| Group | Title | Status | Detail |
|-------|-------|--------|--------|
| A | Read Layer | Done | [group-a.md](./group-a.md) |
| B | Write Layer | Done | [group-b.md](./group-b.md) |
| C | Relationship Layer | Done | [group-c.md](./group-c.md) |
| D | Health Dashboard | Done | [group-d.md](./group-d.md) |
| E | Review Queue | Done | [group-e.md](./group-e.md) |
| F | AI Merge Workflow | Done | [group-f.md](./group-f.md) |
| G | Bulk Upload with AI Classification | Done | [group-g.md](./group-g.md) |
| H | Enhanced Change Review Workflows | Done | [group-h.md](./group-h.md) |
| I | Skills Module | Done | [group-i.md](./group-i.md) |
| J | MCP Server | J1–J12 Done, J13–J28 Pending | [group-j.md](./group-j.md) |
| K | External REST API and Connected Systems | Done (Phase 1); K7–K16 Pending | [group-k.md](./group-k.md) |
| M | Knowledge-Linked Skills | Done | [group-m.md](./group-m.md) |
| N | Unified Object Type Support | Planned | [group-n.md](./group-n.md) |
| O | Review Queue Enhancements | Planned | [group-o.md](./group-o.md) |
| P | Content Cleaning Rules | Planned | [group-p.md](./group-p.md) |
| Q | Weaviate Query Agent | Planned | [group-q.md](./group-q.md) |
| R | Content Narratives | Planned | [group-r.md](./group-r.md) |
| S | Design System Foundation | Phase 1-2 Done | [group-s.md](./group-s.md) |
| T | Content Generation Cost Tracking | Planned | [group-t.md](./group-t.md) |
| U | Context Window Budget Management | Planned | [group-u.md](./group-u.md) |
| V | Structured Logging | Planned | [group-v.md](./group-v.md) |
| W | Authentication & User Management | Done | [group-w.md](./group-w.md) |
| X | Context Assembly Test Coverage | Planned | [group-x.md](./group-x.md) |
| Y | Production Redis Configuration | Done | [group-y.md](./group-y.md) |
| Z | CI/CD Pipeline | Planned | [group-z.md](./group-z.md) |
| Content Workflow | Pillar Research Orchestration | CW1–CW10 Done, CW11–CW19 Pending, CW20–CW21 Done | [group-content-workflow.md](./group-content-workflow.md) |
| AA | HG Brand Theming (Dark) | Done | [group-aa.md](./group-aa.md) |
| CL | Content Library | Done (CL1–CL18) | [group-cl.md](./group-cl.md) |
| SK | Skills Resource Parity | Planned (SK1–SK15) | [group-skills.md](./group-skills.md) |

[Cross-Cutting Notes: Groups J and K](./cross-cutting.md)

---

## Phase 1 — Foundation (Current)

### Remaining Work

| Module | What's Left | Requirements |
|---|---|---|
| Knowledge Base UI | Done — all groups (A–I) complete; I6 (Skill Testing Interface) done; I7 (Claude Skill Package Compatibility) done | See [Group I](./group-i.md) |
| Unified Object Type Support | Group N — not yet started. Skill type in submissions/MCP, missing UI types, MCP duplicate detection, schema-change process, skill-type metadata exposure, and internal skill ⇄ Claude bundle mapping | See [Group N](./group-n.md) |
| Review Queue Enhancements | Group O — not yet started. Bulk approve, editable tags, shared TagEditor | See [Group O](./group-o.md) |
| Content Cleaning Rules | Group P — not yet started. New admin module for ingestion-time content cleaning | See [Group P](./group-p.md) |
| Weaviate Query Agent | Group Q — not yet started. Query Agent retrieval + Claude synthesis, Ask UI, collection registry | See [Group Q](./group-q.md) |
| Content Narratives | Group R — not yet started. Strategic narrative layer between knowledge and content generation, AI-assisted creation, review workflow, context assembly integration, staleness detection | See [Group R](./group-r.md) |
| Design System Foundation | Group S Phase 1 done (S1–S3): font fix, semantic tokens, cn() utility, Prettier plugin, DESIGN_TOKENS.md. Phase 2 done (S3.5–S9): Headless UI, Button, Input, Select, Textarea, FormField, Badge atoms, component migration. Phases 3–5 pending: page layout, error boundaries, organism consolidation, standards docs | See [Group S](./group-s.md) |
| MCP Server Observability, Hardening, Skill Interop, and Content Tools | J13–J28 Pending (Phase 3: Hardening, Phase 4: Observability, Phase 5: Shared Library Hardening, Phase 6: Claude Skill Interoperability, Phase 7: Content Library Tools) | See [Group J](./group-j.md) |
| Content Generation Cost Tracking | Group T — not yet started. Token counting, cost metadata, generation cost dashboard, budget alerts | See [Group T](./group-t.md) |
| Context Window Budget Management | Group U — not yet started. Content length limits, token budget allocation, smart truncation, context budget visibility | See [Group U](./group-u.md) |
| Structured Logging | Group V — not yet started. Structured JSON logging (`pino`), request logging middleware, domain event logging, operational logging | See [Group V](./group-v.md) |
| Authentication & User Management | Group W complete (W1–W9): Google OAuth, JWT sessions, User collection, middleware, `requireRole()` + `lib/permissions.ts`, admin user management at `/admin/users`, attribution on knowledge/skills/submissions, custom permission sets at `/admin/roles`, audit log at `/admin/audit` | See [Group W](./group-w.md) |
| Context Assembly and Skill Interop Test Coverage | Group X — not yet started. Unit tests for `assembleContext()`, Claude skill package schema/mapping tests, and env-gated acceptance smoke checks | See [Group X](./group-x.md) |
| Production Redis Configuration | Group Y complete (Y1–Y4): Upstash Redis provisioned, Vercel env vars configured, integration tests (14 tests), .env.example updated | See [Group Y](./group-y.md) |
| CI/CD Pipeline | Group Z — not yet started. GitHub Actions test workflow, MCP server build verification, branch protection | See [Group Z](./group-z.md) |
| Content Library | Group CL complete (CL1–CL18): schema migration, types, CRUD lib, internal API routes (CRUD + workflow), Content Library UI (list, detail, create/edit pages, navigation), editorial workflow UI (toast notifications, session-based creator/reviewer distinction, status guards), dashboard integration, comprehensive tests (81 tests across 6 files), documentation. Unblocks Group K Phase 3 (K13–K16) and Group J Phase 7 (J26–J28) | See [Group CL](./group-cl.md) |
| Generate UI | Module 2 — not yet started. Content type selection, generation prompt, context assembly integration, Claude streaming, save to Content Library. Depends on Group CL (Content Library backend) | See [phase-2.md](./phase-2.md) Module 2 |
| External Content Ingestion | Module 5 — not yet started. Multi-channel content submission via UI, MCP, REST API, bulk import. Depends on Group CL and Module 2 | See [phase-2.md](./phase-2.md) Module 5 |
| Skills Resource Parity | Group SK — not yet started. SkillResource collection, resource CRUD, resource API routes, resource tree UI, resource editor in skill form, full folder tree import/export, progressive context assembly, structured eval framework, external API + MCP resource tools | See [Group SK](./group-skills.md) |
| Content Workflow: Pillar Research Orchestration | CW1–CW10 done (types/store/APIs/artifact contract, template layer, orchestration engine). CW11–CW19 pending: branch implementations, aggregation, reliability expansion. CW20–CW21 done: full test matrix and documentation updates | See [Group Content Workflow](./group-content-workflow.md) |

### Acceptance Criteria

Phase 1 is complete when:

1. Weaviate Cloud is connected and all credentials are in `.env.local` — **Done**
2. All 24 seed knowledge objects (4 personas + 5 segments + 15 use cases) are imported into Weaviate — **Done**
3. Knowledge Base UI allows viewing, creating, editing, and deleting objects — **Done (Groups A + B)**
4. Generate UI produces streaming output from Claude using Weaviate-retrieved context
5. Generated content is saved to Weaviate with metadata
6. Dashboard shows green status for both Weaviate and Claude connections

---

## Phase 2 — Content Management

See [phase-2.md](./phase-2.md) for Module 2 (Generate), Module 3 (Content Library), and Module 4 (Workflows).

---

## Phase 3+ — Backlog

See [phase-3-backlog.md](./phase-3-backlog.md) for Business Rules to Author and Infrastructure & Integrations.

---

## Open Questions

| Question | Context |
|---|---|
| Embedding model | Weaviate Cloud's default vectorizer is used. Collections were created without explicit vectorizer configuration. Group Q task Q1 will discover the active vectorizer and determine whether an inference provider API key is needed for the Query Agent. If retrieval quality needs improvement, configure a specific model (e.g. `text-embedding-3-small` via OpenAI or `text2vec-google` for Gemini alignment). |
| Weaviate Cloud Agent tier | The Query Agent is a Weaviate Cloud service with 1,000 free requests/month per organization. The current Weaviate Cloud plan may need an upgrade to access agent features. Verify plan tier and agent availability before starting Group Q (Q1). |
| Databricks integration | If canonical data (accounts, contacts, segments) already exists in Databricks, a sync pipeline may be more reliable than manual entry. Not in scope for Phase 1 |
| ICP definitions | `ICP` collection exists in Weaviate but no objects have been created yet. Requires persona × segment intersection definitions |

---

## Deferred

See [deferred.md](./deferred.md) for Event Logging & Audit Trails (Content Version History, Relationship History, Workflow Audit Trail).
