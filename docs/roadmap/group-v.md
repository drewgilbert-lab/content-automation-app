> Back to [Roadmap Index](./README.md)

# Group V — Structured Logging

> Scope: Replace ad-hoc `console.warn`/`console.error` calls across the codebase with structured JSON logging. Establishes a consistent logging foundation for debugging, monitoring, and building confidence in AI output quality before production traffic scales.
> Dependencies: None. This group has no dependencies on other roadmap groups and can be implemented incrementally.

## Why This Matters

The codebase currently has minimal logging beyond scattered `console.warn` and `console.error` calls. Before external systems or multiple users hit the API, structured logging is essential for: debugging production issues without reproducing them locally, monitoring AI classification and merge quality, tracking rate limit events and API key usage, understanding submission lifecycle transitions, and identifying performance bottlenecks. Structured JSON logs are machine-parseable, enabling integration with log aggregation services (Vercel Logs, Datadog, Logtail, etc.) for search, filtering, and alerting.

## Phase 1 — Logging Infrastructure (V1–V2)

**V1 — Install and Configure Structured Logger**
Add `pino` (or equivalent lightweight structured logger) as a dependency. Create `lib/logger.ts` that exports a configured logger instance. Configuration: JSON output format, log level controlled by `LOG_LEVEL` environment variable (default: `"info"` in production, `"debug"` in development), automatic inclusion of timestamp, environment (`NODE_ENV`), and service name (`"content-engine"`). Export child logger factory for creating context-specific loggers: `logger.child({ module: "classifier" })`, `logger.child({ module: "context-assembly" })`. In development, optionally pipe through `pino-pretty` for human-readable console output.

**V2 — Request Logging Middleware**
Create middleware for API routes that logs every request with: method, path, status code, duration (ms), request ID (generated UUID or from `x-request-id` header), and client identifier (API key ID for `/api/v1/` routes, `"internal"` for `/api/` routes). Implement as a reusable wrapper function (`withRequestLogging()`) that can be composed with existing route handlers. Apply to all `/api/v1/` routes immediately (external-facing) and to high-value internal routes (`/api/knowledge`, `/api/submissions`, `/api/bulk-upload`). Exclude health check endpoints from request logging to avoid noise.

## Phase 2 — Domain Event Logging (V3–V6)

**V3 — AI Classification Logging**
Instrument `lib/classifier.ts` to log each classification decision: document name, assigned type, confidence score, whether `needsReview` was flagged, classification duration (ms), and token usage. Log at `info` level for successful classifications, `warn` level for low-confidence results (below 0.7 threshold). This data enables analysis of classification accuracy over time and identification of document patterns that confuse the classifier.

**V4 — AI Merge Quality Logging**
Instrument `lib/merge.ts` to log merge operations: merge type (`update`, `document_add`, `skill_refresh`), source object ID, target object ID, merge duration (ms), input token count, output token count, and whether the reviewer edited the merged result before accepting. Track the "edit rate" — how often reviewers modify AI-merged content — as a proxy for merge quality. High edit rates signal that the merge prompt needs refinement.

**V5 — Submission Lifecycle Logging**
Instrument `lib/submissions.ts` to log every state transition: submission ID, from-status, to-status, source channel (`ui`, `mcp`, `bulk_upload`), reviewer action (`accept`, `reject`, `defer`), and timestamp. This creates an audit trail of all knowledge changes flowing through the review queue. Log at `info` level. Include the reviewer comment on rejection (truncated to 200 characters) for debugging rejected submission patterns.

**V6 — Rate Limit Event Logging**
Instrument `lib/rate-limit.ts` to log rate limit events: client identifier (API key ID), endpoint, remaining requests, limit, window duration, and whether the request was throttled. Log at `warn` level when a client is throttled, `info` level for normal rate limit header generation. This data identifies which connected systems are approaching or exceeding their limits.

## Phase 3 — Operational Logging (V7–V8)

**V7 — Weaviate Connection Logging**
Instrument `lib/weaviate.ts` to log connection lifecycle events: connection established, connection failed (with error), reconnection attempts, and query duration for slow queries (>1 second). Log connection failures at `error` level, slow queries at `warn` level. Include the Weaviate cluster URL (hostname only, no credentials) for multi-environment debugging.

**V8 — Context Assembly Logging**
Instrument `lib/context-assembly.ts` to log each context assembly operation: content type, number of skills included, number of knowledge objects retrieved, narrative ID (if provided), total estimated tokens, whether any truncation was applied (see [Group U](./group-u.md)), and assembly duration (ms). This data is invaluable for debugging why a generation produced unexpected output — the logs show exactly what context Claude received.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Log volume in production | High request volume generates large log volumes, increasing storage costs | Use appropriate log levels; `debug` only in development; configure log retention policies in the aggregation service |
| Sensitive data in logs | Knowledge object content, user prompts, or API keys could appear in logs | Never log full content bodies — log IDs, names, and metadata only; sanitize API keys to show only the last 4 characters; document logging privacy rules in `lib/logger.ts` |
| Performance impact of logging | Synchronous logging adds latency to request handling | `pino` is async by default with minimal overhead (~5 microseconds per log call); avoid logging large objects |
| Inconsistent adoption | Developers continue using `console.log` in new code | Add a linting rule (ESLint `no-console`) that warns on `console.log/warn/error` in `lib/` and `app/api/` directories; document the convention in `docs/UI_STANDARDS.md` |
| Log aggregation service not configured | Structured logs go to stdout but nobody reads them | Vercel automatically captures stdout logs; configure Vercel Log Drains or a third-party service when monitoring becomes a priority |
