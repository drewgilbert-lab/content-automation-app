# Content Engine — Technology Decisions

> Last updated: March 24, 2026
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

**Current Model:** `claude-opus-4-5` (update in `lib/claude.ts`, `lib/classifier.ts`, and `lib/skills.ts` to change; see ADR-013)

---

## ADR-004: Deployment Platform

**Status:** Implemented

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

**Production URL:** `https://content-automation-app-zeta.vercel.app`

**GitHub:** `drewgilbert-lab/content-automation-app` connected to Vercel project — auto-deploys on push to `main`.

**Environment Variables Configured:**
- `WEAVIATE_URL` (production + preview)
- `WEAVIATE_API_KEY` (production + preview)
- `ANTHROPIC_API_KEY` (production + preview)
- `NEXT_PUBLIC_MCP_SERVER_URL` (production + preview)
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — configured (Group Y, ADR-022); enables rate limiting and Redis-backed upload sessions

**Deployment Notes:**
- `vercel.json` created with security headers (`X-Content-Type-Options`, `X-Frame-Options`) for `/api/v1/` routes
- `tsconfig.json` excludes `mcp-server` to prevent build failures (MCP server is built separately on Railway)
- Data-fetching pages marked with `export const dynamic = "force-dynamic"` to prevent build-time pre-rendering — see ADR-016

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
`X-API-Key` header with constant-time comparison (`crypto.timingSafeEqual`). Per-system API keys managed via the `ConnectedSystem` Weaviate collection with SHA-256 hashed storage, 8-character prefix for admin identification, and an in-memory `globalThis` cache (refreshed every 5 minutes). Key rotation supported via `POST /api/connections/[id]/rotate-key`. All external API requests are logged to stdout: `{ timestamp, apiKeyPrefix, endpoint, method, statusCode, durationMs }`.

**Response Security:**
All `/api/v1/` responses include: `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, `X-Frame-Options: DENY`. CORS denied by default; configurable via `ALLOWED_ORIGINS` env var for browser-based consumers.

**Rate Limiting:**
Upstash Redis + `@upstash/ratelimit` for serverless-compatible rate limiting. Per-key limits: 100 req/min standard tier, 300 req/min elevated tier, 20 req/min semantic search (all tiers). Sliding window algorithm. Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

**Implications:**
- New routes under `app/api/v1/` — separate from internal routes at `app/api/`
- `lib/api-auth.ts` for key generation, hashing, validation, rotation, and cache management
- `lib/api-middleware.ts` for `withApiAuth()` wrapper applying auth, rate limiting, security headers, CORS, and request logging
- `ConnectedSystem` Weaviate collection for per-system key management with admin UI at `/connections`
- New environment variables: `WEAVIATE_READER_API_KEY` (Weaviate read-only user for external API), `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, optionally `ALLOWED_ORIGINS`
- Weaviate-level defense-in-depth: external API routes connect to Weaviate as `content-engine-api-reader` (read-only) rather than the admin user — see ADR-014
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
- Classification originally used `claude-sonnet-4-20250514`; now uses `claude-opus-4-5` per ADR-013

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

## ADR-011: pdf-parse v1.x Downgrade

**Status:** Decided

**Context:**
During bulk upload testing, the "Upload & Parse" button silently failed. The root cause: `pdf-parse` v2.x depends on `DOMMatrix`, a browser-only API unavailable in Node.js. Additionally, the library was loaded via a module-level `require()`, meaning a crash in the PDF library prevented all file types from parsing.

**Decision:** Downgrade `pdf-parse` from `^2.4.5` to `^1.1.1` and change the import from a module-level `require()` to a lazy `await import()` inside `extractPdf()`.

**Rationale:**
- v1.x uses `pdf.js` APIs compatible with Node.js — no browser dependencies
- Lazy import isolates PDF library failures to PDF parsing only; Markdown, DOCX, and TXT parsing are unaffected
- v1.x is the most widely deployed version in the Node.js ecosystem and remains actively used

**Implications:**
- If a future `pdf-parse` v2.x release adds Node.js support, re-evaluate the upgrade
- Any new format-specific parser libraries should follow the same lazy-import pattern

