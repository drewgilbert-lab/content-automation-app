> Back to [Roadmap Index](./README.md)

# Group J — MCP Server

> Scope: A single MCP server that exposes the Content Engine's knowledge base to any MCP-compatible client — LLMs (Claude Desktop, Claude Code, Cursor, Gemini), automation workflows (n8n, Zapier), Slack bots, and custom scripts. Phase 1 provides read access (RAG interface for LLMs). Phase 2 adds write access where external tools propose knowledge changes routed through the existing review queue. Phase 3 hardens the server for production use. Phase 4 adds observability and monitoring. Phase 5 stabilizes the shared library boundary between the MCP server and the Next.js app.
> Dependencies: Groups A–F (knowledge CRUD, submission/review queue, AI merge), [Group K](./group-k.md) (ConnectedSystem model, API key patterns). Optionally benefits from Group I (Skills) — exposed if the Skill collection exists.

## Why This Matters

The Content Engine is currently accessible only through its own web UI and the REST API ([Group K](./group-k.md)). Users working in AI tools must context-switch to the web app to look up personas, use cases, or segments. External automation workflows cannot push content into the system without manual copy-paste.

Group J addresses both needs with a single MCP server:

- **LLM read access (RAG):** A user working in Claude Desktop types *"What personas do we have and what are their key pain points?"* Claude calls the MCP server's `list_objects` tool, receives the full content, and answers grounded in the company's actual knowledge base. A user in Cursor asks *"Find use cases related to predictive scoring"* and the MCP server runs a semantic search, returning the most relevant objects ranked by vector similarity. This eliminates context switching, unlocks semantic search from any LLM conversation, and enables AI assistants to ground responses in approved company knowledge.

- **Inbound write access:** External automation workflows (n8n, Zapier), AI agents (Slack bots, browser extensions, internal copilots), and custom scripts connect as MCP clients, propose new or updated knowledge objects, and those proposals enter the same admin review queue used by the web UI. The admin retains full control — the review queue is the universal gatekeeper regardless of content source. The knowledge base becomes a platform, not just an app.

## Architecture

The MCP server is a **standalone Node.js process** using the `@modelcontextprotocol/sdk` TypeScript SDK, separate from the Next.js app. MCP servers are long-running processes that maintain persistent connections, which conflicts with Vercel's stateless serverless model.

The server imports the same `lib/submissions.ts`, `lib/knowledge.ts`, and `lib/knowledge-types.ts` modules used by the Next.js API routes. This avoids duplicating business logic — the MCP server is a thin transport layer that translates MCP tool calls into the same function calls the API routes make.

| Consideration | Standalone process | Next.js API route adapter |
|---|---|---|
| MCP protocol compliance | Full SDK lifecycle management | Must shim MCP framing into Next.js request/response |
| Vercel deployment | Requires separate hosting (Railway, Fly.io) | Fits serverless model but limited by 60s timeout, no persistent state |
| Session management | Can hold MCP session state in memory | Stateless — must externalize all session state |

**Recommendation:** Standalone process deployed on Railway or Fly.io, separate URL from the Next.js app (e.g. `mcp.content-engine.example.com`).

**Transport:** Two modes. Primary: **stdio** (standard input/output), used by Claude Desktop, Claude Code, and Cursor — the LLM spawns the MCP server as a child process. Secondary: **Streamable HTTP** (the stateless HTTP-based transport defined in the MCP spec) for remote connections from cloud-hosted LLMs, web tools, automation workflows, or adapter layers. Transport selected via CLI flag (`--transport stdio` or `--transport http --port 3100`). Both transports use the same tool and resource handlers.

**Authentication:** Extends the existing `ConnectedSystem` model from [Group K](./group-k.md). The `permissions` field on `ConnectedSystem` (currently `["read"]` for REST API access) is extended with `"mcp-read"` and `"mcp-write"` scopes to control which tool sets are available per client. The same `apiKeyHash` validation and `globalThis` caching pattern from `lib/api-auth.ts` is reused by the MCP server's authentication layer. stdio transport (local) does not require API key auth by default. Streamable HTTP transport (network-accessible) requires API key auth.

