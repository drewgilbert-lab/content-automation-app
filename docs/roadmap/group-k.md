> Back to [Roadmap Index](./README.md)

# Group K — External REST API and Connected Systems

> Scope: Expose a versioned REST API at `/api/v1/` with per-system API key authentication, allowing external applications to query knowledge objects and skills programmatically. Includes a Connected Systems admin UI for managing API keys and integration configurations. Phase 2 adds outbound push sync — automatically delivering content changes to connected systems via webhooks.
> Dependencies: Groups A–B (read and write layer must be stable). Group I (Skills) — skill endpoints are additive when that collection exists.

## Why This Matters

Other internal tools and external platforms need programmatic access to knowledge data. A content operations platform (e.g. AirOps) might need persona and use case data to power its own workflows. A chatbot might look up use cases by semantic similarity. A BI dashboard might pull object counts and staleness metrics. Currently, none of these tools can connect without sharing raw Weaviate admin credentials, which grants full read/write access to every collection including internal ones (`Submission`, `GeneratedContent`).

Group K introduces a REST API gateway that wraps Weaviate with the Content Engine's business logic — deprecated objects are filtered, cross-references are resolved to names, response schemas are versioned and decoupled from Weaviate schema changes. Each connected system gets its own API key with independent rate limits and access tracking. Phase 2 adds outbound push — when knowledge objects change, the Content Engine automatically delivers those changes to subscribed systems via signed webhooks.

**Target user experience:** An admin creates a new connected system in the UI, receives a unique API key, and shares it with the external application. The developer can immediately query personas, segments, use cases, and business rules — including semantic search — from any HTTP client. In Phase 2, the admin configures a webhook URL and the Content Engine pushes content changes automatically.

## Architecture Decisions

**Connected System Registry: Weaviate `ConnectedSystem` collection** with an in-memory cache for API key validation.

| Consideration | Weaviate collection | Upstash Redis / Vercel KV | Environment variables |
|---|---|---|---|
| New infrastructure | None — existing stack | Adds a dependency | None |
| Admin UI pattern | Matches knowledge/skills CRUD | Separate data layer | No UI, CLI-only |
| Volume concern | Tiny (<50 systems) | N/A | Limited scalability |
| Key validation speed | In-memory cache (5-min refresh) | Native fast lookups | Instant, no cache needed |
| Verdict | **Selected** — simplest, no new infra | Deferred — use for rate limiting only | Rejected — doesn't scale to multi-key |

- Admin UI CRUD follows established patterns from knowledge and skills modules (`lib/connections.ts`, `lib/connection-types.ts`, `app/connections/`)
- API key validation on every `/api/v1/` request uses a `globalThis` in-memory cache (same pattern as ADR-012) refreshed every 5 minutes, avoiding per-request Weaviate queries
- Keys stored as SHA-256 hashes with an 8-character prefix for admin identification in the UI

**REST API Gateway: Next.js `/api/v1/` routes** within the existing app.

| Option | Security | Setup | Maintenance | Verdict |
|---|---|---|---|---|
| Direct Weaviate access (share read-only key) | Moderate — consumers see raw schema | Lowest | Highest schema coupling | Rejected — too much exposure |
| REST API gateway (`/api/v1/`) | Strong — only exposed endpoints | Moderate — reuses `lib/knowledge.ts` | Moderate | **Selected** |
| GraphQL API layer | Strong | Higher — schema + resolvers | Higher | Deferred — layer on top later |

Matches existing patterns, right level of abstraction, runs natively on Vercel, versioned from day one.

**Weaviate Multi-User Access Control (Defense-in-Depth):**

A single `WEAVIATE_API_KEY` with full admin access is currently used for all operations. This creates a blast radius problem: if any access channel is compromised, the attacker has admin access to every Weaviate collection. Weaviate Cloud supports user management and RBAC (v1.30+), allowing multiple API keys with scoped permissions.

Create distinct Weaviate users via the Weaviate Cloud console or API:

| Weaviate User | Custom Role | Permissions | Used By |
|---|---|---|---|
| `content-engine-admin` | `admin` | Full CRUD on all collections | Next.js admin UI, review queue, bulk upload |
| `content-engine-api-reader` | `api_reader` | Read-only on Persona, Segment, UseCase, BusinessRule, ICP, Skill | External REST API (`/api/v1/`) via `lib/knowledge.ts` |
| `content-engine-mcp` | `mcp_access` | Read on knowledge collections + create on Submission | MCP server ([Group J](./group-j.md)) |

Environment variables per user:

