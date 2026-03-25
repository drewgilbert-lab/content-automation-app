# Content Engine — Project Overview

> Last updated: March 25, 2026

## What This Is

The Content Engine is an internal AI-powered platform that stores company knowledge — personas, account segments, use cases, ICP definitions, and business rules — and uses that knowledge as context to generate marketing content and power AI agents.

It is not a general-purpose CMS. It is a **context engine**: a structured, queryable knowledge store that makes Claude's output more accurate, on-brand, and strategically aligned by grounding every generation request in real company data.

---

## Project Scope

### In Scope

- Store, edit, and manage company knowledge objects: personas, account segments, use cases, ICP, business rules
- Retrieve the most semantically relevant knowledge as context for AI content generation
- Generate marketing content: emails, blogs, thought leadership, social posts, internal documentation
- Support future content approval workflows (defined, not yet built)

### Out of Scope (Current Phase)

- Role-based access control enforcement (Phase 2 — W5–W7; authentication foundation is done, RBAC permission checks are planned)
- Content approval and publishing workflows (defined in [roadmap/README.md](./roadmap/README.md), not yet implemented)
- Integration with external systems (CRM, MAP, social platforms)
- Multi-tenant or customer-facing use

---

## Goals

| Goal | Description |
|---|---|
| Single source of truth | All company knowledge lives in one queryable place, not scattered across documents and chat threads |
| AI-ready context | Knowledge is stored and retrieved in a format optimized for LLM consumption |
| Content consistency | Every generated piece is grounded in the same approved personas, segments, and business rules |
| LLM flexibility | The system is provider-agnostic — Claude can be swapped for Gemini or another model without structural changes |
| Maintainability | Knowledge can be updated by non-technical users; changes propagate to all future generations |

---

See [README.md](../README.md) for repo structure and full documentation index.

---

## Development Status

| Area | Status | Notes |
|---|---|---|
| Next.js scaffold | Done | App Router, TypeScript, Tailwind v4 |
| Weaviate client | Done | Serverless-safe `withWeaviate` helper in `lib/weaviate.ts` |
| Claude streaming | Done | `streamMessage` + `/api/chat` endpoint |
| Dashboard homepage | Done | Connection status indicators for both services |
| `.env` configuration | Done | Keys required: `WEAVIATE_URL`, `WEAVIATE_API_KEY`, `ANTHROPIC_API_KEY` |
| Weaviate Cloud account | Done | Sign up at console.weaviate.cloud |
| Credentials in `.env.local` | Done | Weaviate connected; Claude API key pending |
| Weaviate collections created | Done | Schema defined in KNOWLEDGE_BASE.md |
| Seed script | Done | Imports content-automation/ files into Weaviate |
| Knowledge Base UI | Done | Groups A–I done (I1–I5); I6 (Skill Testing Interface) deferred |
| Authentication & User Management | Done (W1–W9) | Group W complete: Google OAuth, JWT sessions, domain restriction, User collection, requireRole() on all routes, permission matrix (lib/permissions.ts), admin user management UI, user attribution (createdBy/updatedBy), custom permission sets (PermissionSet collection, /admin/roles), audit log (AuditLog collection, /admin/audit) |
| Generate UI | Pending | Content generation with context retrieval |
| Content Library | Phase 1-3 Done (CL1–CL12) | Backend foundation + internal API routes + UI: schema migration, types, CRUD lib, API routes (CRUD + workflow), Content Library UI (list, detail, create/edit pages, sidebar nav, home page card). Editorial workflow UI refinements pending (Phase 4). |
| Vercel deployment | Done | Production: `https://content-automation-app-zeta.vercel.app` — auto-deploys from `drewgilbert-lab/content-automation-app` on push to main |
| Production Redis (Upstash) | Done (Group Y) | Upstash Redis configured for rate limiting + upload session persistence; graceful fallback when unavailable |
| Skills module | Done (Group I) | Skill CRUD, library UI, context assembly, migration; I6 (testing) deferred |
| Content Narratives | Planned (Group R) | Strategic narrative layer: schema, CRUD, UI, AI-assisted creation, review workflow, context assembly, staleness detection, external API/MCP; not yet started |
| Design System Foundation | Phase 1-2 Done (Group S) | Phase 1-2 done: font fix, semantic tokens, cn() utility, Prettier plugin, shared atom components (Button, Input, Select, Textarea, FormField, Badge). Phases 3–5 pending: page layout, error boundaries, organism consolidation |
| HG Brand Theming | Phase 1-4 Done (Group AA) | Phase 1: Token migration to HG navy-tinted dark palette. Phase 2: Sidebar navigation, app shell, top bar, accent bar. Phase 3: Typography scale and content styling. Phase 4: Page-level styling migration — all page surfaces and shared components migrated from raw Tailwind classes to semantic tokens. Phase 5 pending: data visualization and status styling |
| Inbound MCP server | Phase 1 Read Done | J1-J8 done: foundation, auth, read tools, resources, search, client config; J9+ (write) pending |
| External REST API | Done (Phase 1) | K1–K6 complete: ConnectedSystem schema, API key auth, versioned read API at /api/v1/, admin UI at /connections, Upstash rate limiting, 42 tests; see roadmap/README.md Group K |
| LLM MCP server (RAG) | Phase 1 Read Done | J1-J8 done: transport, auth, 7 read tools, 3 resources, semantic search, client config; Phase 2 (write) pending |
| Approval workflows | Future | Defined in roadmap/README.md |