```
mcp-server/
  src/
    index.ts              — Entry point, server initialization, transport selection
    auth.ts               — API key validation middleware (extends lib/api-auth.ts patterns)
    weaviate.ts           — Persistent Weaviate client with reconnection
    schema.ts             — Collection metadata, cross-ref config
    formatters.ts         — Response formatting for LLM consumption
    tools/                — MCP tool handlers (one file per tool)
      list-collections.ts
      list-objects.ts
      get-object.ts
      search-objects.ts
      get-relationships.ts
      get-dashboard-health.ts
      get-collection-schema.ts
      create-object.ts    — Phase 2
      update-object.ts    — Phase 2
      check-status.ts     — Phase 2
    resources/            — MCP resource handlers
  package.json
  tsconfig.json
  README.md               — Setup instructions for Claude Desktop, Claude Code, Cursor
```

## Phase 1: Foundation + Read Access (RAG)

The highest-value deliverable — give LLMs direct read access to the knowledge base.

**J1 — Project Scaffolding** ✅ Done
Initialize `mcp-server/` with `package.json`, `tsconfig.json`, and dependencies (`@modelcontextprotocol/sdk`, `weaviate-client`, `dotenv`, `zod`). Build script (TypeScript → JavaScript via `tsc`), dev script with watch mode. Update root `README.md` with pointer to `mcp-server/README.md`.

**J2 — Server Process + Transport Layer** ✅ Done
Build the MCP server as a standalone Node.js process using `@modelcontextprotocol/sdk`. Implement two transport modes: stdio (primary, for Claude Desktop/Code/Cursor) and Streamable HTTP (secondary, for remote access). Transport selected via CLI flag. The server registers all tools, starts the listener, and validates the Weaviate connection on startup. Entry point at `mcp-server/src/index.ts`.

**J3 — Weaviate Connection Management** ✅ Done
Build `mcp-server/src/weaviate.ts` with a **persistent** Weaviate client (differs from the Next.js `withWeaviate` per-request pattern). Creates a single `WeaviateClient` at startup and reuses for all tool calls. Exposes `getClient()` and `reconnect()` functions. Validates connection via `client.isReady()` on startup with exponential backoff retry (1s, 2s, 4s, 8s, max 30s) on failure.

**J4 — Authentication** ✅ Done
Extend the `ConnectedSystem` model from [Group K](./group-k.md) with `"mcp-read"` and `"mcp-write"` permission scopes. Reuse `apiKeyHash` validation and `globalThis` caching patterns from `lib/api-auth.ts`. stdio transport does not require API key auth by default (local-only). Streamable HTTP transport requires API key in `Authorization: Bearer <key>` header. Permission scope controls which tools are available per connection.

**J5 — Read Tools** ✅ Done
Expose tools that allow MCP clients to explore the knowledge base. These are the core RAG interface.

| Tool | Description | Input | Returns |
|---|---|---|---|
| `list_collections` | All knowledge base collections with object counts and descriptions | None | `{ name, type, description, objectCount, crossReferences }` per collection |
| `list_objects` | List objects with optional type filtering and pagination | `type?`, `includeDeprecated?`, `limit?` (default 50, max 200), `offset?` | `{ id, name, type, tags, deprecated, createdAt, updatedAt }` per object |
| `get_object` | Full detail of a single object by ID | `id` (string) | Full detail including markdown content, metadata, `crossReferences` grouped by label |
| `search_objects` | Semantic search using Weaviate `nearText` (core RAG capability) | `query` (string), `type?`, `limit?` (default 10, max 25), `certaintyThreshold?` (default 0.5) | Results ranked by vector similarity: `{ id, name, type, content (500-char snippet), tags, score }` |
| `get_relationships` | All outbound and inbound relationships for an object | `id` (string) | `{ objectId, objectName, objectType, outbound: Record<string, {id, name, type}[]>, inbound: ... }` |
| `get_dashboard_health` | Knowledge base health metrics (counts, stale, gaps) | None | Aggregated counts (compact for LLM context windows) |
| `get_collection_schema` | Schema definition for collections | `type?` | Property names, data types, descriptions, cross-reference definitions. Static from `schema.ts` |