```
WEAVIATE_URL=               # Shared across all users
WEAVIATE_API_KEY=           # content-engine-admin (existing, used by Next.js app)
WEAVIATE_READER_API_KEY=    # content-engine-api-reader (new, used by /api/v1/ routes)
WEAVIATE_MCP_API_KEY=       # content-engine-mcp (new, used by MCP server)
```

The `withWeaviate` helper in `lib/weaviate.ts` accepts an optional key parameter to select which Weaviate user to connect as. External API routes pass `WEAVIATE_READER_API_KEY`, so even if the application-level `X-API-Key` auth is bypassed, the Weaviate user can only read — it cannot delete or modify objects. See ADR-014 in [TECH_DECISIONS.md](../TECH_DECISIONS.md).

**API Response Security:**

All `/api/v1/` responses include standard security headers: `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, `X-Frame-Options: DENY`. These are applied by the `withApiAuth()` middleware in `lib/api-middleware.ts`.

CORS is denied by default on `/api/v1/` routes (`Access-Control-Allow-Origin` is not set). If a browser-based consumer needs access, configure `ALLOWED_ORIGINS` as a comma-separated list of permitted origins. The middleware reads this env var and sets CORS headers accordingly. Server-to-server consumers (the primary use case) are unaffected by CORS.

## Phase 1 — Read API and Connected Systems Management

**K1 — ConnectedSystem Collection Schema** ✅ Done (February 28, 2026)
Create a `ConnectedSystem` Weaviate collection. Properties: `name` (text — human-readable system name), `description` (text — what this system does), `apiKeyHash` (text — SHA-256 hash of the API key), `apiKeyPrefix` (text — first 8 chars of the key for UI display), `permissions` (text[] — `["read"]` for Phase 1), `subscribedTypes` (text[] — which object types this key can access, e.g. `["persona", "segment"]` or `["*"]` for all), `rateLimitTier` (text — `"standard"` or `"elevated"`), `active` (boolean — master toggle; inactive keys are rejected), `createdAt` (date), `updatedAt` (date). Implementation in `lib/connection-types.ts` (types, input types, constants), `lib/connections.ts` (CRUD: list, get, create, update, delete, activate/deactivate), and `scripts/create-connected-system-collection.ts` (schema creation/migration script).

**K2 — API Key Generation, Rotation, and Validation Middleware** ✅ Done (February 28, 2026)
Generate cryptographically secure API keys on system creation. `crypto.randomBytes(32).toString('hex')` produces a 64-char key shown once to the admin at creation time. Stored as `SHA-256(key)` in the `apiKeyHash` field. Validation flow: `X-API-Key` request header → SHA-256 hash → lookup in in-memory `globalThis` cache (refreshed every 5 minutes, same pattern as ADR-012) → return `ConnectedSystem` record or `401 Unauthorized`. Constant-time comparison via `crypto.timingSafeEqual` to prevent timing attacks. Build `lib/api-auth.ts` with `generateApiKey()`, `hashApiKey()`, `validateApiKey()`, `rotateApiKey()`, and cache management. Build `lib/api-middleware.ts` with a `withApiAuth(handler)` higher-order function wrapping all `/api/v1/` route handlers. Injects the authenticated `ConnectedSystem` into the request context. Checks `active` status. Applies security headers (`X-Content-Type-Options`, `Cache-Control`, `X-Frame-Options`) and CORS policy to every response.

Key rotation: `POST /api/connections/[id]/rotate-key` generates a new API key, updates the `apiKeyHash` and `apiKeyPrefix` on the `ConnectedSystem`, forces an immediate cache refresh, and returns the new plaintext key once. The old key is invalidated immediately. This avoids the need to delete and recreate a connected system when a key is compromised, preserving the system's configuration, push settings, and push log history.

Request logging: Every `/api/v1/` request is logged to stdout (captured by Vercel) with: `{ timestamp, apiKeyPrefix, endpoint, method, statusCode, durationMs }`. This provides the minimum audit trail needed for external API access without the overhead of a full event logging system. See Deferred: Event Logging & Audit Trails for the broader audit trail plan.

**K3 — Read API Endpoints** ✅ Done (February 28, 2026)
Versioned read-only endpoints at `/api/v1/`. All require `X-API-Key` auth via K2 middleware except the health endpoint. Responses follow `{ "data": ..., "meta": ... }` shape. Deprecated objects excluded by default.

| Endpoint | Description | Key Parameters | Reuses |
|---|---|---|---|
| `GET /api/v1/knowledge` | List all non-deprecated knowledge objects | `type`, `tags`, `limit` (default 100, max 500), `offset`, `include_deprecated` | `listKnowledgeObjects()` from `lib/knowledge.ts` |
| `GET /api/v1/knowledge/:id` | Single object with full content and resolved cross-references | — | `getKnowledgeObject()` from `lib/knowledge.ts` |
| `GET /api/v1/knowledge/search` | Semantic search via Weaviate `nearText` | `q` (required), `type`, `limit` (default 10, max 50), `certainty` (default 0.7) | New `semanticSearchKnowledge()` in `lib/knowledge.ts` |
| `GET /api/v1/knowledge/types` | Object types with counts and descriptions | — | `getDashboardData()` from `lib/dashboard.ts` |
| `GET /api/v1/skills` | List skills | `content_type`, `active`, `category` | `listSkills()` from `lib/skills.ts` |
| `GET /api/v1/skills/:id` | Skill detail | — | `getSkill()` from `lib/skills.ts` |
| `GET /api/v1/health` | Health check (no auth required) | — | `checkWeaviateConnection()` from `lib/weaviate.ts` |

Search results include `score` (float 0.0–1.0) and `snippet` (first 500 characters of content). Health endpoint returns: `{ "status": "ok" | "degraded", "version": "1", "weaviate": { "connected": boolean }, "collections": { persona: number, ... }, "timestamp": string }`.

Implementation files: `app/api/v1/knowledge/route.ts`, `app/api/v1/knowledge/[id]/route.ts`, `app/api/v1/knowledge/search/route.ts`, `app/api/v1/knowledge/types/route.ts`, `app/api/v1/skills/route.ts`, `app/api/v1/skills/[id]/route.ts`, `app/api/v1/health/route.ts`.

**K4 — Connected Systems Admin UI** ✅ Done (February 28, 2026)
Admin interface at `/connections` for creating, managing, and monitoring connected systems. Follows the established UI patterns from `/knowledge` and `/skills`.

Pages:
- `/connections` — list all systems. Columns: name, key prefix, active status badge, subscribed types, created date. Active/inactive filter tabs. Search by name.
- `/connections/new` — create form. Fields: name, description, subscribed types (multi-select with "All" option), rate limit tier (dropdown). On submit, displays the generated API key once with a copy button and a warning that it cannot be shown again.
- `/connections/[id]` — detail page. Shows: name, description, key prefix, permissions, subscribed types, rate limit tier, active status, timestamps. Action bar: Edit, Rotate Key (with confirmation — shows new key once), Activate/Deactivate, Delete (with confirmation). Phase 2 adds push configuration and sync status sections here.
- `/connections/[id]/edit` — edit form. All fields except API key are editable. Phase 2 adds push configuration fields.

Internal API routes (used by admin UI, not versioned, no external key auth): `GET /api/connections` (list), `POST /api/connections` (create — returns plaintext key in response), `GET /api/connections/[id]` (detail), `PUT /api/connections/[id]` (update), `DELETE /api/connections/[id]` (delete), `PATCH /api/connections/[id]` (activate/deactivate), `POST /api/connections/[id]/rotate-key` (generate new key — returns plaintext key once, invalidates old key immediately).

Components: `app/connections/components/connection-list.tsx`, `app/connections/components/connection-form.tsx`, `app/connections/components/connection-detail-actions.tsx`.

Home page: Add "Connected Systems" nav card to `app/page.tsx` navItems array.

**K5 — Rate Limiting** ✅ Done (February 28, 2026)
Per-key rate limiting using Upstash Redis + `@upstash/ratelimit`.

| Parameter | Value |
|---|---|
| Standard tier | 100 requests/minute per API key |
| Elevated tier | 300 requests/minute per API key |
| Semantic search | 20 requests/minute (all tiers) |
| Algorithm | Sliding window |
| Exceeded response | `429 Too Many Requests` with `retryAfter` |

Response headers on every request: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`. Implementation in `lib/rate-limit.ts` integrated into `withApiAuth()`. New environment variables: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.