---

## ADR-012: `globalThis` for In-Memory Session Store in Dev Mode

**Status:** Decided

**Context:**
During development with Next.js Turbopack, the in-memory upload session store (`lib/upload-session.ts`) lost all session data on every file save. Turbopack re-evaluates modules on hot reload, which re-initializes module-level variables — including the `sessions` Map and cleanup timer. This caused sessions created by one API route to be invisible to other routes after a code change.

**Decision:** Move the `sessions` Map and cleanup `setInterval` timer to `globalThis` so they survive module re-evaluation.

**Rationale:**
- `globalThis` persists across Turbopack module re-evaluations in the same Node.js process
- This is the standard pattern used by database clients (e.g., Prisma) in Next.js dev mode
- Production is unaffected — serverless functions do not re-evaluate modules within a single invocation

**Implementation:**
```typescript
const g = globalThis as typeof globalThis & {
  __uploadSessions?: Map<string, UploadSession>;
  __uploadCleanupTimer?: ReturnType<typeof setInterval>;
};
if (!g.__uploadSessions) g.__uploadSessions = new Map();
if (!g.__uploadCleanupTimer) g.__uploadCleanupTimer = setInterval(cleanup, 60_000);
```

**Implications:**
- Any future in-memory stores used across API routes in dev should follow the same `globalThis` pattern
- This does not replace the need for Redis or a persistent store in production (see Group G risks)

---

## ADR-013: Claude Model Selection

**Status:** Superseded (March 2026 — switched to Opus)

**Context:**
The project originally used `claude-opus-4-5` for streaming content generation (`lib/claude.ts`) and `claude-sonnet-4-20250514` for document classification (`lib/classifier.ts`). During active development with frequent iteration, the cost and latency of these models was disproportionate to the need, so all call sites were temporarily switched to `claude-haiku-4-5`.

**Options Considered:**

| Option | Cost | Latency | Quality |
|---|---|---|---|
| claude-opus-4-5 | Highest | Highest | Best |
| claude-sonnet-4-20250514 | Medium | Medium | Strong |
| claude-haiku-4-5 | Lowest | Fastest | Good for structured tasks |

**Decision:** Switch all call sites to `claude-opus-4-5`.

**History:**
- Initially used Opus/Sonnet for production-quality output
- Temporarily switched to Haiku 4.5 during development to reduce cost and latency
- Switched back to Opus for production-quality content generation, classification, and skill evaluation

**Call sites (all using `claude-opus-4-5`):**
- `lib/claude.ts` — streaming content generation and connection health check
- `lib/classifier.ts` — document classification
- `lib/skills.ts` — skill refresh significance evaluation

**Implications:**
- Higher cost per API call — monitor usage if volume increases
- Better output quality for content generation, classification accuracy, and skill evaluation
- Consider using environment-variable-based model selection (`CLAUDE_MODEL`) in the future to avoid code changes between environments

---

## ADR-014: Weaviate Multi-User Access Control (Defense-in-Depth)

**Status:** Decided (pending implementation with Group K)

**Context:**
The application currently uses a single `WEAVIATE_API_KEY` (admin-level) for all Weaviate operations across all access channels: the Next.js admin UI, internal API routes, and the planned external REST API and MCP server. If any channel is compromised, the attacker has full admin access to every Weaviate collection. Weaviate Cloud supports user management and RBAC (v1.30+), allowing multiple API keys with scoped permissions per collection.

**Options Considered:**

| Option | Notes |
|---|---|
| Single admin key (current) | Simplest; all channels share full access; highest blast radius |
| Multiple Weaviate users with scoped roles | Each channel gets a dedicated key with least-privilege permissions; requires managing multiple env vars |
| Application-level auth only (no Weaviate RBAC) | Simpler env setup; relies entirely on application code for access control; no defense-in-depth |

**Decision:** Create distinct Weaviate users with scoped custom roles for each access channel.

**Rationale:**
- Defense-in-depth: even if application-level API key auth is bypassed, the Weaviate user limits what an attacker can do
- Principle of least privilege: the external REST API only needs read access; the MCP server only needs read + submission creation
- Weaviate Cloud supports this natively via user management API (v1.30+) at no additional cost
- The `withWeaviate` helper already accepts connection parameters — adding an optional key parameter is minimal effort
- Aligns with Weaviate's own security recommendations for production deployments

