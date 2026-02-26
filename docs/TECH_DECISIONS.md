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

## ADR-006: MCP Server Architecture (Groups J, L)

**Status:** Decided (pending implementation)

**Context:**
Groups J (Inbound MCP for 3rd party write access) and L (MCP for LLM read access / RAG) both require an MCP server that connects to Weaviate. Key decisions: standalone process vs. integrated into Next.js, transport protocol, hosting, and whether to consolidate into a single server.

**Options Considered:**

| Option | Notes |
|---|---|
| Standalone Node.js process | Full MCP SDK lifecycle; long-running with persistent Weaviate connection; requires separate hosting |
| Next.js API route adapter | Fits Vercel serverless model but limited by 60s timeout; must shim MCP protocol into request/response |
| Two separate servers (J and L) | Clean separation of write and read concerns; doubled infrastructure and maintenance |
| Single consolidated server | One process, shared Weaviate connection and auth; tool namespace or key scope controls access |

**Decision:** Single standalone Node.js process with `@modelcontextprotocol/sdk`, consolidating Groups J and L into one `mcp-server/` project.

**Rationale:**
- MCP servers are long-running processes with persistent connections — incompatible with Vercel's stateless serverless model
- A single server reduces infrastructure (one deploy, one Weaviate connection, one auth layer) while exposing both read tools (for LLMs) and write-to-submission tools (for automation)
- Tool namespaces or API key scopes control which tools are available per client connection
- Dual transport: **stdio** (primary, for Claude Desktop/Code/Cursor — local, zero network config) and **SSE over HTTP** (secondary, for Gemini, remote access, and general HTTP clients)

**Weaviate Connection Pattern:**
Unlike the Next.js `withWeaviate` per-request pattern (ADR-002), the MCP server uses a **persistent** client connection created at startup and reused for all tool calls. This is appropriate because the MCP server is a long-lived process, not a stateless function. Reconnection logic with exponential backoff handles connection drops.

**Hosting:**
Requires a platform supporting long-running Node.js processes. Options: Railway, Fly.io, or a dedicated Vercel Function with Fluid Compute. Separate URL from the Next.js app (e.g. `mcp.content-engine.example.com`).

**Implications:**
- `mcp-server/` directory with its own `package.json` and `tsconfig.json`
- Shares `lib/` modules with Next.js app where possible; duplicates schema definitions where framework coupling prevents sharing
- Separate deployment pipeline from the Vercel-hosted Next.js app
- API key authentication on Streamable HTTP / SSE transport; stdio is inherently local and secure

---

## ADR-007: External REST API Gateway (Group K)

**Status:** Decided (pending implementation)

**Context:**
External internal tools need programmatic read access to knowledge objects. Three approaches were evaluated: sharing raw Weaviate credentials, building a REST API gateway, and building a GraphQL layer.

**Options Considered:**

| Option | Notes |
|---|---|
| Direct Weaviate access | Lowest setup; exposes raw schema including internal collections; no business logic layer; highest schema coupling |
| REST API gateway (`/api/v1/`) | Moderate setup; reuses existing `lib/knowledge.ts`; versioned responses; business logic applied; Vercel-native |
| GraphQL API layer | Higher setup; excellent query flexibility; additional dependency and schema maintenance |

**Decision:** REST API gateway at `/api/v1/` within the existing Next.js app.

**Rationale:**
- Matches existing REST route patterns — new routes mirror `app/api/knowledge/` but with auth, versioning, and stable response shapes
- Reuses `lib/knowledge.ts` functions directly — no logic duplication
- Runs natively on Vercel serverless — no additional infrastructure
- Versioned from day one (`/v1/` prefix) — response contracts can evolve without breaking consumers
- Business logic applied: deprecated objects filtered, cross-references resolved to names, internal collections (`Submission`, `GeneratedContent`) never exposed
- GraphQL can be layered on top later if flexible nested queries become needed

**Authentication:**
`X-API-Key` header with constant-time comparison (`crypto.timingSafeEqual`). Phase 1: single key in `CONTENT_ENGINE_API_KEY` environment variable. Future: multi-key model with per-consumer metadata.

**Rate Limiting:**
Upstash Redis + `@upstash/ratelimit` for serverless-compatible rate limiting. 100 req/min global, 20 req/min for semantic search.