**K6 — Phase 1 Testing and API Documentation** ✅ Done (February 28, 2026)
Unit tests for `lib/api-auth.ts` (key generation, hashing, validation, cache behavior) and `lib/connections.ts` (CRUD operations). Integration tests for all `/api/v1/` endpoints (auth required, correct responses, error cases, pagination, deprecated filtering). Rate limiting tests (verify 429 responses, header values). Update `docs/API.md` with all `/api/v1/` endpoint contracts. Create `docs/EXTERNAL_API.md` with base URL, auth instructions, endpoint reference with curl examples, rate limit policy, and error codes. Update `docs/TECH_DECISIONS.md` to revise ADR-007 with Connected Systems architecture.

## Phase 2 — Outbound Push Sync

> Scope: Automatically deliver knowledge base content changes to connected systems via signed webhooks. A daily cron job detects objects updated since the last sync, respects a configurable debounce window (default 60 minutes), and pushes the full object payload to each subscribed system's webhook URL. Failures are tracked, retried once, and surfaced to admins via the UI and dashboard.
> Dependencies: Phase 1 (K1–K6 must be complete). Vercel Cron (free plan supports one daily cron job).

**K7 — Push Configuration Schema Extension**
Extend the `ConnectedSystem` collection with push-related properties: `webhookUrl` (text — where to POST change events), `webhookSecret` (text — HMAC-SHA256 secret for signing payloads), `pushEnabled` (boolean — toggle push independently of read access), `pushDelayMinutes` (int — debounce window, default 60), `lastSyncedAt` (date — high-water mark for successful pushes). Create a `PushLog` Weaviate collection for tracking delivery attempts. Properties: `objectId` (text — knowledge object or skill UUID), `objectType` (text — collection type), `systemId` (text — ConnectedSystem UUID), `systemName` (text — denormalized for display), `eventType` (text — `"created"`, `"updated"`, `"deprecated"`, `"deleted"`), `status` (text — `"delivered"`, `"failed"`), `failureReason` (text — HTTP status, error message), `attemptCount` (int — 1 or 2, max 1 retry), `objectUpdatedAt` (date — the `updatedAt` that triggered the push), `createdAt` (date). Implementation: extend `lib/connection-types.ts` with push fields, new `lib/push-types.ts` for PushLog types, update schema migration script, new `scripts/create-push-log-collection.ts`.

