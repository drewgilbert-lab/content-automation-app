# Content Engine — Technology Decisions

> Last updated: February 2026
> Format: Architecture Decision Records (ADR)

Each decision is recorded with the context, the options considered, the choice made, and the rationale. This document is updated as new decisions are made or existing decisions are revisited.

---

## ADR-001: Frontend Framework

**Status:** Decided

**Context:**
We need a frontend framework that deploys easily to Vercel, supports server-side rendering for performance, has a strong TypeScript ecosystem, and allows API routes to be built alongside the UI without a separate backend service.

**Options Considered:**

| Option | Notes |
|---|---|
| Next.js (App Router) | First-party Vercel support, mature ecosystem, server components, built-in API routes |
| SvelteKit | Lighter, faster, but smaller ecosystem and fewer Vercel-native integrations |
| Nuxt | Vue-based, good Vercel support, but smaller community than Next.js |

**Decision:** Next.js 16 with App Router

**Rationale:**
- Native Vercel integration — zero configuration for deployment
- App Router enables server components that can query Weaviate at render time without client-side waterfalls
- Largest ecosystem and community; most hiring-friendly choice
- API routes in `app/api/` handle Claude streaming without a separate backend

**Implications:**
- Use `export const runtime = "nodejs"` on any route that uses Weaviate or Anthropic SDKs (not compatible with Edge Runtime)
- Server Components handle data fetching; Client Components handle interactive UI

---

## ADR-002: Database / Knowledge Store

**Status:** Decided

**Context:**
We need a database to store company knowledge (personas, segments, use cases, ICP, business rules) and retrieve it as context for AI content generation. The primary access pattern is semantic retrieval: "find the knowledge objects most relevant to this generation request."

**Options Considered:**

| Option | Notes |
|---|---|
| Weaviate Cloud | Purpose-built vector database; best-in-class semantic search; LLM-agnostic; auto-vectorization; official MCP server |
| SurrealDB | Multi-model (graph + document + relational); easier to start; native graph edges; requires manual embedding pipeline for semantic search |
| Neo4j AuraDB | Best-in-class graph database; rich edge properties; added vector search in v5; steeper learning curve |
| FalkorDB | Purpose-built for GraphRAG; newer, smaller community |
| Vercel Postgres (Neon) | Native Vercel integration; standard SQL; no semantic search capability |

**Decision:** Weaviate Cloud (v3 TypeScript client — `weaviate-client`)

**Rationale:**
- Semantic retrieval is the most critical capability for this system — it determines the quality of Claude's context and therefore the quality of generated content
- Weaviate auto-vectorizes content on insert using a configured embedding model, eliminating the need to build and maintain a manual embedding pipeline
- Entirely LLM-agnostic: Weaviate stores and retrieves knowledge; the LLM provider is a separate concern
- Official MCP server (`weaviate/surrealmcp`) enables direct Claude-to-Weaviate access in future agentic workflows
- Free tier on Weaviate Cloud supports our volume (<5,000 objects)
- Enterprise-grade: SOC 2 Type II, GDPR/HIPAA compliant

**Connection Pattern:**
Vercel functions are stateless. A module-level singleton connection would persist indefinitely and leak resources. Instead, a `withWeaviate` helper in `lib/weaviate.ts` creates a fresh connection per request and always calls `client.close()` in a `finally` block:

```typescript
export async function withWeaviate<T>(
  fn: (client: WeaviateClient) => Promise<T>
): Promise<T> {
  const client = await weaviate.connectToWeaviateCloud(url, { authCredentials });
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}
```

**Environment Variables Required:**
```
WEAVIATE_URL=         # REST endpoint from Weaviate Cloud console
WEAVIATE_API_KEY=     # Admin API key from Weaviate Cloud console
```

**Implications:**
- All Weaviate operations must use the `withWeaviate` wrapper
- Collections (schema) must be created before seeding data
- Weaviate does not support complex graph traversal with rich edge properties — cross-references are simple directional links. This is sufficient for our current use case.

---

## ADR-003: LLM Provider

**Status:** Decided (with explicit future flexibility)