Collection descriptions and cross-reference metadata hardcoded in `schema.ts` (mirroring `KNOWLEDGE_BASE.md`). Multi-collection search runs `nearText` against each target collection in parallel, merges results, sorts by certainty. Response formatting optimized for LLM consumption: structured JSON with clear field names, content snippets truncated to 500 characters to prevent context window overflow. The LLM calls `get_object` for full content when needed.

**J6 — MCP Resources** ✅ Done
Static and dynamic resources that help LLMs understand the knowledge base before querying.

| Resource | URI | Description |
|---|---|---|
| Knowledge Base Overview | `knowledge://overview` | Static markdown: what the Content Engine is, what each collection stores, how objects relate |
| Relationship Map | `knowledge://relationships` | Text representation of the cross-reference graph (all directional relationships) |
| Collection Summaries | `knowledge://collections/{type}` | Dynamic: count, list of names, common tags for a collection. Updated on each read |

**J7 — Semantic Search Design** ✅ Done

1. LLM calls `search_objects` with natural language `query` (e.g. "territory planning for enterprise accounts")
2. MCP server sends query to Weaviate as `nearText` search across specified collections (or all if unfiltered)
3. Weaviate vectorizes the query and compares against stored content vectors
4. Results returned ranked by certainty score (cosine similarity)
5. MCP server formats results with `id`, `name`, `type`, `score`, and content snippet
6. LLM receives results and can call `get_object` on any result for full content

**J8 — LLM Client Configuration** ✅ Done
Document integration in `mcp-server/README.md` with setup instructions for each supported client.

| LLM Client | Transport | Support | Notes |
|---|---|---|---|
| Claude Desktop | stdio | Native | Add to `claude_desktop_config.json` |
| Claude Code | stdio | Native | Same stdio mechanism |
| Cursor | stdio | Native | Add to `.cursor/mcp.json` |
| Gemini | Streamable HTTP | Supported via adapter | HTTP transport mode is compatible |
| ChatGPT | HTTP | Adapter required | Does not natively support MCP; defer adapter to Phase 3 |

Example `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "content-engine": {
      "command": "node",
      "args": ["<path>/mcp-server/dist/index.js"],
      "env": {
        "WEAVIATE_URL": "<url>",
        "WEAVIATE_API_KEY": "<key>"
      }
    }
  }
}
```

Phase 1 priority: stdio for Claude Desktop / Claude Code / Cursor, plus Streamable HTTP for Gemini and general HTTP access.

## Phase 1 Example Interactions

**Exploring personas:** User asks *"Show me all our personas and their key pain points."* → LLM calls `list_objects({ type: "persona" })`, then `get_object` for each → synthesizes pain points from content.

**Semantic search:** User asks *"Find knowledge objects related to territory planning."* → LLM calls `search_objects({ query: "territory planning" })` → receives ranked results across UseCases, Personas, Segments with relevance scores.

**Relationship exploration:** User asks *"What segments are linked to the Sales persona?"* → LLM calls `list_objects({ type: "persona" })` to find Sales ID, then `get_relationships({ id })` → returns linked segments and use cases.

**Health check:** User asks *"Give me a summary of our knowledge base health."* → LLM calls `get_dashboard_health()` → returns total counts, stale items, gaps, missing objects.

## Phase 2: Write Access (Inbound Submissions)

Add the inbound write channel — external tools push content through the review queue. All writes create Submission records; nothing writes directly to Weaviate knowledge collections.

**J9 — Write Tools** ✅ Done
Expose tools that create Submission records entering the review queue.

| Tool | Description | Key Input | Returns |
|---|---|---|---|
| `create_knowledge_object` | Propose a new knowledge object for review | `objectType`, `name`, `content`, `tags?`, type-specific fields, `sourceDescription?` | `{ submissionId, status: "pending" }` |
| `update_knowledge_object` | Propose an update to an existing object | `objectId`, any writable fields, `sourceDescription?` | `{ submissionId, status: "pending", targetObjectId }` |
| `check_submission_status` | Check the status of a previously created submission | `submissionId` | `{ submissionId, status, reviewComment?, reviewedAt? }` |