**K8 — Webhook Delivery Engine**
Build `lib/push-sync.ts` with the core push logic. The webhook delivery sends a signed JSON payload to the connected system's `webhookUrl`. Full object included — receiving systems get everything in one call including resolved cross-reference names and types. Payload shape: `{ "event": "knowledge.updated", "timestamp": "ISO-8601", "object": { id, type, name, content, tags, crossReferences, deprecated, createdAt, updatedAt } }`. Event types: `knowledge.created`, `knowledge.updated`, `knowledge.deprecated`, `skill.created`, `skill.updated`, `skill.deprecated`. Signing: HMAC-SHA256 of the raw JSON body using the system's `webhookSecret`, sent in `X-Content-Engine-Signature` header. The `timestamp` field is included inside the signed body; receiving systems must verify `abs(now - payload.timestamp) < 5 minutes` to reject replay attacks. Receiving system verifies by recomputing the HMAC and checking the timestamp window. Retry: 1 retry on failure (HTTP non-2xx or network error) with 5-second delay between attempts. After 2 total attempts, log as failed in PushLog. Implementation: `pushToSystem()`, `buildWebhookPayload()`, `signPayload()`, `executePushCycle()`.

**K9 — Daily Push Cron Job**
Build the Vercel Cron endpoint that runs the push cycle once per day. Flow: (1) query all ConnectedSystems where `active=true` AND `pushEnabled=true`, (2) for each system find knowledge objects + skills where `updatedAt > system.lastSyncedAt` AND `updatedAt < (now - pushDelayMinutes)`, (3) for each object check PushLog for a failed entry with `attemptCount >= 2` for this object+system pair — skip if found (permanent failure, requires admin action), (4) call `pushToSystem()` for each eligible object, (5) log results to PushLog (delivered or failed), (6) update `system.lastSyncedAt` = max `updatedAt` of successfully delivered objects. Deprecation handling: when an object is deprecated, its `updatedAt` changes, so the cron picks it up with event type `"knowledge.deprecated"`. Hard deletes are not synced — deprecation is the recommended workflow for connected system awareness. Vercel Cron config in `vercel.json`: `{ "crons": [{ "path": "/api/sync/push", "schedule": "0 6 * * *" }] }`. Runs daily at 6 AM UTC. Free plan supports one daily cron. Implementation: `app/api/sync/push/route.ts` calling `executePushCycle()` from `lib/push-sync.ts`.

**K10 — Push Status and Failure UI**
Extend the Connected Systems admin UI with push visibility. Connected system detail page (`/connections/[id]`) additions: push configuration summary (webhook URL, delay, enabled status, last synced at), recent push log table (last 50 entries showing object name, type, event, status, timestamp), failed pushes section with failure reason and object link, "Clear Failure" button that resets the PushLog entry `attemptCount` to allow re-delivery on next cron run. Connected system edit page additions: webhook URL field, webhook secret field (auto-generated with regenerate button), push enabled toggle, push delay minutes field (number input, default 60). New push log API: `GET /api/connections/[id]/push-log` (list entries with optional status filter). New component: `app/connections/components/push-log-table.tsx`.

