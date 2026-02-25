# Content Engine — Changelog

> Newest entries first. Last updated: February 2026

---

## 2026-02-25

### Added
- `docs/ROADMAP.md` — single source for phases, future modules, backlog, open questions
- `scripts/seed.ts` — collection creation + 26 object seed + 49 cross-references
- `npm run seed` script, `dotenv` and `tsx` dev dependencies

### Changed — Docs Restructuring
- Eliminated content overlap across all docs; each file now has a single responsibility
- `SCOPE.md` — removed repo structure and doc index (duplicated in README/start.mdc)
- `PRD.md` — stripped to requirements only; removed vision, seed inventory, content types, future modules; added pointers
- `BUSINESS_LOGIC.md` — removed workflow states and planned business rules (moved to ROADMAP.md)
- `KNOWLEDGE_BASE.md` — updated seed inventory status from "Pending seed" to "Seeded"
- `TECH_DECISIONS.md` — removed Open Questions (moved to ROADMAP.md)
- Updated `docs-maintenance.mdc`, `start.mdc`, and `README.md` to include ROADMAP.md

### Changed
- `.env.example` now includes `CONTENT_REPO_PATH`

### Infrastructure
- Weaviate Cloud connected, all collections seeded

---

## 2026-02-24

### Added
- `.cursor/rules/start.mdc` — slim always-on project context rule (~50 lines)
- `.cursor/rules/weaviate-patterns.mdc` — glob-triggered Weaviate schema and connection pattern reference
- `.cursor/rules/api-patterns.mdc` — glob-triggered API route contracts and code patterns
- `.cursor/rules/content-logic.mdc` — glob-triggered content generation logic and context assembly
- `.cursor/rules/docs-maintenance.mdc` — description-only rule for sub-agent doc update delegation
- `.cursor/rules/sync-start.mdc` — description-only rule for manual start.mdc regeneration
- `docs/CHANGELOG.md` — this file
- `docs/API.md` — API route reference

### Changed
- Replaced boilerplate `README.md` with project-specific setup guide

---

## 2026-02-23

### Added
- Next.js 16 scaffold with App Router, TypeScript, Tailwind CSS v4
- `lib/weaviate.ts` — serverless-safe Weaviate client with `withWeaviate` helper and connection check
- `lib/claude.ts` — Anthropic client with `streamMessage` streaming and connection check
- `app/api/chat/route.ts` — POST endpoint for Claude streaming
- `app/page.tsx` — dashboard homepage with Weaviate and Claude connection status indicators
- `.env.example` — credential template
- `docs/PRD.md` — product requirements, modules, user stories
- `docs/TECH_DECISIONS.md` — architecture decision records (ADR-001 through ADR-005)
- `docs/BUSINESS_LOGIC.md` — knowledge object types, context assembly, content types, workflow states
- `docs/KNOWLEDGE_BASE.md` — Weaviate schema, content inventory, cross-reference design, seed plan
- `docs/SCOPE.md` — project overview, goals, development status