**User Mapping:**

| Weaviate User | Role | Permissions | Used By | Env Var |
|---|---|---|---|---|
| `content-engine-admin` | `admin` | Full CRUD on all collections | Next.js admin UI, review queue | `WEAVIATE_API_KEY` (existing) |
| `content-engine-api-reader` | `api_reader` | Read-only on Persona, Segment, UseCase, BusinessRule, ICP, Skill | External REST API (`/api/v1/`) | `WEAVIATE_READER_API_KEY` (new) |
| `content-engine-mcp` | `mcp_access` | Read on knowledge + create on Submission | MCP server (Groups J/L) | `WEAVIATE_MCP_API_KEY` (new) |

**Implications:**
- Two new environment variables: `WEAVIATE_READER_API_KEY`, `WEAVIATE_MCP_API_KEY`
- `lib/weaviate.ts` `withWeaviate` helper accepts an optional `apiKey` parameter to select the Weaviate user
- Weaviate users and roles must be created via the Weaviate Cloud console or API before deployment
- Internal collections (`Submission`, `GeneratedContent`, `ConnectedSystem`, `PushLog`) are never exposed to the `api_reader` role
- When user Auth/RBAC is added (Phase 3+), OIDC groups can be mapped to Weaviate roles for end-to-end identity propagation

---

## ADR-015: MCP Server Architecture

**Status:** Decided (implemented)

**Context:**
The Content Engine needs to be accessible from MCP-compatible clients (Claude Desktop, Claude Code, Cursor, Gemini) for direct knowledge base access without context-switching to the web UI. MCP (Model Context Protocol) requires a long-running process with persistent connections, which conflicts with Vercel's stateless serverless model.

**Options Considered:**

| Option | Notes |
|---|---|
| Standalone Node.js process (`@modelcontextprotocol/sdk`) | Full MCP protocol support, persistent connections, separate hosting required |
| Next.js API route adapter | Fits Vercel serverless but limited by 60s timeout, no persistent state, must shim MCP framing |
| Official Weaviate MCP server | Generic, lacks domain-specific features (health dashboard, formatted responses, knowledge-type awareness) |

**Decision:** Standalone Node.js process using `@modelcontextprotocol/sdk` v1.x, deployed on Railway, separate from the Next.js app.

**Rationale:**
- Full SDK lifecycle management without serverless constraints
- Dual transport: stdio for local LLM clients, Streamable HTTP for remote access
- Imports shared `lib/` modules (knowledge, submissions, skills, api-auth) via dynamic imports to avoid duplicating business logic
- Persistent Weaviate client (unlike the per-request `withWeaviate` pattern in Next.js) appropriate for a long-running process
- Railway provides always-on hosting with auto-deploy from GitHub, health checks, and public domains
- ESM module format (`"type": "module"`) to match SDK expectations
- MCP SDK v1.x chosen over v2 (pre-alpha, not production-ready as of March 2026)

---

## ADR-016: `force-dynamic` on Data-Fetching Pages

**Status:** Decided (implemented)

**Context:**
During the Vercel production build, Next.js attempts to pre-render pages at build time by default. Pages that fetch from Weaviate (dashboard, knowledge list, queue, skills, connections) fail during pre-rendering because the Weaviate client requires runtime environment variables that are not available at build time. This causes the build to fail or produce stale/empty pages.

**Decision:** Mark all data-fetching pages with `export const dynamic = "force-dynamic"`.

**Affected Pages:**
- `app/page.tsx` (homepage — checks Weaviate/Claude connection status)
- `app/dashboard/page.tsx`
- `app/knowledge/page.tsx`
- `app/knowledge/new/page.tsx`
- `app/queue/page.tsx`
- `app/skills/page.tsx`
- `app/connections/page.tsx`

**Rationale:**
- `force-dynamic` tells Next.js to always render these pages at request time, never at build time
- Weaviate connection requires `WEAVIATE_URL` and `WEAVIATE_API_KEY` which are only available at runtime in Vercel's serverless environment
- This is the standard Next.js pattern for pages that depend on runtime data sources
- No performance impact for an internal tool — these pages are not public-facing and not cached by CDN