Write tool flow: validate input → serialize proposed fields into `proposedContent` JSON → call `createSubmission()` with `sourceChannel: "mcp"` and `sourceAppId` from the authenticated API key → return submission ID.

**J10 — Submission Metadata Extension** ✅ Done
Extend the `Submission` Weaviate collection schema and `SubmissionCreateInput` type to track provenance:

| Property | Type | Description |
|---|---|---|
| `sourceChannel` | text | `"ui"`, `"mcp"`, or `"bulk_upload"` — how the submission was created |
| `sourceAppId` | text | Identifier for the external application (from API key record) |
| `sourceDescription` | text | Free-text describing where the content came from (provided by MCP client) |

All existing submissions default to `sourceChannel: "ui"`. The `createSubmission()` function accepts optional source parameters — existing callers continue working without changes.

**J11 — Queue UI Updates** ✅ Done
The queue UI at `/queue` displays a source badge on each item and adds a filter by source channel. `sourceChannel: "mcp"` submissions show the `sourceAppId` for traceability.

**J12 — Tool Access Control** ✅ Done
Permission scoping per API key (`mcp-read` vs `mcp-write`) controls which tools are available per connection. A configuration flag or API key scope controls whether a client can access write tools. LLM clients (Claude Desktop, Cursor) may start with read-only access in Phase 1 and gain write tools in Phase 2. Automation clients (n8n, Zapier) get both read and write tools.

## Phase 2 Example Use Cases

- **n8n workflow:** Monitors competitor websites and news feeds. On detection, calls `search_objects` to check for related objects, then `create_knowledge_object` or `update_knowledge_object` with the new intel. Submission enters queue with `sourceAppId: "n8n-competitive-intel"`.
- **Slack bot:** Extracts insights from meeting transcription tools. User types `/capture-insight`, bot formats as knowledge object and submits. Admin sees `sourceAppId: "slack-knowledge-bot"`.
- **CRM sync script:** Scheduled script reads updated segment data from Salesforce, compares with existing segments via `search_objects`, and proposes updates when firmographic data changes.
- **AI agent:** A research assistant running in Claude Desktop discovers information relevant to an existing use case, reads current content via `get_object`, proposes additions via `update_knowledge_object`.

## Phase 3: Hardening

**J13 — Rate Limiting**
Per-key rate limits (60 req/min). Circuit breaker that pauses keys exceeding thresholds. Admin can deactivate a key via the Connected Systems UI. Runaway LLM loops or misconfigured automation workflows cannot hammer Weaviate or flood the review queue.

**J14 — Input Validation**
Content size limits (100KB per submission) to prevent abuse. Input sanitization for content fields to prevent XSS in the review queue UI. MIME type enforcement on any file-related fields. Enforce max `limit` and `offset` on all list/search tools.

**J15 — Duplicate Detection**
Add `nearText` similarity check in write tools before creating a submission. Warn if a similar pending submission or live object already exists. Configurable similarity threshold. Reduces noise from external tools submitting the same content repeatedly.

**J16 — Streamable HTTP Auth Hardening**
API key auth on the Streamable HTTP transport for network-accessible deployments. Key validation via `ConnectedSystem` lookup. Rate limiting per key. Security headers on all HTTP responses. stdio remains local-only with no auth required.

## Phase 4: Observability & Monitoring

The MCP server on Railway has a `/health` endpoint but no metrics, no request logging, and no alerting. If the server goes down or starts producing errors, nobody knows until a user reports a broken integration. This phase adds the observability infrastructure needed before production traffic scales.

**J17 — Structured Request Logging**
Add structured JSON logging to all MCP tool handlers in `mcp-server/src/tools/`. Each tool invocation logs: timestamp, tool name, client identifier (from API key), input parameters (sanitized — no full content bodies), response status (success/error), response size (bytes), and duration (ms). Use a lightweight logging library (e.g., `pino`) configured for JSON output. Log to stdout so Railway's log aggregation captures all events. Include a correlation ID per request for tracing multi-tool conversations. Log connection events (client connect, disconnect, reconnect) from the transport layer.

