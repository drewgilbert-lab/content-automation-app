# Content Engine — API Reference

> Last updated: February 2026

---

## POST /api/chat

Streams a Claude response as plain text.

**Runtime:** `nodejs`

**Request:**
```json
{
  "message": "string (required)",
  "systemPrompt": "string (optional)"
}
```

If `systemPrompt` is omitted, a generic content assistant prompt is used.

**Response (success):**
- Status: `200`
- Content-Type: `text/plain; charset=utf-8`
- Transfer-Encoding: `chunked`
- Body: streamed text from Claude

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "message is required" }` | Missing `message` field |
| 500 | `{ "error": "Failed to process request" }` | Server/Claude error |

**Implementation:** `app/api/chat/route.ts` → calls `streamMessage()` from `lib/claude.ts`

---

## GET /api/knowledge

Returns all knowledge objects across all collections, or filtered by type.

**Runtime:** `nodejs`

**Query Parameters:**
- `type` (optional): Filter by collection type. Valid values: `persona`, `segment`, `use_case`, `business_rule`, `icp`

**Response (success):**
- Status: `200`
- Content-Type: `application/json`
- Body: `{ "objects": KnowledgeListItem[] }`

Each `KnowledgeListItem` contains: `id`, `name`, `type`, `tags`, `createdAt`, `updatedAt`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Invalid type..." }` | Invalid `type` query param |
| 500 | `{ "error": "Failed to fetch knowledge objects" }` | Server/Weaviate error |

**Implementation:** `app/api/knowledge/route.ts` → calls `listKnowledgeObjects()` from `lib/knowledge.ts`

---

## GET /api/knowledge/[id]

Returns a single knowledge object by Weaviate UUID, including full content and resolved cross-references.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Weaviate UUID

**Response (success):**
- Status: `200`
- Content-Type: `application/json`
- Body: Full `KnowledgeDetail` object including `id`, `name`, `type`, `content`, `tags`, `createdAt`, `updatedAt`, optional `subType`/`revenueRange`/`employeeRange`/`sourceFile`, and `crossReferences` (resolved names and IDs grouped by relationship label)

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Knowledge object not found" }` | UUID not found in any collection |
| 500 | `{ "error": "Failed to fetch knowledge object" }` | Server/Weaviate error |

**Implementation:** `app/api/knowledge/[id]/route.ts` → calls `getKnowledgeObject()` from `lib/knowledge.ts`