**K11 — Dashboard Push Failure Notifications**
Surface push failures prominently so admins are aware without navigating to the connections pages. Home page (`app/page.tsx`): add a notification banner in the System Status section. If there are any failed push log entries, show: "N push failures across M connected systems" with a link to the affected system(s). Dashboard page (`app/dashboard/page.tsx`): add a "Push Sync" stat card showing total connected systems, systems with active push, last push run time, and failed deliveries count. Data source: new `getPushFailureSummary()` function in `lib/push-sync.ts` counting PushLog entries with `status="failed"` grouped by system. New route: `app/api/dashboard/push-status/route.ts`.

**K12 — Phase 2 Testing and Documentation**
Unit tests for `lib/push-sync.ts` (payload building, HMAC signing, retry logic, cycle orchestration). Unit tests for PushLog CRUD. Integration tests for the cron endpoint (mock webhook targets, verify delivery and logging). Integration tests for push failure UI (verify notifications appear). End-to-end test: create a connected system with push enabled, update a knowledge object, trigger the cron, verify the webhook was called with the correct payload. Update `docs/API.md` with webhook payload format and signature verification instructions. Update `docs/EXTERNAL_API.md` with push configuration section and webhook setup guide. Update `docs/CHANGELOG.md`.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Weaviate key validation adds latency to every API request | Slow `/api/v1/` responses | In-memory cache with 5-min refresh; `globalThis` pattern for dev mode stability |
| API key shown only once at creation — admin loses it | System must be re-created with a new key | Clearly warn in UI; copy-to-clipboard button; confirm dialog before leaving the page |
| Vercel free plan limits cron to once daily | Push delay is 24h + debounce window, not real-time | Acceptable for current requirements; document upgrade path to Pro for per-minute cron |
| Vercel free plan 10s function timeout | Large push cycles (many objects, many systems) may timeout | Limit push batch size per cron run; process most-recently-updated first; log partial progress |
| Webhook endpoint unreachable | Pushed content not received by connected system | 1 retry with 5s delay; permanent failure logged in PushLog; admin notified on dashboard |
| Webhook replay attacks | Malicious actor replays a captured webhook payload | Include timestamp in signed payload; receiving system should reject payloads older than 5 minutes |
| No webhook URL validation | Admin enters invalid or malicious URL | Validate URL format on save; reject private/localhost URLs; test connection button (stretch) |
| Deleted objects not tracked for push | Connected system retains stale content after deletion | Use deprecation (soft delete) which updates `updatedAt` and triggers push; document that hard deletes are not synced |
| PushLog grows unbounded | Weaviate storage costs increase over time | TTL-based cleanup of delivered logs older than 30 days; retain failed logs until admin clears them |
| Weaviate rate limits from external API traffic | External consumers add load on top of internal UI usage | Rate limit external API independently; monitor Weaviate Cloud usage dashboard |
| Schema changes break consumers | Renaming a Weaviate property changes the API response | Version the API (`/v1/`); external response schemas defined in TypeScript types, not derived directly from Weaviate |
| Semantic search quality depends on query phrasing | Poorly phrased queries return low-relevance results | Return `score` with every search result; document recommended `certainty` thresholds |

**Resolved Decisions:**

| Decision | Resolution |
|---|---|
| `subscribedTypes` restricts read API access or only push? | **Full read access for all keys in Phase 1.** The `subscribedTypes` field is stored on `ConnectedSystem` and used for Phase 2 push filtering only. All authenticated keys can read all knowledge types and skills via `/api/v1/`. Type-scoped read access may be added as a future enhancement if needed. |
| Key rotation workflow? | **Included in Phase 1 (K2).** `POST /api/connections/[id]/rotate-key` generates a new key, invalidates the old one, and preserves all system configuration. |
| Webhook payload cross-references? | Include resolved names and types (not full content) in cross-references. Keeps payloads self-contained without bloating size. |

**Open Questions:**

| Question | Context |
|---|---|
| How to handle the 10s timeout for push cycles? | Pushing many objects to many systems may exceed 10s. Options: process N objects per cron run and rely on daily repetition to catch up; batch webhook calls; or upgrade to Vercel Pro. |
| Certainty threshold for semantic search? | Default 0.7 based on Weaviate docs. Allow consumers to override via `certainty` param. Monitor actual score distributions after launch. |