**J18 — Metrics Collection and Dashboard**
Add a `/metrics` endpoint to the Streamable HTTP transport that returns key operational metrics in JSON: total requests (by tool name), error count (by tool name and error type), average response time (by tool name), active connections, uptime, and Weaviate connection status. Metrics are computed from an in-memory rolling window (last 1 hour, last 24 hours). This endpoint is lightweight enough to be polled by an external uptime monitor or displayed in a simple status page. Expose the same metrics as an MCP resource (`knowledge://server-metrics`) so LLM clients can ask about server health.

**J19 — Alerting Integration**
Configure external uptime monitoring (e.g., UptimeRobot, Better Stack, or Railway's built-in health checks) to poll the `/health` and `/metrics` endpoints. Define alert thresholds: server unreachable for 60+ seconds, error rate exceeding 10% of requests in a 5-minute window, Weaviate connection failures. Alerts notify via email or Slack webhook. Document the alerting configuration in `mcp-server/README.md`. Add an `ALERT_WEBHOOK_URL` environment variable for the MCP server to push critical errors (Weaviate connection loss, unhandled exceptions) proactively rather than waiting for the next poll.

## Phase 5: Shared Library Hardening

The MCP server's dynamic import of `lib/*.ts` files is architecturally elegant — one source of truth for business logic — but fragile. The scoped `tsconfig.lib.json` workaround to avoid pre-existing type errors suggests the shared boundary is already showing strain. This phase stabilizes the shared library pattern before additional consumers ([Group Q](./group-q.md) Query Agent, future CLI tools) increase the surface area.

**J20 — Resolve Type Errors in Excluded lib Files**
Audit all `lib/*.ts` files excluded from `tsconfig.lib.json` and fix the type errors that prompted their exclusion. These errors likely involve Next.js-specific types (`NextRequest`, `NextResponse`), missing ambient declarations, or loose `any` usage. Fix each error at the source rather than suppressing with `// @ts-ignore`. After all errors are resolved, remove `tsconfig.lib.json` and configure the MCP server's `tsconfig.json` to reference the full `lib/` directory. Verify that `npm run build` passes for both the Next.js app and the MCP server.

**J21 — Create Explicit lib/shared/ Boundary**
Create a `lib/shared/` directory containing only the modules imported by the MCP server (and any future non-Next.js consumers). Move or re-export the following modules into `lib/shared/`: `knowledge.ts`, `knowledge-types.ts`, `skills.ts`, `skill-types.ts`, `submissions.ts`, `submission-types.ts`, `dashboard.ts`, `weaviate.ts`, `api-auth.ts`. Each module in `lib/shared/` must be framework-agnostic — no `next/` imports, no `NextRequest`/`NextResponse` types, no Vercel-specific APIs. Modules that need Next.js-specific wrappers (e.g., route handlers that call shared functions) stay in `lib/` and import from `lib/shared/`. Update all imports in both the Next.js app and the MCP server to reference the new paths. Add a `.cursor/rules/shared-lib.mdc` rule documenting the boundary: "Modules in `lib/shared/` must not import from `next/`, `@vercel/`, or any framework-specific package."

**J22 — Comprehensive Type Checking Across Both Consumers**
Add a CI check (or npm script) that runs `tsc --noEmit` against both the Next.js app and the MCP server in a single pass. This ensures that changes to shared modules do not break either consumer. Configure the MCP server's `tsconfig.json` to use `strict: true` and enable all strict checks (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). Add a `typecheck` script to the root `package.json` that runs both checks: `"typecheck": "tsc --noEmit && cd mcp-server && tsc --noEmit"`. Document the convention: any PR that modifies a file in `lib/shared/` must pass the combined type check.

## Risks and Gaps

| Risk | Impact | Mitigation |
|---|---|---|
| MCP server requires separate hosting from Vercel | Additional infrastructure to manage; separate deploy pipeline | Use Railway or Fly.io for a single Node.js process; document deploy steps |
| MCP spec is evolving | Transport or protocol changes may require SDK upgrades | Pin `@modelcontextprotocol/sdk` version; monitor spec releases; Streamable HTTP is the recommended stable transport |
| Shared lib imports between Next.js and MCP server | Build/bundling complexity if modules have Next.js-specific imports | Keep shared libs framework-agnostic; no `next/` imports in shared code; verify with MCP server's own `tsconfig.json` |
| Context window overflow from large responses | LLM truncates or loses important context | Return 500-char snippets in search/list; require `get_object` for full content; enforce `limit` and `max` on all tools |
| Data exposure via network-accessible Streamable HTTP transport | Sensitive business knowledge accessible to anyone with HTTP access | stdio is local-only by default; Streamable HTTP requires explicit opt-in; add API key auth (J16) |
| Semantic search quality depends on Weaviate vectorizer | Poor embeddings → irrelevant results → bad LLM responses | Expose `certaintyThreshold` parameter; monitor quality; consider vectorizer upgrade per Open Questions |
| Weaviate connection stability in long-running process | Connection drops cause all tool calls to fail | Reconnection logic with exponential backoff (J3); health check on every tool call; log connection events |
| Stale schema mirror diverges from Weaviate | Tools return incorrect schema information | Startup validation comparing `schema.ts` against live Weaviate schema; log warnings on mismatch |
| No rate limiting on MCP endpoints (until Phase 3) | Misconfigured workflow could flood the review queue | Per-key rate limiting in Phase 3 (J13); circuit breaker; admin can deactivate a key |
| API key leakage | Unauthorized content pushed into review queue | All content still requires admin approval; hash keys at rest; key rotation via Connected Systems UI |
| Submission queue overwhelm from automated sources | Admin cannot keep up with high-volume MCP submissions | Source channel filter in queue UI (J11); batch review actions; per-source submission count on dashboard; configurable auto-defer |
| No duplicate detection (until Phase 3) | External tools may submit the same content repeatedly | `nearText` similarity check in Phase 3 (J15); warn if similar pending submission or live object exists |
| Duplicated logic between MCP server and Next.js app | Schema definitions and query patterns maintained in two places | Accept duplication for Phase 1; consider extracting shared `@content-engine/core` package if maintenance burden grows |
| ChatGPT lacks native MCP support | Users on ChatGPT cannot connect without adapter | Document limitation; Streamable HTTP transport covers Gemini and HTTP clients; defer ChatGPT adapter |

**Open Questions:**

| Question | Context |
|---|---|
| Where to host the MCP server? | Railway, Fly.io, and dedicated Vercel Functions (Fluid Compute) are all viable. Decision depends on existing infra preferences and cost. |
| Should write tools validate content quality before creating submissions? | A lightweight Claude call could check if proposed content meets minimum quality standards. Adds latency and cost but reduces low-quality submissions. |
| Should the MCP server support `skill` as an object type from day one? | Group I is complete. Could dynamically detect available collections at startup. Recommendation: dynamic detection. |
| Maximum content size per MCP submission? | Need to define a limit (e.g. 100KB) to prevent abuse. |
| Shared package vs. duplicated logic? | MCP server mirrors collection schemas and query patterns from Next.js app. Extract `@content-engine/core` (npm workspace) or accept duplication? Recommendation: accept duplication in Phase 1; revisit if MCP server grows. |
| Streamable HTTP authentication? | stdio is inherently local. Streamable HTTP is network-accessible. Use static API key (simplest) or JWT? Recommendation: static API key matching existing `ConnectedSystem` pattern. |
| Content truncation strategy? | 500-char snippet in search/list, full in `get_object`. Should this be configurable per request? |
| Deployment model for Streamable HTTP mode? | Alongside Next.js on Vercel, separate always-on server, or Docker container? Recommendation: separate always-on service for HTTP; stdio runs locally. |
| Use official Weaviate MCP server? | ADR-002 notes the official server. Build custom for domain-specific value (health dashboard, formatted responses, knowledge-type awareness); evaluate integrating official server capabilities later. |
| Response format? | JSON (structured) or markdown (human-readable)? Recommendation: JSON with `formattedSummary` field containing markdown version. |
