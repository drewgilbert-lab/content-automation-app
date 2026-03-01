# Content Engine — External REST API Developer Guide

> Last updated: February 28, 2026

The Content Engine exposes a versioned, read-only REST API at `/api/v1/` for third-party applications to query the knowledge base programmatically.

---

## Base URL

```
https://<your-host>/api/v1/
```

All endpoints are prefixed with `/api/v1/`. Breaking changes will increment the version prefix (e.g. `/api/v2/`).

---

## Authentication

Every request (except `/api/v1/health`) must include an API key in the `X-API-Key` header.

```bash
curl -H "X-API-Key: your-64-char-key" https://host/api/v1/knowledge
```

**How to get a key:** An admin creates a connected system at `/connections` in the Content Engine UI. The 64-character API key is shown once at creation time and cannot be retrieved again. If lost, the admin can rotate the key from the system detail page.

Keys are SHA-256 hashed at rest and validated with constant-time comparison. Inactive or deactivated systems return `403`.

---

## Endpoints

### GET /api/v1/health

Health check. **No authentication required.**

```bash
curl https://host/api/v1/health
```

**Response:**
```json
{
  "status": "ok",
  "version": "1",
  "weaviate": { "connected": true },
  "collections": { "persona": 4, "segment": 5, "use_case": 3, "business_rule": 8, "icp": 2 },
  "timestamp": "2026-02-28T12:00:00.000Z"
}
```

`status` is `"ok"` when Weaviate is connected, `"degraded"` otherwise.

---

### GET /api/v1/knowledge

List knowledge objects with optional filtering and pagination.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `type` | string | — | Filter: `persona`, `segment`, `use_case`, `business_rule`, `icp` |
| `tags` | string | — | Comma-separated tags (matches any) |
| `limit` | int | 100 | Results per page (max 500) |
| `offset` | int | 0 | Pagination offset |
| `include_deprecated` | string | — | Set to `true` to include deprecated objects |

```bash
curl -H "X-API-Key: $KEY" "https://host/api/v1/knowledge?type=persona&limit=10"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Sales Engineer",
      "type": "persona",
      "tags": ["sales", "technical"],
      "createdAt": "2026-02-01T00:00:00Z",
      "updatedAt": "2026-02-15T00:00:00Z"
    }
  ],
  "meta": { "total": 4, "limit": 10, "offset": 0 }
}
```

---

### GET /api/v1/knowledge/:id

Retrieve a single knowledge object with full content and resolved cross-references.

```bash
curl -H "X-API-Key: $KEY" https://host/api/v1/knowledge/abc-123-uuid
```

**Response:**
```json
{
  "data": {
    "id": "abc-123-uuid",
    "name": "Sales Engineer",
    "type": "persona",
    "content": "Full markdown content...",
    "tags": ["sales"],
    "crossReferences": [
      { "relationship": "hasSegments", "objects": [{ "id": "xyz", "name": "Enterprise", "type": "segment" }] }
    ],
    "createdAt": "2026-02-01T00:00:00Z",
    "updatedAt": "2026-02-15T00:00:00Z"
  }
}
```

---

### GET /api/v1/knowledge/search

Semantic search across knowledge objects using Weaviate `nearText`.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | string | **(required)** | Natural language search query |
| `type` | string | — | Restrict to one collection type |
| `limit` | int | 10 | Max results (max 50) |
| `certainty` | float | 0.7 | Minimum similarity threshold |

```bash
curl -H "X-API-Key: $KEY" "https://host/api/v1/knowledge/search?q=enterprise+sales+strategy&limit=5"
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Enterprise Sales",
      "type": "segment",
      "tags": ["enterprise"],
      "score": 0.92,
      "snippet": "First 500 characters of content..."
    }
  ]
}
```

Search has a separate rate limit of **20 requests/minute** for all tiers.

---

### GET /api/v1/knowledge/types

Returns available knowledge object types with counts and descriptions.

```bash
curl -H "X-API-Key: $KEY" https://host/api/v1/knowledge/types
```

**Response:**
```json
{
  "data": [
    { "type": "persona", "displayName": "Personas", "count": 4, "description": "Buyer and user personas" },
    { "type": "segment", "displayName": "Segments", "count": 5, "description": "Account segments" }
  ]
}
```

---

### GET /api/v1/skills

List skills with optional filtering.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `content_type` | string | — | Filter by content type: `email`, `blog`, `social`, `thought_leadership`, `internal_doc` |
| `active` | string | — | `true` or `false` |
| `category` | string | — | Filter by category |

```bash
curl -H "X-API-Key: $KEY" "https://host/api/v1/skills?active=true"
```

---

### GET /api/v1/skills/:id

Retrieve a single skill with full instruction content, parameters, and metadata.

```bash
curl -H "X-API-Key: $KEY" https://host/api/v1/skills/skill-uuid
```

---

## Rate Limiting

Rate limits are enforced per API key using Upstash Redis sliding windows.

| Tier | Limit | Applies To |
|---|---|---|
| Standard | 100 requests/minute | Default for all keys |
| Elevated | 300 requests/minute | Configured per connected system |
| Semantic search | 20 requests/minute | `/api/v1/knowledge/search` (all tiers) |

Every response includes rate limit headers:

| Header | Description |
|---|---|
| `X-RateLimit-Limit` | Your tier limit |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | Seconds until the window resets |

When exceeded, the API returns `429 Too Many Requests`:

```json
{ "error": "Rate limit exceeded", "retryAfter": 42 }
```

**Graceful degradation:** If Upstash Redis environment variables are not configured, rate limiting is skipped and all requests are allowed.

---

## Response Format

**Success responses** follow this shape:

```json
{
  "data": "...(single object or array)",
  "meta": { "total": 24, "limit": 100, "offset": 0 }
}
```

`meta` is included on list endpoints; detail endpoints return only `data`.

**Error responses:**

```json
{ "error": "Human-readable error description" }
```

---

## Error Codes

| Status | Meaning | Common Causes |
|---|---|---|
| `400` | Bad Request | Invalid query parameters, missing required fields |
| `401` | Unauthorized | Missing or invalid `X-API-Key` header |
| `403` | Forbidden | API key belongs to a deactivated connected system |
| `404` | Not Found | Object UUID does not exist |
| `429` | Too Many Requests | Rate limit exceeded (check `retryAfter`) |
| `500` | Server Error | Weaviate connection failure or unexpected error |

---

## Security

- **API keys**: 64-character hex, SHA-256 hashed at rest, constant-time validation
- **Key rotation**: `POST /api/connections/[id]/rotate-key` — new key issued, old key invalidated immediately
- **Security headers**: `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, `X-Frame-Options: DENY`
- **CORS**: Denied by default. Set `ALLOWED_ORIGINS` env var for browser-based consumers
- **Weaviate defense-in-depth**: External API connects as read-only Weaviate user
- **Request logging**: Every request logged to stdout as `{ timestamp, apiKeyPrefix, endpoint, method, statusCode, durationMs }`

---

## Versioning

The API uses URL path versioning (`/api/v1/`). Non-breaking changes (new fields, new endpoints) are added to the current version. Breaking changes (removed fields, changed response shapes) will be introduced under `/api/v2/` with a deprecation period for the old version.

---

## See Also

- [API Reference](./API.md) — Full endpoint contracts for all routes
- [User Guide: External API](./user-guides/external-api.md) — Getting started guide for integrators
- [ROADMAP.md](./ROADMAP.md) — Group K scope and Phase 2 webhook plans
