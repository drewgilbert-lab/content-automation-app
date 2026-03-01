# External API

The External API gives third-party applications read-only access to the Content Engine's knowledge base. Any HTTP client — dashboards, CRM integrations, content platforms, automation workflows — can query personas, segments, use cases, business rules, and skills programmatically.

---

## Overview

The API is available at `/api/v1/` and requires an API key for authentication. Each connected system gets its own key with independent rate limits and access tracking.

**What you can do:**
- List and retrieve knowledge objects (personas, segments, use cases, business rules, ICPs)
- List and retrieve skills
- Search the knowledge base by semantic similarity
- Check system health

**What you cannot do:**
- Create, update, or delete knowledge objects (use the MCP server or web UI for writes)
- Access internal collections (submissions, generated content)

---

## Getting Started

### 1. Request an API Key

An admin creates a connected system for your application in the Content Engine admin UI at `/connections`. You will receive:
- A **64-character API key** (shown once — copy it immediately)
- An **8-character key prefix** for identification

Store the key securely. It cannot be retrieved again. If lost, ask the admin to rotate the key.

### 2. Authenticate Requests

Include the API key in the `X-API-Key` header on every request:

```bash
curl -H "X-API-Key: your-api-key-here" \
  https://your-content-engine.example.com/api/v1/knowledge
```

### 3. Make Your First Request

List all knowledge objects:

```bash
curl -H "X-API-Key: $API_KEY" \
  https://your-content-engine.example.com/api/v1/knowledge
```

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Sales",
      "type": "persona",
      "tags": ["sales", "outbound"],
      "createdAt": "2026-02-01T00:00:00Z",
      "updatedAt": "2026-02-15T00:00:00Z"
    }
  ],
  "meta": {
    "total": 24,
    "limit": 100,
    "offset": 0
  }
}
```

---

## Endpoints

### List Knowledge Objects

`GET /api/v1/knowledge`

| Parameter | Required | Description |
|---|---|---|
| `type` | No | Filter by type: `persona`, `segment`, `use_case`, `business_rule`, `icp` |
| `tags` | No | Comma-separated tags (matches any) |
| `limit` | No | Results per page (default 100, max 500) |
| `offset` | No | Pagination offset |
| `include_deprecated` | No | Set to `true` to include deprecated objects |

### Get Knowledge Object

`GET /api/v1/knowledge/:id`

Returns full content, metadata, and resolved cross-references for a single object.

### Semantic Search

`GET /api/v1/knowledge/search`

| Parameter | Required | Description |
|---|---|---|
| `q` | Yes | Natural language search query |
| `type` | No | Restrict to one collection type |
| `limit` | No | Max results (default 10, max 50) |
| `certainty` | No | Minimum similarity threshold (default 0.7) |

Results include a `score` (0.0-1.0) indicating semantic relevance and a `snippet` (first 500 characters).

### List Knowledge Types

`GET /api/v1/knowledge/types`

Returns all knowledge types with object counts and descriptions.

### List Skills

`GET /api/v1/skills`

| Parameter | Required | Description |
|---|---|---|
| `content_type` | No | Filter by content type (e.g. `email`, `blog`) |
| `active` | No | Filter by active status (`true` / `false`) |
| `category` | No | Filter by category |

### Get Skill

`GET /api/v1/skills/:id`

Returns full skill detail including instruction content, parameters, and metadata.

### Health Check

`GET /api/v1/health`

No authentication required. Returns system status.

```json
{
  "status": "ok",
  "version": "1",
  "weaviate": { "connected": true },
  "collections": { "persona": 4, "segment": 5 },
  "timestamp": "2026-02-26T12:00:00Z"
}
```

---

## Rate Limits

| Tier | Limit | Applies To |
|---|---|---|
| Standard | 100 requests/minute | Default for all keys |
| Elevated | 300 requests/minute | Configured per connected system |
| Semantic search | 20 requests/minute | All tiers |

Rate limit headers are included in every response:
- `X-RateLimit-Limit` — your limit
- `X-RateLimit-Remaining` — requests remaining in the current window
- `X-RateLimit-Reset` — seconds until the window resets

When rate limited, you receive a `429 Too Many Requests` response with a `retryAfter` field.

---

## Error Responses

| Status | Meaning |
|---|---|
| `400` | Bad request — invalid parameters |
| `401` | Unauthorized — missing or invalid API key |
| `404` | Not found — object does not exist |
| `429` | Rate limit exceeded |
| `500` | Server error |

All error responses follow the shape: `{ "error": "description" }`.

---

## Security

- **API keys** are hashed (SHA-256) at rest and validated with constant-time comparison
- **Key rotation** is available without recreating the connected system — ask the admin
- **Weaviate defense-in-depth**: the external API connects to Weaviate with a read-only user, so even a compromised API key cannot modify or delete data
- **CORS** is denied by default; server-to-server consumers are unaffected
- **All requests are logged** with key prefix, endpoint, status, and duration

---

## Webhook Push (Phase 2)

In a future update, the Content Engine will support automatically pushing content changes to connected systems via webhooks. When configured:

- A daily sync detects updated knowledge objects
- The full object payload is sent to your webhook URL
- Payloads are signed with HMAC-SHA256 for verification
- Timestamps prevent replay attacks (reject payloads older than 5 minutes)

This feature is planned but not yet available.

---

## See Also

- [Developer API Guide](../EXTERNAL_API.md) — Full developer reference with curl examples
- [API Reference](../API.md) — Full endpoint contracts
- [Knowledge Base Guide](./knowledge-base.md) — Understanding knowledge objects
- [Getting Started](./getting-started.md) — Content Engine overview
