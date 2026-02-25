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

---

## POST /api/knowledge

Creates a new knowledge object in the appropriate Weaviate collection.

**Runtime:** `nodejs`

**Request:**
```json
{
  "type": "string (required) — persona | segment | use_case | business_rule | icp",
  "name": "string (required)",
  "content": "string (required)",
  "tags": "string[] (optional)",
  "revenueRange": "string (optional, Segment only)",
  "employeeRange": "string (optional, Segment only)",
  "subType": "string (optional, BusinessRule only — tone | constraint | instruction_template)",
  "personaId": "string (optional, ICP only)",
  "segmentId": "string (optional, ICP only)"
}
```

**Response (success):**
- Status: `201`
- Content-Type: `application/json`
- Body: `{ "id": "string", "name": "string", "type": "string" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing required fields or invalid type |
| 409 | `{ "error": "..." }` | Name conflict within collection |
| 500 | `{ "error": "Failed to create knowledge object" }` | Server/Weaviate error |

**Implementation:** `app/api/knowledge/route.ts` → calls `createKnowledgeObject()` from `lib/knowledge.ts`

---

## PUT /api/knowledge/[id]

Updates an existing knowledge object. Accepts any writable fields.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Weaviate UUID

**Request:**
```json
{
  "name": "string (optional)",
  "content": "string (optional)",
  "tags": "string[] (optional)",
  "revenueRange": "string (optional, Segment only)",
  "employeeRange": "string (optional, Segment only)",
  "subType": "string (optional, BusinessRule only)"
}
```

**Response (success):**
- Status: `200`
- Content-Type: `application/json`
- Body: Updated `KnowledgeDetail` object

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Invalid fields |
| 404 | `{ "error": "Knowledge object not found" }` | UUID not found in any collection |
| 500 | `{ "error": "Failed to update knowledge object" }` | Server/Weaviate error |

**Implementation:** `app/api/knowledge/[id]/route.ts` → calls `updateKnowledgeObject()` from `lib/knowledge.ts`

---

## DELETE /api/knowledge/[id]

Deletes a knowledge object. Without `?confirm=true`, checks for `GeneratedContent` references and returns a warning. With `?confirm=true` or zero references, deletes the object.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Weaviate UUID

**Query Parameters:**
- `confirm` (optional): `true` to skip the reference warning and delete immediately

**Response (success — deleted):**
- Status: `200`
- Content-Type: `application/json`
- Body: `{ "deleted": true }`

**Response (warning — references exist):**
- Status: `200`
- Content-Type: `application/json`
- Body: `{ "deleted": false, "referenceCount": number, "message": "string" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Knowledge object not found" }` | UUID not found in any collection |
| 500 | `{ "error": "Failed to delete knowledge object" }` | Server/Weaviate error |

**Implementation:** `app/api/knowledge/[id]/route.ts` → calls `deleteKnowledgeObject()` and `checkGeneratedContentReferences()` from `lib/knowledge.ts`

---

## PATCH /api/knowledge/[id]

Deprecates or restores a knowledge object.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Weaviate UUID

**Request:**
```json
{
  "action": "deprecate | restore"
}
```

**Response (success):**
- Status: `200`
- Content-Type: `application/json`
- Body: `{ "id": "string", "deprecated": boolean }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing or invalid action |
| 404 | `{ "error": "Knowledge object not found" }` | UUID not found in any collection |
| 500 | `{ "error": "Failed to update knowledge object" }` | Server/Weaviate error |

**Implementation:** `app/api/knowledge/[id]/route.ts` → calls `deprecateKnowledgeObject()` / `restoreKnowledgeObject()` from `lib/knowledge.ts`

---

## GET /api/dashboard

Returns health metrics for the knowledge base: object counts, staleness, and relationship gap analysis.

**Runtime:** `nodejs`

**Response (success):**
- Status: `200`
- Content-Type: `application/json`
- Body:

```json
{
  "counts": { "persona": 0, "segment": 0, "use_case": 0, "business_rule": 0, "icp": 0 },
  "totalCount": 0,
  "neverReviewed": [{ "id": "string", "name": "string", "type": "string", "updatedAt": "string" }],
  "stale": [{ "id": "string", "name": "string", "type": "string", "updatedAt": "string" }],
  "gaps": {
    "noRelationships": [{ "id": "string", "name": "string", "type": "string", "updatedAt": "string" }],
    "partialRelationships": [{ "id": "string", "name": "string", "type": "string", "updatedAt": "string", "gapDetail": "string" }],
    "asymmetricRelationships": [{ "id": "string", "name": "string", "type": "string", "updatedAt": "string", "gapDetail": "string" }],
    "icpMissingRefs": [{ "id": "string", "name": "string", "type": "string", "updatedAt": "string", "gapDetail": "string" }],
    "businessRulesNoSubType": [{ "id": "string", "name": "string", "type": "string", "updatedAt": "string" }]
  }
}
```

**Gap analysis includes:**
- Objects with zero cross-references (Persona, Segment, ICP only)
- Partial relationships (e.g. UseCase not linked from any Persona or Segment; Persona with segments but no use cases)
- Asymmetric relationships (A→B exists but B→A does not, for bidirectional pairs)
- ICPs missing persona or segment reference
- BusinessRules with no `subType`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 500 | `{ "error": "Failed to fetch dashboard data" }` | Server/Weaviate error |

**Implementation:** `app/api/dashboard/route.ts` → calls `getDashboardData()` from `lib/dashboard.ts`