**Implications:**
- Any new page that fetches from Weaviate or another runtime data source must include `export const dynamic = "force-dynamic"`
- Static pages (layout, error boundaries) are unaffected

---

## ADR-017: Upload Session Store — Redis Migration for Serverless

**Status:** Decided (implemented)

**Context:**
The upload session store (`lib/upload-session.ts`) originally used an in-memory `globalThis.__uploadSessions` Map (see ADR-012). This worked in local development but is incompatible with Vercel's serverless architecture: each function invocation runs in an isolated container, so sessions created by one API route (e.g. `/api/bulk-upload/parse`) are invisible to subsequent routes (e.g. `/api/bulk-upload/classify`) because they execute in different containers with separate memory spaces.

**Options Considered:**

| Option | Notes |
|---|---|
| In-memory Map (`globalThis`) | Works in dev; fails in serverless — sessions lost across invocations |
| Upstash Redis (`@upstash/redis`) | Serverless-compatible; HTTP-based; used by the project for rate limiting (ADR-007) |
| Vercel KV | Vercel-native Redis; adds vendor lock-in |
| Database (Weaviate) | Possible but adds schema complexity for ephemeral session data |

**Decision:** Migrate to `@upstash/redis` with graceful fallback to in-memory for local development.

**Rationale:**
- Upstash Redis is already a project dependency (used for rate limiting in `lib/rate-limit.ts`)
- HTTP-based Redis client works natively in serverless environments — no persistent connections needed
- Graceful fallback: when `UPSTASH_REDIS_REST_URL` is not configured, the store falls back to in-memory, so local development works without Redis
- 24-hour TTL on session keys matches the original in-memory cleanup interval
- All upload session functions (`createSession`, `getSession`, `updateClassification`, `setUserEdit`, `deleteUserEdit`, `getSerializedSession`) are now async and Redis-backed

**New Function:** `deleteUserEdit(sessionId, documentIndex)` added for proper Redis-backed session mutation (removing a user edit from a session requires a read-modify-write cycle in Redis).

