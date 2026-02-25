# Content Engine — Project Overview

> Last updated: February 2026

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

- User authentication and role-based access
- Content approval and publishing workflows (defined in [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md), not yet implemented)
- Vercel production deployment (infrastructure is ready; deployment is a pending step)
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

## Repository Structure

```
content-automation/              ← Existing knowledge source (markdown files, seed data)
content-automation-app/          ← Next.js application (this repo)
├── app/
│   ├── page.tsx                 ← Dashboard homepage
│   └── api/chat/route.ts        ← Claude streaming endpoint
├── lib/
│   ├── weaviate.ts              ← Weaviate client (serverless-safe)
│   └── claude.ts                ← Anthropic client (LLM layer)
├── docs/                        ← Project documentation (this folder)
│   ├── README.md                ← This file
│   ├── PRD.md                   ← Product requirements
│   ├── TECH_DECISIONS.md        ← Technology decisions and rationale
│   ├── BUSINESS_LOGIC.md        ← Business rules and content logic
│   └── KNOWLEDGE_BASE.md        ← Weaviate schema and content inventory
├── .env.local                   ← Local credentials (gitignored)
└── .env.example                 ← Credential template (committed)
```

---

## Documentation Index

| Document | Purpose |
|---|---|
| [PRD.md](./PRD.md) | Product modules, functional requirements, user stories |
| [TECH_DECISIONS.md](./TECH_DECISIONS.md) | Technology choices and rationale, alternatives considered |
| [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) | Content generation rules, knowledge relationships, workflow states |
| [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) | Weaviate schema, content inventory, seed plan |

---

## Development Status

| Area | Status | Notes |
|---|---|---|
| Next.js scaffold | Done | App Router, TypeScript, Tailwind v4 |
| Weaviate client | Done | Serverless-safe `withWeaviate` helper in `lib/weaviate.ts` |
| Claude streaming | Done | `streamMessage` + `/api/chat` endpoint |
| Dashboard homepage | Done | Connection status indicators for both services |
| `.env` configuration | Done | Keys required: `WEAVIATE_URL`, `WEAVIATE_API_KEY`, `ANTHROPIC_API_KEY` |
| Weaviate Cloud account | Pending | Sign up at console.weaviate.cloud |
| Credentials in `.env.local` | Pending | Blocked on Weaviate Cloud setup |
| Weaviate collections created | Pending | Schema defined in KNOWLEDGE_BASE.md |
| Seed script | Pending | Imports content-automation/ files into Weaviate |
| Knowledge Base UI | Pending | CRUD interface for knowledge objects |
| Generate UI | Pending | Content generation with context retrieval |
| Content library UI | Pending | Browse and manage generated content |
| Vercel deployment | Pending | After local dev is confirmed working |
| Approval workflows | Future | Defined in BUSINESS_LOGIC.md |