**Context:**
We need an LLM for content generation. The choice must not create architectural lock-in, as the AI model landscape is evolving rapidly and we may switch providers.

**Options Considered:**

| Option | Notes |
|---|---|
| Anthropic Claude (claude-opus-4-5) | Strong reasoning and writing quality; official SDK; streaming support |
| Google Gemini | Competitive quality; native Google ecosystem; `text2vec-google` pairs well with Weaviate |
| OpenAI GPT-4 | Most widely used; strong ecosystem; higher cost |

**Decision:** Anthropic Claude via `@anthropic-ai/sdk` (current provider)

**Rationale:**
- Strong long-form writing and instruction-following for content generation use cases
- Official SDK with native streaming support
- Existing API access

**LLM-Agnostic Architecture:**
The LLM provider is fully isolated to `lib/claude.ts`. The rest of the application — Weaviate retrieval, API routes, UI — has no direct dependency on Anthropic. Swapping to Gemini or another provider requires only:
1. Replace `lib/claude.ts` with `lib/gemini.ts` (or a generic `lib/ai.ts`)
2. Update `ANTHROPIC_API_KEY` env var to the new provider's key
3. No changes to Weaviate, routes, or UI

**Weaviate + LLM Relationship:**
Weaviate is used **purely as a retrieval layer**. The LLM API key is never passed to Weaviate. Weaviate does not call the LLM. Context is retrieved from Weaviate, assembled in the API route, and sent to the LLM as a system prompt. This keeps the two services fully decoupled.

**Environment Variables Required:**
```
ANTHROPIC_API_KEY=    # From console.anthropic.com
```

**Current Model:** `claude-opus-4-5` (update in `lib/claude.ts` to change)

---

## ADR-004: Deployment Platform

**Status:** Decided (pending execution)

**Context:**
We need a deployment platform that works seamlessly with Next.js, supports environment variable management, and enables CI/CD from GitHub.

**Options Considered:**

| Option | Notes |
|---|---|
| Vercel | First-party Next.js support; auto-deploys from GitHub; env var UI; generous free tier |
| AWS (Amplify / ECS) | More control; more complex; higher operational overhead |
| Self-hosted | Maximum control; requires infrastructure management |
| Railway | Simpler than AWS; good Next.js support; not as tight as Vercel |

**Decision:** Vercel

**Rationale:**
- Zero-configuration deployment for Next.js
- Environment variables managed in the Vercel dashboard and automatically injected at build time
- Preview deployments on every PR branch
- Aligns with Next.js App Router features (streaming, server components)

**Deployment Steps (Pending):**
1. Push `content-automation-app/` to a GitHub repository
2. Connect the repo to a Vercel project at vercel.com
3. Add `WEAVIATE_URL`, `WEAVIATE_API_KEY`, and `ANTHROPIC_API_KEY` to Vercel environment variables
4. Deploy — Vercel auto-builds and deploys on every push to `main`

---

## ADR-005: Styling

**Status:** Decided

**Context:**
We need a styling approach that is fast to work with, consistent, and compatible with Next.js.

**Decision:** Tailwind CSS v4

**Rationale:**
- Included by default in `create-next-app`
- Utility-first approach is fast for building internal tools
- v4 has improved performance and configuration

---

## Decision Log

| ADR | Decision | Date | Status |
|---|---|---|---|
| ADR-001 | Next.js 16 App Router | Feb 2026 | Decided |
| ADR-002 | Weaviate Cloud | Feb 2026 | Decided |
| ADR-003 | Anthropic Claude (current) | Feb 2026 | Decided |
| ADR-004 | Vercel | Feb 2026 | Pending execution |
| ADR-005 | Tailwind CSS v4 | Feb 2026 | Decided |

---

## Open Questions

- **Embedding model:** Weaviate Cloud's default vectorizer will be used initially. If retrieval quality needs improvement, we can configure a specific embedding model (e.g. `text-embedding-3-small` via OpenAI or `text2vec-google` for Gemini alignment).
- **Databricks integration:** The company uses Databricks as an operational data platform. If canonical data (accounts, contacts, segments) already exists there, a future sync pipeline from Databricks → Weaviate may be more reliable than manual entry. This is not in scope for Phase 1.