**Implications:**
- All consumer API routes (`parse`, `classify`, `session/[sessionId]`, `reclassify`, `approve`) updated to `await` the now-async session functions
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` should be configured in Vercel for production upload session support; without them, upload sessions fall back to in-memory (which may lose data across serverless invocations)
- ADR-012 (`globalThis` pattern) is superseded for upload sessions but remains valid for other in-memory caches (e.g. API key cache in `lib/api-auth.ts`)

---

## ADR-018: Content Workflow Telemetry and Metrics (CW18)

**Status:** Decided (implemented)

**Context:**
The content workflow orchestration (Group Content Workflow) needs structured observability for run/branch/step lifecycle, failure diagnostics, and operational dashboards. Long-running workflows require logs and metrics without blocking execution.

**Options Considered:**

| Option | Notes |
|---|---|
| External logging service (Datadog, LogDNA) | Full-featured; adds dependency and cost; overkill for Phase 1 |
| Structured JSON to stdout + in-memory aggregation | Simple; works in serverless; no new infra; logs visible in Vercel/Railway |
| Redis-backed log store | Persistent; requires Redis; adds latency and complexity |

**Decision:** Structured JSON logs to stdout with `scope: "content-workflow"`, plus in-memory per-run log aggregation (`globalThis`) for diagnostics API. Metrics snapshot computed on demand from run/branch/step store.

**Rationale:**
- stdout logs are captured by Vercel/Railway and can be shipped to external log aggregators later
- In-memory aggregation is sufficient for single-instance dev and low-volume Phase 1; aligns with ADR-012 pattern
- Metrics snapshot (`GET /api/content-workflow/metrics`) aggregates from durable run store — no separate metrics DB
- `GET /api/content-workflow/runs/failed` and `GET /api/content-workflow/runs/:id/diagnostics` provide dead-letter and replay tooling

**Implications:**
- `lib/content-workflow-telemetry.ts` provides `logWorkflow()`, `listWorkflowLogs()`, `getWorkflowMetricsSnapshot()`
- Log entries include `runId`, `branchId`, `stepId`, `event`, `level`, `durationMs`, `failureClass`, `metrics`
- Platform-wide structured logging (Group V) may later replace or augment this workflow-specific approach

---

## ADR-019: Auth.js v5 with Google OAuth (Group W)

**Status:** Decided (implemented)

**Context:**
The application had no user authentication on internal routes. All API routes and pages were accessible without sign-in, which is acceptable for a single-user tool but blocks multi-user access, per-user attribution, and role-based access control. Authentication is a prerequisite for the permission model planned in W5–W7.

**Options Considered:**

| Option | Notes |
|---|---|
| Auth.js v5 (`next-auth@beta`) | Native App Router support; JWT sessions; edge-compatible middleware; built-in Google provider; no database adapter required for Phase 1 |
| Clerk | Managed auth SaaS; excellent DX; adds external SaaS dependency and cost |
| Custom OAuth implementation | Full control; significantly more code to build and maintain; no built-in session management |
| `iron-session` | Lightweight encrypted cookies; no OAuth flow built-in; would need custom Google OAuth integration |

**Decision:** Auth.js v5 (`next-auth@beta`) with Google OAuth provider.

**Rationale:**
- Native App Router support with `auth()` wrapper for middleware and route handlers
- JWT session strategy requires no database adapter — session data lives in a signed cookie, validated on every request
- 1-hour `maxAge` on JWT sessions balances security with UX (short-lived tokens reduce revocation window)
- Domain restriction via `ALLOWED_DOMAINS` env var checks the Google Workspace `hd` (hosted domain) parameter during sign-in; `ALLOWED_EMAILS` adds individual account allowlisting
- Server-side active flag check: every `requireAuth()` call fetches the user record from a cached Weaviate lookup, so deactivated users are blocked even with a valid JWT
- Edge-compatible — middleware runs in the Edge Runtime for fast redirects on unauthenticated page requests
- `requireRole(role)` helper enables Phase 2 RBAC without changing the auth foundation

**User Record Strategy:**
- `User` Weaviate collection (non-vectorized) auto-created on first sign-in
- `getOrCreateUser()` handles bootstrap: creates user record if email not found
- First user gets `admin` role; overridable via `ADMIN_EMAIL` env var
- Subsequent users default to `contributor` role
- User records cached in `globalThis` with 5-minute TTL (same pattern as API key caching in `lib/api-auth.ts`)

**Environment Variables Required:**
```
GOOGLE_CLIENT_ID=       # From Google Cloud Console OAuth 2.0
GOOGLE_CLIENT_SECRET=   # From Google Cloud Console OAuth 2.0
NEXTAUTH_URL=           # App base URL (e.g. http://localhost:3000)
NEXTAUTH_SECRET=        # Random secret for JWT signing (openssl rand -base64 32)
ALLOWED_DOMAINS=        # Comma-separated Google Workspace domains (e.g. company.com)
ALLOWED_EMAILS=         # Comma-separated individual email allowlist (optional)
ADMIN_EMAIL=            # Override first-user-is-admin bootstrap (optional)
```

**Edge Runtime Constraint — Critical:**
- `lib/auth.ts` is imported by `middleware.ts`, which runs in the **Edge runtime**
- `lib/auth.ts` must NEVER import modules that depend on Node.js APIs (Weaviate, audit, users, permission-sets, etc.)
- Server-side auth helpers (`requireAuth`, `requireRole`, `requirePermission`, `getCurrentUser`) live in `lib/auth-server.ts`, which can import anything since API routes run in Node.js
- Audit logging for auth events (sign-in, sign-out) is handled in `lib/auth-server.ts`, not in NextAuth callbacks
- See `.cursor/rules/auth-edge-safety.mdc` for the enforced rule

**Implications:**
- All 36 internal API route files import auth helpers from `lib/auth-server.ts` (not `lib/auth.ts`)
- `middleware.ts` imports only `auth` from `lib/auth.ts` (Edge-safe)
- `middleware.ts` redirects unauthenticated page visits to `/auth/signin`; public paths: `/auth/*`, `/api/auth/*`, `/api/v1/*`
- External API routes (`/api/v1/*`) unaffected — continue using API key auth (Group K)
- JWT has no server-side revocation; mitigated by 1-hour expiry + active flag check on every request

---

## ADR-020: Permission Set Architecture (Group W Phase 3)

**Status:** Decided (implemented)

**Context:**
The application uses a fixed 4-role hierarchy (Admin, Editor, Contributor, Viewer) with a static permission matrix in `lib/permissions.ts`. While sufficient for basic access control, organizations need the ability to create custom permission configurations without modifying code — for example, a "Content Manager" role that can review submissions but not manage connected systems, or a "Data Steward" role with read access plus bulk upload permissions.

**Options Considered:**

| Option | Notes |
|---|---|
| More fixed roles | Simple to implement; requires code changes for each new role; does not scale |
| Direct permission arrays on User | Maximum flexibility per user; no reusable sets; harder to audit who has what |
| PermissionSet Weaviate collection | Reusable named sets; users reference a set via ID; cacheable; same CRUD patterns as existing collections |
| External auth service (Auth0, Clerk) | Feature-rich; adds external SaaS dependency, cost, and complexity |

**Decision:** `PermissionSet` Weaviate collection with granular permission arrays. Users reference a set via `permissionSetId`. Backward-compatible fallback to the static role matrix when no set is assigned.

**Rationale:**
- **Backward compatible**: Existing users with no `permissionSetId` continue using the static role matrix unchanged
- **Cacheable**: Permission sets are cached with 5-minute TTL using the established `globalThis` pattern (ADR-012), same as User and API key caches
- **Same patterns**: CRUD operations follow the existing Weaviate collection patterns (list, get, create, update, delete) used by ConnectedSystem, Skill, and other collections
- **Built-in protection**: Four default sets matching the fixed roles are seeded on collection creation and marked `isBuiltIn: true` — they cannot be deleted, providing a safety net
- **Granular**: Permission strings (e.g. `knowledge:read`, `submissions:review`, `admin:users`) allow fine-grained control without role escalation

**Resolution Logic:**
```
resolvePermissions(user):
  1. If user.permissionSetId is set → fetch PermissionSet → return its permissions array
  2. Else → return ROLE_PERMISSIONS[user.role] (static matrix)
```

**Implications:**
- `lib/permission-sets.ts` handles PermissionSet CRUD with Weaviate
- `lib/permissions.ts` exports `resolvePermissions()` and `userHasPermission()` for runtime permission checks
- `lib/auth-server.ts` provides `requirePermission()` for route-level enforcement
- Admin UI at `/admin/roles` for managing permission sets
- All permission set mutations are audit logged (W9)

---

## Decision Log

| ADR | Decision | Date | Status |
|---|---|---|---|
| ADR-001 | Next.js 16 App Router | Feb 2026 | Decided |
| ADR-002 | Weaviate Cloud | Feb 2026 | Decided |
| ADR-003 | Anthropic Claude (current) | Feb 2026 | Decided |
| ADR-004 | Vercel | Feb 2026 | Implemented |
| ADR-005 | Tailwind CSS v4 | Feb 2026 | Decided |
| ADR-006 | Consolidated MCP Server (standalone Node.js) | Feb 2026 | Decided (implemented) |
| ADR-007 | REST API Gateway (`/api/v1/`) | Feb 2026 | Pending implementation |
| ADR-008 | Document Parsing Libraries (pdf-parse, mammoth) | Feb 2026 | Decided |
| ADR-009 | SSE Streaming for Bulk Classification Progress | Feb 2026 | Decided |
| ADR-010 | Test Framework (Vitest) | Feb 2026 | Decided |
| ADR-011 | pdf-parse v1.x Downgrade | Feb 2026 | Decided |
| ADR-012 | `globalThis` for In-Memory Session Store (Dev) | Feb 2026 | Decided |
| ADR-013 | Claude Model Selection | Feb 2026 | Superseded (Opus) |
| ADR-014 | Weaviate Multi-User Access Control | Feb 2026 | Pending implementation |
| ADR-015 | MCP Server Architecture (J1-J4) | Mar 2026 | Decided (implemented) |
| ADR-016 | `force-dynamic` on Data-Fetching Pages | Mar 2026 | Decided (implemented) |
| ADR-017 | Upload Session Store — Redis Migration | Mar 2026 | Decided (implemented) |
| ADR-018 | Content Workflow Telemetry and Metrics (CW18) | Mar 2026 | Decided (implemented) |
| ADR-019 | Auth.js v5 with Google OAuth (Group W) | Mar 2026 | Decided (implemented) |
| ADR-020 | Permission Set Architecture (Group W Phase 3) | Mar 2026 | Decided (implemented) |
| ADR-021 | Semantic Design Tokens via Tailwind v4 @theme inline (Group S) | Mar 2026 | Decided (implemented) |
| ADR-022 | Production Redis Configuration (Group Y) | Mar 2026 | Decided (implemented) |
| ADR-023 | Lucide React Icon Library (Group AA Phase 2) | Mar 2026 | Decided (implemented) |

---

### ADR-021: Semantic Design Tokens via Tailwind v4 @theme inline

**Status:** Decided (implemented)
**Date:** March 2026
**Context:** The app accumulated ~791 raw gray-* class references and 43+ repeated card/input shell patterns with hardcoded Tailwind primitives. This created visual drift and made systematic theming impossible.
**Decision:** Define semantic design tokens (surfaces, borders, text, actions, status, spacing, sizing, radii) in `app/globals.css` via Tailwind v4's `@theme inline` directive. Tokens map primitives to semantic names (e.g., `gray-900` → `surface-card`). Components consume tokens via standard Tailwind utilities (e.g., `bg-surface-card`). Additionally, add `clsx` + `tailwind-merge` with a shared `cn()` helper in `lib/utils.ts` for class composition, and `prettier-plugin-tailwindcss` for deterministic class ordering.
**Consequences:** New components must use semantic tokens, not raw palette classes. The token layer is additive — existing hardcoded classes continue to work during incremental migration. The `cn()` utility replaces template-literal class composition patterns (44 instances identified for migration).

---

### ADR-022: Production Redis Configuration (Group Y)

**Status:** Decided (implemented)
**Date:** March 2026
**Context:** Two production features depend on Upstash Redis: bulk upload session persistence (`lib/upload-session.ts`, ADR-017) and external API rate limiting (`lib/rate-limit.ts`, ADR-007). Both modules already include graceful fallback — in-memory sessions and no rate limiting, respectively — when Redis credentials are absent. In production on Vercel, the in-memory fallback is unreliable because serverless functions cold-start frequently, losing upload session state.
**Decision:** Provision an Upstash Redis database (free tier, us-east-1 region to match Vercel deployment) and configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` as Vercel environment variables for Production and Preview environments. Added integration test suite at `__tests__/integration/redis-validation.test.ts` (14 tests) validating Redis round-trips, rate limiting enforcement, and graceful fallback behavior.
**Consequences:** Upload sessions now survive serverless cold starts. Rate limiting is enforced on the external API. The free tier provides 10,000 commands/day; if exceeded, features degrade gracefully rather than crashing. Credentials are stored only in Vercel environment variables (encrypted at rest), never committed to the repository.

---

### ADR-023: Lucide React Icon Library

**Status:** Decided (implemented)
**Date:** March 2026
**Context:** The app previously used Unicode glyphs for navigation icons. The navigation shell (Group AA Phase 2) required consistent, accessible icons across the sidebar, top bar, and page headers.
**Decision:** Use `lucide-react` for all UI icons in the Content Engine.
**Rationale:** Lucide is tree-shakeable (only imported icons are bundled), has a consistent 24x24 grid sizing, supports `className` and `size` props for easy Tailwind integration, and is the de facto standard for Next.js/React projects.
**Alternative rejected:** Heroicons (larger bundle per icon), custom SVGs (maintenance burden).
**Implications:** All new icon usage should import from `lucide-react`. Existing Unicode glyphs in pages outside the navigation shell can be migrated incrementally.

---

Open questions and future technical investigations are tracked in [roadmap/README.md](./roadmap/README.md).