**Implications:**
- New routes under `app/api/v1/` — separate from internal routes at `app/api/`
- `lib/api-auth.ts` and `lib/api-middleware.ts` for auth and rate limiting wrappers
- New environment variables: `CONTENT_ENGINE_API_KEY`, optionally `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- OpenAPI spec at `public/openapi.json` (stretch goal) for consumer documentation

---

## ADR-008: Document Parsing Libraries (pdf-parse, mammoth)

**Status:** Decided

**Context:**
Group G (Bulk Upload) requires extracting text content from uploaded files in four formats: Markdown, plain text, PDF, and DOCX. We need server-side libraries that work in the Node.js runtime (Next.js API routes on Vercel).

**Options Considered:**

| Option | Format | Notes |
|---|---|---|
| `pdf-parse` | PDF | Wraps Mozilla's `pdf.js`; pure JS, no native dependencies; extracts text only (no OCR) |
| `pdf-lib` | PDF | Focused on PDF creation/modification, not text extraction |
| `pdfjs-dist` | PDF | Mozilla's PDF.js directly; more control but more setup |
| `mammoth` | DOCX | Converts DOCX to text or HTML; ships own types; lightweight |
| `docx4js` | DOCX | Lower-level DOCX parser; more complex API |

**Decision:** `pdf-parse` for PDF, `mammoth` for DOCX. Markdown and plain text use native `TextDecoder`.

**Rationale:**
- `pdf-parse` is the most widely used PDF text extraction library in Node.js, zero native dependencies, works in serverless environments
- `mammoth` is purpose-built for DOCX-to-text conversion with a simple `extractRawText()` API
- Both are pure JavaScript — no compiled binaries that would complicate Vercel deployment
- Known limitation: `pdf-parse` cannot OCR scanned/image-based PDFs. This is documented and flagged to users when extraction returns empty text.

---

## ADR-009: SSE Streaming for Bulk Classification Progress

**Status:** Decided

**Context:**
The bulk classification endpoint (G2) processes documents sequentially — each document requires a Claude API call taking 2-10 seconds. For a batch of 50 documents, the total processing time could exceed 5 minutes. The UI needs real-time progress feedback.

**Options Considered:**

| Option | Notes |
|---|---|
| Server-Sent Events (SSE) | Unidirectional server→client stream; native browser `EventSource` API; simple implementation |
| WebSockets | Bidirectional; overkill for one-way progress updates; requires ws library |
| Polling | Client polls a status endpoint; higher latency; more requests; requires session storage |
| Long polling | Simpler than WebSockets but more complex than SSE for this use case |

**Decision:** SSE via `ReadableStream` in the Next.js route handler

**Rationale:**
- SSE is the simplest protocol for server→client streaming — exactly what progress reporting needs
- The existing codebase already uses `ReadableStream` for Claude token streaming (`lib/claude.ts`), so the pattern is established
- No additional dependencies required — SSE works with native `fetch` and `EventSource` in the browser
- Four event types provide granular feedback: `progress` (starting), `result` (classified), `error` (per-document failure), `done` (summary)
- Classification uses `claude-sonnet-4-20250514` (not opus) to balance cost and quality for the structured JSON classification task

---

## ADR-010: Test Framework (Vitest)

**Status:** Decided

**Context:**
The project had no test framework. G1/G2 introduced the first test suite (57 tests). Need a fast, TypeScript-native test runner compatible with the existing ESM + path alias (`@/`) setup.

**Options Considered:**

| Option | Notes |
|---|---|
| Vitest | Vite-native, fast, TypeScript out of the box, ESM-first, compatible with `@/` aliases |
| Jest | Widely used but requires `ts-jest` or `@swc/jest` for TypeScript, CJS-first |

**Decision:** Vitest

**Rationale:**
- Zero-config TypeScript support with path alias resolution via `vitest.config.ts`
- Sub-second test runs (57 tests in ~1s)
- API compatible with Jest (`describe`, `it`, `expect`, `vi.mock`) for familiarity
- ESM-native — matches the project's module system

---

## Decision Log

| ADR | Decision | Date | Status |
|---|---|---|---|
| ADR-001 | Next.js 16 App Router | Feb 2026 | Decided |
| ADR-002 | Weaviate Cloud | Feb 2026 | Decided |
| ADR-003 | Anthropic Claude (current) | Feb 2026 | Decided |
| ADR-004 | Vercel | Feb 2026 | Pending execution |
| ADR-005 | Tailwind CSS v4 | Feb 2026 | Decided |
| ADR-006 | Consolidated MCP Server (standalone Node.js) | Feb 2026 | Pending implementation |
| ADR-007 | REST API Gateway (`/api/v1/`) | Feb 2026 | Pending implementation |
| ADR-008 | Document Parsing Libraries (pdf-parse, mammoth) | Feb 2026 | Decided |
| ADR-009 | SSE Streaming for Bulk Classification Progress | Feb 2026 | Decided |
| ADR-010 | Test Framework (Vitest) | Feb 2026 | Decided |

---

Open questions and future technical investigations are tracked in [ROADMAP.md](./ROADMAP.md).
