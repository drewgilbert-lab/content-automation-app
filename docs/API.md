# Content Engine — API Reference

> Last updated: March 17, 2026 (CW1–CW21 implemented including full test matrix; K3–K6, J1–J12 implemented, N10 contentType propagation implemented; Group R narrative routes planned)

**Production Base URL:** `https://content-automation-app-zeta.vercel.app`

All internal routes below are relative to this base URL in production. The external API (`/api/v1/`) is also served from this URL with `X-API-Key` authentication.

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

---

## POST /api/submissions

Creates a new submission for review.

**Runtime:** `nodejs`

**Request:**
```json
{
  "submitter": "string (required)",
  "objectType": "string (required) — persona | segment | use_case | business_rule | icp",
  "objectName": "string (required)",
  "submissionType": "string (required) — new | update",
  "proposedContent": "string (required) — JSON-serialized proposed data",
  "targetObjectId": "string (required for update submissions)"
}
```

**Response (success):**
- Status: `201`
- Body: `{ "id": "string", "status": "pending" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing required fields, invalid type, or missing targetObjectId for update |
| 500 | `{ "error": "Failed to create submission" }` | Server error |

**Implementation:** `app/api/submissions/route.ts` → calls `createSubmission()` from `lib/submissions.ts`

---

## GET /api/submissions

Returns all submissions, with optional filters.

**Runtime:** `nodejs`

**Query Parameters:**
- `type` (optional): Filter by submission type. Valid values: `new`, `update`
- `status` (optional): Filter by status. Valid values: `pending`, `accepted`, `rejected`, `deferred`

**Response (success):**
- Status: `200`
- Body: `{ "submissions": SubmissionListItem[] }`

Each `SubmissionListItem` contains: `id`, `submitter`, `objectName`, `objectType`, `submissionType`, `status`, `createdAt`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Invalid type or status filter |
| 500 | `{ "error": "Failed to list submissions" }` | Server error |

**Implementation:** `app/api/submissions/route.ts` → calls `listSubmissions()` from `lib/submissions.ts`

---

## GET /api/submissions/[id]

Returns a single submission by ID.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Submission UUID

**Response (success):**
- Status: `200`
- Body: Full `SubmissionDetail` object

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Submission not found" }` | UUID not found |
| 500 | `{ "error": "Failed to fetch submission" }` | Server error |

**Implementation:** `app/api/submissions/[id]/route.ts` → calls `getSubmission()` from `lib/submissions.ts`

---

## POST /api/submissions/[id]/review

Reviews a pending submission: accept, reject, or defer.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Submission UUID

**Request:**
```json
{
  "action": "accept | reject | defer",
  "comment": "string (required for reject)",
  "note": "string (optional for defer)"
}
```

**Response (success):**
- Status: `200`
- Body: `{ "id": "string", "status": "string", "objectId": "string (on accept)" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Invalid action or missing comment on reject |
| 404 | `{ "error": "..." }` | Submission not found |
| 409 | `{ "error": "..." }` | Submission already closed (accepted/rejected) |
| 500 | `{ "error": "Failed to review submission" }` | Server error |

**Implementation:** `app/api/submissions/[id]/review/route.ts` → calls `reviewSubmission()` from `lib/submissions.ts`

---

## POST /api/submissions/[id]/merge

Generates an AI-merged version of a knowledge object by sending the current live content and the proposed update to Claude.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Submission UUID

**Request:** No body required.

**Response (success):**
- Status: `200`
- Content-Type: `text/plain; charset=utf-8`
- Transfer-Encoding: `chunked`
- Body: streamed merged text from Claude

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Not an update submission, no target object, or invalid proposed content |
| 404 | `{ "error": "..." }` | Submission or target object not found |
| 409 | `{ "error": "Submission is already closed" }` | Submission already accepted/rejected |
| 500 | `{ "error": "Failed to generate merge" }` | Server/Claude error |

**Implementation:** `app/api/submissions/[id]/merge/route.ts` → calls `buildMergePrompt()` from `lib/merge.ts` and `streamMessage()` from `lib/claude.ts`

---

## POST /api/submissions/[id]/merge/save

Saves the reviewer-edited merged content to the target knowledge object and closes the submission as accepted.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Submission UUID

**Request:**
```json
{
  "mergedContent": "string (required)"
}
```

**Response (success):**
- Status: `200`
- Body: `{ "id": "string", "status": "accepted", "objectId": "string" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing mergedContent, not an update submission, or no target object |
| 404 | `{ "error": "Submission not found" }` | UUID not found |
| 409 | `{ "error": "Submission is already closed" }` | Submission already accepted/rejected |
| 500 | `{ "error": "Failed to save merged content" }` | Server error |

**Implementation:** `app/api/submissions/[id]/merge/save/route.ts` → calls `updateKnowledgeObject()` from `lib/knowledge.ts`

---

## Planned: Bulk Upload Routes (Group G)

> These routes are scoped but not yet implemented. See [roadmap/README.md](./roadmap/README.md) Group G.

### POST /api/bulk-upload/parse

Parses uploaded files and creates an upload session. Returns document metadata (without full content) and a session ID for subsequent classification and approval.

**Runtime:** `nodejs`

**Request:**
- Content-Type: `multipart/form-data`
- Field: `files` (multiple File entries — `.md`, `.pdf`, `.docx`, `.txt`)
- Limits: 10 MB per file, 100 MB total batch size, 50 files per batch

**Response (success):**
- Status: `200`
- Body:
```json
{
  "sessionId": "uuid",
  "documents": [
    {
      "index": 0,
      "filename": "string",
      "format": "md | pdf | docx | txt",
      "wordCount": 0,
      "parseErrors": ["string"]
    }
  ],
  "errors": [{ "filename": "string", "error": "string" }]
}
```

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "No files provided" }` | FormData contains no files |
| 400 | `{ "error": "Batch contains N files, exceeding the limit of 50" }` | Too many files |
| 400 | `{ "error": "Batch total size N MB exceeds the limit of 100 MB" }` | Batch too large |
| 400 | `{ "error": "Invalid form data" }` | Request body is not valid FormData |

**Implementation:** `app/api/bulk-upload/parse/route.ts` → calls `parseDocuments()` from `lib/document-parser.ts`, `createSession()` from `lib/upload-session.ts`

---

### POST /api/bulk-upload/classify

Classifies parsed documents using Claude AI. Returns classifications via Server-Sent Events for real-time progress.

**Runtime:** `nodejs`

**Request:**
```json
{
  "sessionId": "string (optional — when provided, classification results are stored in the session)",
  "documents": [
    {
      "filename": "string (required)",
      "format": "string (optional, default 'txt')",
      "content": "string (required)",
      "wordCount": 0,
      "errors": ["string"]
    }
  ]
}
```

**Response (success — SSE stream):**
- Status: `200`
- Content-Type: `text/event-stream`
- Events:
  - `progress`: `{ "documentId": "string", "index": 0, "total": 0, "status": "processing | complete | error" }`
  - `result`: `{ "documentId": "string", "objectType": "string", "objectName": "string", "tags": ["string"], "confidence": 0.0, "suggestedRelationships": [{ "relationshipType": "string", "targetName": "string", "targetId": "string", "confidence": 0.0 }], "reasoning": "string" }`
  - `error`: `{ "documentId": "string", "error": "string" }`
  - `done`: `{ "total": 0, "classified": 0, "failed": 0 }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing sessionId or documents |
| 404 | `{ "error": "Session not found" }` | Invalid or expired sessionId |
| 500 | `{ "error": "Failed to classify documents" }` | Server/Claude error |

**Implementation:** `app/api/bulk-upload/classify/route.ts` → calls `classifyDocument()` from `lib/classifier.ts`. When `sessionId` is provided, stores results in the session via `lib/upload-session.ts`.

---

### GET /api/bulk-upload/session/[sessionId]

Retrieves the current state of an upload session.

**Runtime:** `nodejs`

**Response (success):**
- Status: `200`
- Body:
```json
{
  "id": "uuid",
  "documents": [{ "index": 0, "filename": "string", "format": "string", "content": "string", "wordCount": 0, "parseErrors": [] }],
  "classifications": [{ "index": 0, "classification": { "filename": "string", "objectType": "string", "objectName": "string", "tags": [], "suggestedRelationships": [], "confidence": 0.0, "needsReview": false } }],
  "userEdits": [{ "index": 0, "edits": {} }],
  "status": "parsing | classifying | reviewing | approved",
  "createdAt": "ISO string",
  "expiresAt": "ISO string"
}
```

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Session not found or expired" }` | Invalid or expired sessionId |

**Implementation:** `app/api/bulk-upload/session/[sessionId]/route.ts` → calls `getSerializedSession()` from `lib/upload-session.ts`

---

### POST /api/bulk-upload/reclassify

Re-runs AI classification on a single document within a session.

**Runtime:** `nodejs`

**Request:**
```json
{
  "sessionId": "string (required)",
  "documentIndex": "integer (required, 0-based index into session documents)"
}
```

**Response (success):**
- Status: `200`
- Body: Updated `ClassificationResult` for the document

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Document has no extractable content" }` | Document content is empty |
| 404 | `{ "error": "..." }` | Session or document not found |
| 500 | `{ "error": "Failed to reclassify document" }` | Server/Claude error |

**Implementation:** `app/api/bulk-upload/reclassify/route.ts` → calls `classifyDocument()` from `lib/classifier.ts`, updates session via `lib/upload-session.ts`

---

### POST /api/bulk-upload/approve

Approves selected documents and creates submissions in the review queue.

**Runtime:** `nodejs`

**Request:**
```json
{
  "sessionId": "string (required)",
  "documentIndexes": [0, 1, 2],
  "submitter": "string (required)",
  "overrides": {
    "0": { "objectType": "persona", "objectName": "Updated Name", "tags": ["new-tag"] }
  }
}
```
Note: `overrides` is optional — allows applying user edits to classifications before creating submissions.

**Response (success):**
- Status: `201`
- Body:
```json
{
  "submissions": [{ "documentIndex": 0, "submissionId": "uuid" }],
  "errors": [{ "documentIndex": 0, "error": "string" }]
}
```

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing required fields or no documents selected |
| 404 | `{ "error": "Session not found" }` | Invalid or expired sessionId |
| 500 | `{ "error": "Failed to create submissions" }` | Server error |

**Implementation:** `app/api/bulk-upload/approve/route.ts` → calls `createSubmission()` from `lib/submissions.ts`

---

## Planned: Content Narrative Routes (Group R)

> Scoped but not yet implemented. See [roadmap/README.md](./roadmap/README.md) Group R.

### GET /api/narratives

Returns all Content Narratives with optional filters.

**Runtime:** `nodejs`

**Query Parameters:**
- `status` (optional): Filter by status. Valid values: `draft`, `in_review`, `approved`, `archived`
- `theme` (optional): Filter by theme (partial match)
- `tags` (optional): Comma-separated tags
- `createdBy` (optional): Filter by creator

**Response (success):**
- Status: `200`
- Body: `{ "narratives": NarrativeListItem[] }`

Each `NarrativeListItem` contains: `id`, `name`, `theme`, `targetAudience`, `status`, `version`, `tags`, `createdBy`, `deprecated`, `createdAt`, `updatedAt`

**Implementation:** `app/api/narratives/route.ts` → calls `listNarratives()` from `lib/narratives.ts`

---

### POST /api/narratives

Creates a new Content Narrative (status: draft).

**Runtime:** `nodejs`

**Request:**
```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "theme": "string (required)",
  "angle": "string (optional)",
  "targetAudience": "string (optional)",
  "intent": "string (optional)",
  "content": "string (required)",
  "researchNotes": "string (optional)",
  "tags": "string[] (optional)",
  "createdBy": "string (required)",
  "linkedPersonas": "string[] (optional — Persona UUIDs)",
  "linkedSegments": "string[] (optional — Segment UUIDs)",
  "linkedUseCases": "string[] (optional — UseCase UUIDs)",
  "linkedCompetitors": "string[] (optional — Competitor UUIDs)",
  "linkedCustomerEvidence": "string[] (optional — CustomerEvidence UUIDs)"
}
```

**Response (success):**
- Status: `201`
- Body: `{ "id": "string", "name": "string", "status": "draft", "version": "1.0.0" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing required fields |
| 409 | `{ "error": "..." }` | Name conflict |
| 500 | `{ "error": "Failed to create narrative" }` | Server error |

**Implementation:** `app/api/narratives/route.ts` → calls `createNarrative()` from `lib/narratives.ts`

---

### GET /api/narratives/[id]

Returns a single Content Narrative with resolved cross-references.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): ContentNarrative UUID

**Response (success):**
- Status: `200`
- Body: Full `NarrativeDetail` object including content, metadata, and resolved cross-references (linked personas, segments, use cases, competitors, customer evidence)

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Narrative not found" }` | UUID not found |
| 500 | `{ "error": "Failed to fetch narrative" }` | Server error |

**Implementation:** `app/api/narratives/[id]/route.ts` → calls `getNarrative()` from `lib/narratives.ts`

---

### PUT /api/narratives/[id]

Updates a draft Content Narrative. Only draft narratives can be updated directly.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): ContentNarrative UUID

**Request:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "theme": "string (optional)",
  "angle": "string (optional)",
  "targetAudience": "string (optional)",
  "intent": "string (optional)",
  "content": "string (optional)",
  "researchNotes": "string (optional)",
  "tags": "string[] (optional)",
  "linkedPersonas": "string[] (optional)",
  "linkedSegments": "string[] (optional)",
  "linkedUseCases": "string[] (optional)",
  "linkedCompetitors": "string[] (optional)",
  "linkedCustomerEvidence": "string[] (optional)"
}
```

**Response (success):**
- Status: `200`
- Body: Updated `NarrativeDetail` object

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Cannot update a non-draft narrative" }` | Narrative is not in draft status |
| 404 | `{ "error": "Narrative not found" }` | UUID not found |
| 500 | `{ "error": "Failed to update narrative" }` | Server error |

**Implementation:** `app/api/narratives/[id]/route.ts` → calls `updateNarrative()` from `lib/narratives.ts`

---

### DELETE /api/narratives/[id]

Deletes a draft Content Narrative. Only drafts can be deleted.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): ContentNarrative UUID

**Response (success):**
- Status: `200`
- Body: `{ "deleted": true }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Only draft narratives can be deleted" }` | Narrative is not in draft status |
| 404 | `{ "error": "Narrative not found" }` | UUID not found |
| 500 | `{ "error": "Failed to delete narrative" }` | Server error |

**Implementation:** `app/api/narratives/[id]/route.ts` → calls `deleteNarrative()` from `lib/narratives.ts`

---

### POST /api/narratives/[id]/submit

Submits a draft narrative for review. Creates a Submission and changes status to `in_review`.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): ContentNarrative UUID

**Response (success):**
- Status: `200`
- Body: `{ "id": "string", "status": "in_review", "submissionId": "string" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Only draft narratives can be submitted" }` | Not in draft status |
| 404 | `{ "error": "Narrative not found" }` | UUID not found |

**Implementation:** `app/api/narratives/[id]/submit/route.ts` → calls `submitForReview()` from `lib/narratives.ts`

---

### POST /api/narratives/[id]/approve

Approves a narrative that is in review. Sets `approvedBy` and `approvedAt`.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): ContentNarrative UUID

**Request:**
```json
{
  "approvedBy": "string (required)"
}
```

**Response (success):**
- Status: `200`
- Body: `{ "id": "string", "status": "approved", "approvedBy": "string", "approvedAt": "string" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Only in-review narratives can be approved" }` | Not in in_review status |
| 404 | `{ "error": "Narrative not found" }` | UUID not found |

**Implementation:** `app/api/narratives/[id]/approve/route.ts` → calls `approveNarrative()` from `lib/narratives.ts`

---

### POST /api/narratives/[id]/reject

Rejects a narrative in review with a comment. Returns status to draft.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): ContentNarrative UUID

**Request:**
```json
{
  "comment": "string (required)"
}
```

**Response (success):**
- Status: `200`
- Body: `{ "id": "string", "status": "draft", "reviewComment": "string" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Not in in_review status or missing comment |
| 404 | `{ "error": "Narrative not found" }` | UUID not found |

**Implementation:** `app/api/narratives/[id]/reject/route.ts` → calls `rejectNarrative()` from `lib/narratives.ts`

---

### POST /api/narratives/[id]/archive

Archives an approved narrative.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): ContentNarrative UUID

**Response (success):**
- Status: `200`
- Body: `{ "id": "string", "status": "archived" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Only approved narratives can be archived" }` | Not in approved status |
| 404 | `{ "error": "Narrative not found" }` | UUID not found |

**Implementation:** `app/api/narratives/[id]/archive/route.ts` → calls `archiveNarrative()` from `lib/narratives.ts`

---

### PATCH /api/narratives/[id]

Deprecates or restores a Content Narrative.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): ContentNarrative UUID

**Request:**
```json
{
  "action": "deprecate | restore"
}
```

**Response (success):**
- Status: `200`
- Body: `{ "id": "string", "deprecated": boolean }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing or invalid action |
| 404 | `{ "error": "Narrative not found" }` | UUID not found |

**Implementation:** `app/api/narratives/[id]/route.ts` → calls `deprecateNarrative()` / `restoreNarrative()` from `lib/narratives.ts`

---

### POST /api/narratives/generate

AI-assisted narrative creation. Performs semantic search and streams a draft narrative via Claude.

**Runtime:** `nodejs`

**Request:**
```json
{
  "themePrompt": "string (required)",
  "pinnedObjectIds": "string[] (optional — knowledge object UUIDs to include)"
}
```

**Response (success):**
- Status: `200`
- Content-Type: `text/event-stream`
- Body: SSE stream with narrative fields and suggested knowledge object links

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "themePrompt is required" }` | Missing theme prompt |
| 500 | `{ "error": "Failed to generate narrative" }` | Server/Claude error |

**Implementation:** `app/api/narratives/generate/route.ts` → semantic search via `lib/knowledge.ts`, Claude streaming via `lib/claude.ts`

---

### Planned: External Narrative API (Group R, Phase 7)

| Method | Route | Description | Auth |
|---|---|---|---|
| `GET` | `/api/v1/narratives` | List approved, non-deprecated narratives with pagination and tag filtering | `X-API-Key` required |
| `GET` | `/api/v1/narratives/:id` | Approved narrative detail with resolved cross-references | `X-API-Key` required |

These endpoints follow the existing `/api/v1/` patterns with `withApiAuth()` middleware and `{ "data": ..., "meta": ... }` response shape.

---

## Planned: Document Upload Route (Group H)

> Scoped but not yet implemented. See [roadmap/README.md](./roadmap/README.md) Group H.

### POST /api/submissions/upload-document

Uploads a document to supplement an existing knowledge object. Parses the file and creates a `document_add` submission.

**Runtime:** `nodejs`

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `file`: single file (Markdown, PDF, DOCX, TXT)
  - `targetObjectId`: UUID of the existing knowledge object
  - `submitter`: string

**Response (success):**
- Status: `201`
- Body: `{ "id": "string", "status": "pending", "submissionType": "document_add" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing file, unsupported format, missing targetObjectId, or size limit exceeded |
| 404 | `{ "error": "Target object not found" }` | targetObjectId does not exist |
| 500 | `{ "error": "Failed to create submission" }` | Server/parsing error |

**Implementation:** `app/api/submissions/upload-document/route.ts` → calls `parseDocument()` from `lib/document-parser.ts` and `createSubmission()` from `lib/submissions.ts`

---

## Skills CRUD Routes (Group I)

**Status: Implemented**

**Implementation files:** `app/api/skills/route.ts`, `app/api/skills/[id]/route.ts`

### GET /api/skills

Returns all skills, with optional filters.

**Runtime:** `nodejs`

**Query Parameters:**
- `contentType` (optional): Filter by content type. Valid values: `email`, `blog`, `social`, `thought_leadership`, `internal_doc`, `content_narrative`, `pillar_research`, `competitor_functionality_brief`, `competitor_persona_messaging_brief`, `market_content_brief`
- `active` (optional): Filter by active status. Valid values: `true`, `false`
- `category` (optional): Filter by category

**Response (success):**
- Status: `200`
- Body: `{ "skills": SkillListItem[] }`

Each `SkillListItem` contains: `id`, `name`, `description`, `active`, `contentType`, `category`, `tags`, `version`, `deprecated`, `createdAt`, `updatedAt`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Invalid filter values |
| 500 | `{ "error": "Failed to fetch skills" }` | Server/Weaviate error |

**Implementation:** `app/api/skills/route.ts` → calls `listSkills()` from `lib/skills.ts`

---

### POST /api/skills

Creates a new skill.

**Runtime:** `nodejs`

**Request:**
```json
{
  "name": "string (required)",
  "description": "string (required)",
  "content": "string (required)",
  "contentType": "string[] (required)",
  "active": "boolean (optional, default: true)",
  "triggerConditions": "string (optional — JSON)",
  "parameters": "string (optional — JSON array of SkillParameter)",
  "outputFormat": "string (optional)",
  "tags": "string[] (optional)",
  "category": "string (optional)",
  "author": "string (optional)"
}
```

**Response (success):**
- Status: `201`
- Body: `{ "id": "string", "name": "string", "version": "1.0.0" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing required fields or invalid contentType |
| 409 | `{ "error": "..." }` | Name conflict within Skill collection |
| 500 | `{ "error": "Failed to create skill" }` | Server/Weaviate error |

**Implementation:** `app/api/skills/route.ts` → calls `createSkill()` from `lib/skills.ts`

---

### GET /api/skills/[id]

Returns a single skill by UUID.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Weaviate UUID

**Response (success):**
- Status: `200`
- Body: Full `SkillDetail` object including all properties, cross-references, and usage count

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Skill not found" }` | UUID not found |
| 500 | `{ "error": "Failed to fetch skill" }` | Server/Weaviate error |

**Implementation:** `app/api/skills/[id]/route.ts` → calls `getSkill()` from `lib/skills.ts`

---

### PUT /api/skills/[id]

Updates an existing skill. Accepts any writable fields.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Weaviate UUID

**Request:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "content": "string (optional)",
  "contentType": "string[] (optional)",
  "active": "boolean (optional)",
  "triggerConditions": "string (optional)",
  "parameters": "string (optional)",
  "outputFormat": "string (optional)",
  "tags": "string[] (optional)",
  "category": "string (optional)",
  "version": "string (optional — new version string)"
}
```

**Response (success):**
- Status: `200`
- Body: Updated `SkillDetail` object

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Invalid fields |
| 404 | `{ "error": "Skill not found" }` | UUID not found |
| 500 | `{ "error": "Failed to update skill" }` | Server/Weaviate error |

**Implementation:** `app/api/skills/[id]/route.ts` → calls `updateSkill()` from `lib/skills.ts`

---

### DELETE /api/skills/[id]

Deletes a skill. Checks for `GeneratedContent` references first.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Weaviate UUID

**Query Parameters:**
- `confirm` (optional): `true` to skip the reference warning and delete immediately

**Response (success — deleted):**
- Status: `200`
- Body: `{ "deleted": true }`

**Response (warning — references exist):**
- Status: `200`
- Body: `{ "deleted": false, "referenceCount": 0, "message": "string" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Skill not found" }` | UUID not found |
| 500 | `{ "error": "Failed to delete skill" }` | Server/Weaviate error |

**Implementation:** `app/api/skills/[id]/route.ts` → calls `deleteSkill()` from `lib/skills.ts`

---

### PATCH /api/skills/[id]

Activates, deactivates, deprecates, or restores a skill.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Weaviate UUID

**Request:**
```json
{
  "action": "activate | deactivate | deprecate | restore"
}
```

**Response (success):**
- Status: `200`
- Body: `{ "id": "string", "active": true, "deprecated": false }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing or invalid action |
| 404 | `{ "error": "Skill not found" }` | UUID not found |
| 500 | `{ "error": "Failed to update skill" }` | Server/Weaviate error |

**Implementation:** `app/api/skills/[id]/route.ts` → calls `activateSkill()` / `deactivateSkill()` / `deprecateSkill()` / `restoreSkill()` from `lib/skills.ts`

---

## Content Workflow Routes (Group Content Workflow — CW1–CW21)

**Status: Implemented** — Full test matrix (lifecycle, retries, branch isolation, fan-in, artifact validation, lineage) passing.

**Implementation files:** `app/api/content-workflow/runs/route.ts`, `app/api/content-workflow/runs/[id]/route.ts`, `app/api/content-workflow/runs/[id]/status/route.ts`, `app/api/content-workflow/runs/[id]/package/route.ts`, `app/api/content-workflow/runs/[id]/cancel/route.ts`, `app/api/content-workflow/runs/[id]/start/route.ts`, `app/api/content-workflow/runs/[id]/events/route.ts`, `app/api/content-workflow/runs/[id]/retry/route.ts`, `app/api/content-workflow/metrics/route.ts`, `app/api/content-workflow/runs/failed/route.ts`, `app/api/content-workflow/runs/[id]/diagnostics/route.ts`, `lib/content-workflow-orchestrator.ts`, `lib/content-workflow-executor.ts`, `lib/content-workflow-events.ts`, `lib/content-workflow-validators.ts`, `lib/content-workflow-assembler.ts`, `lib/content-workflow-telemetry.ts`, `lib/content-workflow-budget.ts`

### POST /api/content-workflow/runs

Creates a parent pillar research run from Step 1 input. Seeds default branches and returns the run snapshot. Idempotency-key deduplication returns 200 with existing run when key matches.

**Runtime:** `nodejs`

**Request:**
```json
{
  "inputType": "use_case | topic_theme (required)",
  "inputValue": "string (required)",
  "createdBy": "string (required)",
  "idempotencyKey": "string (optional)"
}
```

**Response (success — created):**
- Status: `201`
- Body: `{ "run": PillarResearchRun, "branches": PillarResearchBranch[], "steps": PillarResearchStep[], "deduped": false }`

**Response (success — deduped):**
- Status: `200`
- Body: Same shape with `deduped: true`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Invalid inputType or missing required fields |
| 500 | `{ "error": "..." }` | Store error |

**Implementation:** `app/api/content-workflow/runs/route.ts` → calls `createWorkflowRun()` from `lib/content-workflow-store.ts`

---

### GET /api/content-workflow/runs/[id]

Returns full run status, branch states, steps, and artifacts for a run.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Run UUID

**Response (success):**
- Status: `200`
- Body: `{ "run": PillarResearchRun, "branches": PillarResearchBranch[], "steps": PillarResearchStep[], "artifacts": PillarResearchArtifact[] }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Run not found" }` | Run ID not found |
| 500 | `{ "error": "Failed to fetch run" }` | Server error |

**Implementation:** `app/api/content-workflow/runs/[id]/route.ts` → calls `getWorkflowSnapshot()` from `lib/content-workflow-store.ts`, `listArtifactsByRun()` from `lib/content-workflow-artifacts.ts`

---

### GET /api/content-workflow/runs/[id]/status

Returns a status summary for polling: run status, branch/step counts, artifact count, and status breakdowns.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Run UUID

**Response (success):**
- Status: `200`
- Body: `{ "runId": string, "status": string, "branchCount": number, "stepCount": number, "artifactCount": number, "branchesByStatus": Record<string, number>, "stepsByStatus": Record<string, number>, "updatedAt": string }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Run not found" }` | Run ID not found |
| 500 | `{ "error": "Failed to fetch run status" }` | Server error |

**Implementation:** `app/api/content-workflow/runs/[id]/status/route.ts` → calls `getWorkflowSnapshot()` and `listArtifactsByRun()`

---

### POST /api/content-workflow/runs/[id]/cancel

Cancels a run and its active branches. Transitions run status to `cancelled`.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Run UUID

**Response (success):**
- Status: `200`
- Body: `{ "id": string, "status": "cancelled" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Run not found" }` | Run ID not found |
| 500 | `{ "error": "..." }` | Store error |

**Implementation:** `app/api/content-workflow/runs/[id]/cancel/route.ts` → calls `cancelRun()` from `lib/content-workflow-store.ts`

---

### POST /api/content-workflow/runs/[id]/start

Starts orchestration for a run. Transition behavior is idempotent: terminal runs return deduped/no-op.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Run UUID

**Response (success — accepted):**
- Status: `202`
- Body: `{ "started": true, "deduped": boolean, "status": "branches_running | fan_in_pending | completed | failed | cancelled" }`

**Response (success — no-op):**
- Status: `200`
- Body: `{ "started": false, "deduped": true, "status": "completed | failed | cancelled" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Run not found" }` | Run ID not found |
| 400 | `{ "error": "..." }` | Invalid transition or input |

**Implementation:** `app/api/content-workflow/runs/[id]/start/route.ts` → calls `startRunOrchestration()` from `lib/content-workflow-orchestrator.ts`

---

### GET /api/content-workflow/runs/[id]/events

Returns an SSE-formatted event stream payload for run lifecycle events (`run.*`, `branch.*`, `step.*`, `retry.accepted`). Supports incremental reads via `after`.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Run UUID

**Query Parameters:**
- `after` (optional): event ID cursor; returns events after this ID.

**Response (success):**
- Status: `200`
- Content-Type: `text/event-stream`
- Body: SSE events with `id`, `event`, and `data` fields.

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Run not found" }` | Run ID not found |
| 500 | `{ "error": "Failed to stream events" }` | Server error |

**Implementation:** `app/api/content-workflow/runs/[id]/events/route.ts` → calls `getWorkflowRun()` from `lib/content-workflow-store.ts` and `listWorkflowEvents()` from `lib/content-workflow-events.ts`

---

### POST /api/content-workflow/runs/[id]/retry

Retries failed execution targets by branch or step. Supports replay-from-checkpoint with optional metadata.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Run UUID

**Request:**
```json
{
  "branchId": "string (optional; required if stepId not provided)",
  "stepId": "string (optional; required if branchId not provided)",
  "replayFromStepId": "string (optional — checkpoint step to replay from)",
  "reason": "string (optional — reason for retry)",
  "requestedBy": "string (optional — who requested the retry)"
}
```

**Response (success):**
- Status: `202`
- Body: `{ "accepted": true }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing target or target not retryable |
| 404 | `{ "error": "Branch not found | Step not found | Run not found" }` | Resource not found |

**Implementation:** `app/api/content-workflow/runs/[id]/retry/route.ts` → calls `retryRunTarget()` from `lib/content-workflow-orchestrator.ts`

---

### GET /api/content-workflow/metrics

Returns a workflow metrics snapshot for operational dashboards.

**Runtime:** `nodejs`

**Response (success):**
- Status: `200`
- Body:
```json
{
  "activeRunsByStatus": { "created": 0, "branches_running": 0, "completed": 0, "failed": 0, "cancelled": 0 },
  "averageRunDurationMs": 0,
  "branchFailureRates": { "functionality": 0, "persona_messaging": 0, "market": 0 },
  "topFailingSteps": [{ "stepType": "string", "failureCount": 0 }],
  "tokenUsageByBranch": { "branchId": 0 },
  "failedRuns": 0,
  "totalRuns": 0
}
```

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 500 | `{ "error": "Failed to fetch workflow metrics" }` | Server error |

**Implementation:** `app/api/content-workflow/metrics/route.ts` → calls `getWorkflowMetricsSnapshot()` from `lib/content-workflow-telemetry.ts`

---

### GET /api/content-workflow/runs/failed

Lists all failed runs with diagnostics for dead-letter inspection.

**Runtime:** `nodejs`

**Response (success):**
- Status: `200`
- Body: `{ "count": number, "runs": FailedRunWithDiagnostics[] }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 500 | `{ "error": "Failed to list failed runs" }` | Server error |

**Implementation:** `app/api/content-workflow/runs/failed/route.ts` → calls `listFailedRunsWithDiagnostics()` from `lib/content-workflow-orchestrator.ts`

---

### GET /api/content-workflow/runs/[id]/diagnostics

Returns run diagnostics: failed branches, failed steps, and structured logs for a specific run.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Run UUID

**Response (success):**
- Status: `200`
- Body:
```json
{
  "run": { "id": "string", "status": "string", "errorSummary": "string", ... },
  "failedBranches": [{ "id": "string", "branchType": "string", "status": "failed", "lastError": "string", ... }],
  "failedSteps": [{ "id": "string", "stepType": "string", "status": "failed", ... }],
  "logs": [{ "id": "string", "timestamp": "string", "level": "string", "event": "string", "message": "string", ... }]
}
```

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Run not found" }` | Run ID not found |
| 500 | `{ "error": "Failed to fetch run diagnostics" }` | Server error |

**Implementation:** `app/api/content-workflow/runs/[id]/diagnostics/route.ts` → calls `getRunDiagnostics()` from `lib/content-workflow-orchestrator.ts`

---

### GET /api/content-workflow/runs/[id]/package

Returns the latest final pillar package for a completed run. Includes artifact metadata and payload with content refs for downstream workflows (e.g. Group R narratives).

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): Run UUID

**Response (success):**
- Status: `200`
- Body:
```json
{
  "runId": "string",
  "packageArtifact": {
    "id": "string",
    "name": "string",
    "version": "number",
    "artifactType": "final_pillar_package",
    "contentRef": "string",
    "createdAt": "string",
    "lineage": { "parentArtifactIds": ["string"], "producedByRunId": "string" }
  },
  "payload": {
    "functionalityBriefRef": "string",
    "personaMessagingBriefRef": "string",
    "marketBriefRef": "string",
    "finalAggregationRef": "string"
  }
}
```

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Run not found" }` | Run ID not found |
| 404 | `{ "error": "Final package not found" }` | Run has no assembled final package |
| 500 | `{ "error": "Failed to fetch run package" }` | Server error |

**Implementation:** `app/api/content-workflow/runs/[id]/package/route.ts` → calls `getLatestFinalPillarPackage()` from `lib/content-workflow-assembler.ts`

---

## POST /api/bulk-upload/classify

Classifies parsed documents into knowledge object types using AI. Streams progress and results via Server-Sent Events.

**Runtime:** `nodejs`

**Request:**
```json
{
  "documents": [
    {
      "filename": "string (required)",
      "format": "md | pdf | docx | txt (optional, defaults to txt)",
      "content": "string (required — extracted text content)",
      "wordCount": "number (optional)",
      "errors": ["string (optional — parse errors from G1)"]
    }
  ]
}
```

**Limits:** Maximum 50 documents per request.

**Response (success):**
- Status: `200`
- Content-Type: `text/event-stream`
- Body: SSE stream with the following event types:

```
event: progress
data: {"index": 0, "total": 5, "filename": "doc.md", "status": "classifying"}

event: result
data: {"index": 0, "filename": "doc.md", "classification": {
  "filename": "doc.md",
  "objectType": "persona",
  "objectName": "Sales Engineer",
  "tags": ["sales", "technical"],
  "suggestedRelationships": [
    {"targetId": "uuid", "targetName": "Enterprise", "targetType": "segment", "relationshipType": "hasSegments"}
  ],
  "confidence": 0.85,
  "needsReview": false
}}

event: error
data: {"index": 2, "filename": "doc3.pdf", "error": "Classification failed: ..."}

event: done
data: {"total": 5, "classified": 4, "failed": 1}
```

**Response (validation error):**
- Status: `400`
- Body: `{ "error": "string" }`

**Response (server error):**
- Status: `500`
- Body: `{ "error": "Failed to fetch existing knowledge objects" }`

**Implementation:** `app/api/bulk-upload/classify/route.ts` → `lib/classifier.ts` (classifyDocument) → Claude `claude-sonnet-4-20250514` → `lib/knowledge.ts` (listKnowledgeObjects for relationship resolution)

---

## Connected Systems Admin Routes (Group K)

> Internal admin routes for managing connected systems and API keys. Not versioned, not key-protected — consumed by the admin UI. Implemented in K1–K2.

### GET /api/connections

Returns all connected systems.

**Runtime:** `nodejs`

**Query Parameters:**
- `active` (optional): `true` or `false` to filter by active status

**Response (success):**
- Status: `200`
- Body: `{ "systems": ConnectedSystemListItem[] }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 500 | `{ "error": "Failed to fetch connected systems" }` | Server error |

**Implementation:** `app/api/connections/route.ts` → calls `listConnectedSystems()` from `lib/connections.ts`

---

### POST /api/connections

Creates a new connected system with a generated API key. The plaintext key is returned once and cannot be retrieved again.

**Runtime:** `nodejs`

**Request:**
```json
{
  "name": "string (required)",
  "description": "string (required)",
  "subscribedTypes": ["string"] (optional, defaults to ["*"]),
  "rateLimitTier": "string (optional, defaults to \"standard\")"
}
```

**Response (success):**
- Status: `201`
- Body: `{ "id": "uuid", "name": "string", "apiKey": "string (shown once)" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing required fields |
| 409 | `{ "error": "A connected system named \"...\" already exists" }` | Name conflict |
| 500 | `{ "error": "Failed to create connected system" }` | Server error |

**Implementation:** `app/api/connections/route.ts` → calls `createConnectedSystem()` from `lib/connections.ts`

---

### GET /api/connections/[id]

Returns a single connected system by UUID.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): ConnectedSystem UUID

**Response (success):**
- Status: `200`
- Body: `ConnectedSystemDetail` (id, name, description, apiKeyPrefix, permissions, subscribedTypes, rateLimitTier, active, createdAt, updatedAt)

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Connected system not found" }` | UUID not found |
| 500 | `{ "error": "Failed to fetch connected system" }` | Server error |

**Implementation:** `app/api/connections/[id]/route.ts` → calls `getConnectedSystem()` from `lib/connections.ts`

---

### PUT /api/connections/[id]

Updates a connected system. All fields optional. Cannot modify API key (use rotate-key instead).

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): ConnectedSystem UUID

**Request:**
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "subscribedTypes": ["string"] (optional),
  "rateLimitTier": "string (optional)"
}
```

**Response (success):**
- Status: `200`
- Body: `ConnectedSystemDetail`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "name cannot be empty" }` | Empty name |
| 404 | `{ "error": "Connected system not found" }` | UUID not found |
| 409 | `{ "error": "A connected system named \"...\" already exists" }` | Name conflict |
| 500 | `{ "error": "Failed to update connected system" }` | Server error |

**Implementation:** `app/api/connections/[id]/route.ts` → calls `updateConnectedSystem()` from `lib/connections.ts`

---

### DELETE /api/connections/[id]

Deletes a connected system permanently.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): ConnectedSystem UUID

**Response (success):**
- Status: `200`
- Body: `{ "deleted": true }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Connected system not found" }` | UUID not found |
| 500 | `{ "error": "Failed to delete connected system" }` | Server error |

**Implementation:** `app/api/connections/[id]/route.ts` → calls `deleteConnectedSystem()` from `lib/connections.ts`

---

### PATCH /api/connections/[id]

Activates or deactivates a connected system.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): ConnectedSystem UUID

**Request:**
```json
{
  "action": "activate" | "deactivate"
}
```

**Response (success):**
- Status: `200`
- Body: `{ "id": "uuid", "active": boolean }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "action must be one of: activate, deactivate" }` | Invalid action |
| 404 | `{ "error": "Connected system not found" }` | UUID not found |
| 500 | `{ "error": "Failed to update connected system" }` | Server error |

**Implementation:** `app/api/connections/[id]/route.ts` → calls `activateConnectedSystem()` / `deactivateConnectedSystem()` from `lib/connections.ts`

---

### POST /api/connections/[id]/rotate-key

Rotates the API key for a connected system. Generates a new key, invalidates the old one immediately, and returns the new plaintext key once.

**Runtime:** `nodejs`

**Path Parameters:**
- `id` (required): ConnectedSystem UUID

**Response (success):**
- Status: `200`
- Body: `{ "id": "uuid", "name": "string", "apiKey": "string (shown once)", "apiKeyPrefix": "string (first 8 chars)" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Connected system not found" }` | UUID not found |
| 500 | `{ "error": "Failed to rotate API key" }` | Server error |

**Implementation:** `app/api/connections/[id]/rotate-key/route.ts` → calls `generateApiKey()` from `lib/api-auth.ts`

---

## External REST API (Group K)

**Status: Implemented (Phase 1)**

All `/api/v1/` routes require `X-API-Key` header authentication (except health). Responses follow the shape `{ "data": ..., "meta": ... }`. Deprecated objects are excluded by default. Rate limiting via Upstash Redis (standard: 100/min, elevated: 300/min, search: 20/min). See also [EXTERNAL_API.md](./EXTERNAL_API.md) for the developer guide.

**Security model:**
- Application-level: per-system API keys managed via `ConnectedSystem` collection. Keys are SHA-256 hashed, validated with constant-time comparison, cached in-memory (5-min refresh).
- Weaviate-level: external API routes connect as `content-engine-api-reader` (read-only Weaviate user) for defense-in-depth.
- Response headers: `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, `X-Frame-Options: DENY`.
- CORS: denied by default. Configure `ALLOWED_ORIGINS` env var for browser-based consumers.
- Request logging: every request logged to stdout with `{ timestamp, apiKeyPrefix, endpoint, method, statusCode, durationMs }`.
- Key rotation: `POST /api/connections/[id]/rotate-key` generates a new key without recreating the connected system.

### GET /api/v1/knowledge

Lists all non-deprecated knowledge objects across all collections.

**Runtime:** `nodejs`

**Headers:**
- `X-API-Key` (required): API key for authentication

**Query Parameters:**
- `type` (optional): Filter by collection type. Valid values: `persona`, `segment`, `use_case`, `business_rule`, `icp`
- `tags` (optional): Comma-separated tags, matches any
- `limit` (optional): Default 100, max 500
- `offset` (optional): Pagination offset
- `include_deprecated` (optional): `true` to include deprecated objects

**Response (success):**
- Status: `200`
- Body: `{ "data": KnowledgeListItem[], "meta": { "total": number, "limit": number, "offset": number } }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Invalid or missing API key" }` | Missing or invalid `X-API-Key` header |
| 400 | `{ "error": "..." }` | Invalid filter values |
| 429 | `{ "error": "Rate limit exceeded", "retryAfter": number }` | Rate limit exceeded |

**Implementation:** `app/api/v1/knowledge/route.ts` → calls `listKnowledgeObjects()` from `lib/knowledge.ts` via `withApiAuth()` wrapper

---

### GET /api/v1/knowledge/:id

Returns a single knowledge object by UUID with full content and resolved cross-references.

**Runtime:** `nodejs`

**Headers:**
- `X-API-Key` (required)

**Path Parameters:**
- `id` (required): Weaviate UUID

**Response (success):**
- Status: `200`
- Body: `{ "data": KnowledgeDetail }` with `crossReferences` as array of `{ relationship, objects: [{ id, name, type }] }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Invalid or missing API key" }` | Auth failure |
| 404 | `{ "error": "Knowledge object not found" }` | UUID not found |

**Implementation:** `app/api/v1/knowledge/[id]/route.ts` → calls `getKnowledgeObject()` from `lib/knowledge.ts`

---

### GET /api/v1/knowledge/search

Performs semantic search across knowledge objects using Weaviate `nearText`.

**Runtime:** `nodejs`

**Headers:**
- `X-API-Key` (required)

**Query Parameters:**
- `q` (required): Natural language search query
- `type` (optional): Restrict search to one collection
- `limit` (optional): Default 10, max 50
- `certainty` (optional): Minimum similarity threshold, default 0.7

**Response (success):**
- Status: `200`
- Body: `{ "data": SearchResult[] }` where each result includes `id`, `name`, `type`, `tags`, `score` (float 0.0–1.0), `snippet` (first 500 characters of content)

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "..." }` | Missing `q` parameter |
| 401 | `{ "error": "Invalid or missing API key" }` | Auth failure |
| 429 | `{ "error": "Rate limit exceeded", "retryAfter": number }` | Search rate limit exceeded (20/min) |

**Implementation:** `app/api/v1/knowledge/search/route.ts` → calls `semanticSearchKnowledge()` from `lib/knowledge.ts`

---

### GET /api/v1/knowledge/types

Returns available knowledge object types with counts and descriptions.

**Runtime:** `nodejs`

**Headers:**
- `X-API-Key` (required)

**Response (success):**
- Status: `200`
- Body: `{ "data": [{ "type": string, "displayName": string, "count": number, "description": string }] }`

**Implementation:** `app/api/v1/knowledge/types/route.ts` → calls `getDashboardData()` from `lib/dashboard.ts`

---

### GET /api/v1/skills

Lists skills with optional filtering.

**Runtime:** `nodejs`

**Headers:**
- `X-API-Key` (required)

**Query Parameters:**
- `content_type` (optional): Filter by content type. Valid values: `email`, `blog`, `social`, `thought_leadership`, `internal_doc`, `content_narrative`, `pillar_research`, `competitor_functionality_brief`, `competitor_persona_messaging_brief`, `market_content_brief`
- `active` (optional): `true` or `false`
- `category` (optional): Filter by skill category

**Response (success):**
- Status: `200`
- Body: `{ "data": SkillListItem[], "meta": { "total": number } }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 400 | `{ "error": "Invalid content_type ..." }` | Invalid `content_type` filter |
| 401 | `{ "error": "Invalid or missing API key" }` | Auth failure |
| 500 | `{ "error": "Failed to fetch skills" }` | Server error |

**Implementation:** `app/api/v1/skills/route.ts` → calls `listSkills()` from `lib/skills.ts`

---

### GET /api/v1/skills/:id

Returns a single skill by UUID.

**Runtime:** `nodejs`

**Headers:**
- `X-API-Key` (required)

**Path Parameters:**
- `id` (required): Skill UUID

**Response (success):**
- Status: `200`
- Body: `{ "data": SkillDetail }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Invalid or missing API key" }` | Auth failure |
| 404 | `{ "error": "Skill not found" }` | UUID not found |
| 500 | `{ "error": "Failed to fetch skill" }` | Server error |

**Implementation:** `app/api/v1/skills/[id]/route.ts` → calls `getSkill()` from `lib/skills.ts`

---

### GET /api/v1/skills/types

Returns canonical skill content types and categories for client-side validation.

**Runtime:** `nodejs`

**Headers:**
- `X-API-Key` (required)

**Response (success):**
- Status: `200`
- Body: `{ "data": { "contentTypes": [{ "type": string, "displayName": string }], "categories": [{ "category": string, "displayName": string }], "notes": string[] } }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ "error": "Invalid or missing API key" }` | Auth failure |
| 500 | `{ "error": "Failed to fetch skill type metadata" }` | Server error |

**Implementation:** `app/api/v1/skills/types/route.ts`

---

### GET /api/v1/health

Health check for monitoring. Does not require API key authentication.

**Runtime:** `nodejs`

**Response (success):**
- Status: `200`
- Body: `{ "status": "ok" | "degraded", "version": "1", "weaviate": { "connected": boolean }, "collections": { "persona": number, ... }, "timestamp": string }`

**Implementation:** `app/api/v1/health/route.ts` → calls `checkWeaviateConnection()` from `lib/weaviate.ts`

---

## MCP Server (Phase 1 Read: J1-J8 Done, Phase 2 Write: J9-J12 Done)

> MCP tools and resources exposed by the standalone MCP server at `mcp-server/`. Phase 1 read access complete (J1-J8: foundation, auth, 7 read tools, 3 resources, semantic search, client config). Phase 2 write access complete (J9-J12: 3 write tools). See [roadmap/README.md](./roadmap/README.md) Group J.

The MCP server is a standalone Node.js process (not a Next.js API route) at `mcp-server/`. It uses `@modelcontextprotocol/sdk` v1.x with stdio and Streamable HTTP transports. Deployed on Railway at `content-automation-app.up.railway.app`. Authentication via Bearer token (extends ConnectedSystem API keys with `mcp-read`/`mcp-write` permission scopes). stdio transport (local) requires no auth. Tools are called by MCP clients (LLMs, automation tools) via the MCP protocol.

### Read-Only Tools (J5 — Done)

| Tool | Description | Input | Returns |
|---|---|---|---|
| `list_collections` | All collections with counts and descriptions | None | Array of `{ name, type, description, objectCount, crossReferences }` |
| `list_objects` | List objects with optional type filter | `type?`, `includeDeprecated?`, `limit?`, `offset?` | Array of `{ id, name, type, tags, deprecated, createdAt, updatedAt }` |
| `get_object` | Full object detail by ID | `id` (string) | Full detail with content, metadata, and resolved cross-references |
| `search_objects` | Semantic search via `nearText` | `query`, `type?`, `limit?`, `certaintyThreshold?` | Ranked results with `id, name, type, score, snippet` |
| `get_relationships` | Outbound and inbound relationships | `id` (string) | `{ outbound, inbound }` with resolved names and types |
| `get_dashboard_health` | Knowledge base health metrics | None | Aggregated counts: total, stale, never-reviewed, gaps |
| `get_collection_schema` | Schema definitions for collections | `type?` | Properties, data types, descriptions, cross-reference definitions |

### Write Tools (J9–J12 — Done)

Three write tools that create Submission records entering the review queue. All writes require admin approval.

| Tool | Description | Input | Returns |
|---|---|---|---|
| `create_knowledge_object` | Propose a new object (creates Submission) | `objectType`, `name`, `content`, `tags?`, `sourceDescription?`, type-specific fields | `{ submissionId, status: "pending", message }` |
| `update_knowledge_object` | Propose an update (creates Submission) | `objectId`, `name?`, `content?`, `tags?`, `sourceDescription?`, other writable fields | `{ submissionId, status: "pending", targetObjectId, message }` |
| `check_submission_status` | Check status of a submission | `submissionId` | `{ submissionId, status, objectType, objectName, submissionType, createdAt, reviewComment?, reviewedAt?, reviewNote? }` |

### `create_knowledge_object`

Propose a new knowledge object for review.

**Input:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `objectType` | string | Yes | Knowledge type: persona, segment, use_case, business_rule, icp, competitor, customer_evidence, skill |
| `name` | string | Yes | Proposed object name |
| `content` | string | Yes | Full markdown content |
| `tags` | string[] | No | Tags for categorization |
| `sourceDescription` | string | No | Where the content came from |
| `subType` | string | No | Sub-type for business_rule or customer_evidence |
| `revenueRange` | string | No | Revenue range (segment) |
| `employeeRange` | string | No | Employee count (segment) |
| `website` | string | No | Website URL (competitor) |
| `customerName` | string | No | Customer name (customer_evidence) |
| `industry` | string | No | Industry (customer_evidence) |
| `personaId` | string | No | Persona UUID (ICP) |
| `segmentId` | string | No | Segment UUID (ICP) |
| `description` | string | No | Skill description (skill only) |
| `contentType` | string[] | No | Skill content types (skill only) |
| `category` | string | No | Skill category (skill only) |
| `author` | string | No | Skill author (skill only) |
| `triggerConditions` | string | No | Skill trigger conditions (skill only) |
| `parameters` | string | No | Skill parameters JSON (skill only) |
| `outputFormat` | string | No | Skill output format hint (skill only) |

**Returns:** `{ submissionId, status: "pending", message }`

**Permission:** Requires `mcp-write` on Connected System (HTTP) or no auth (stdio).

### `update_knowledge_object`

Propose an update to an existing knowledge object.

**Input:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `objectId` | string | Yes | UUID of the object to update |
| `name` | string | No | Updated name |
| `content` | string | No | Updated content |
| `tags` | string[] | No | Updated tags |
| `sourceDescription` | string | No | Where the update came from |
| Other type-specific fields | various | No | subType, revenueRange, employeeRange, website, customerName, industry, skill-specific fields (`description`, `contentType`, `category`, `author`, `triggerConditions`, `parameters`, `outputFormat`) |

**Returns:** `{ submissionId, status: "pending", targetObjectId, message }`

**Permission:** Requires `mcp-write` on Connected System (HTTP) or no auth (stdio).

### `check_submission_status`

Check the current status of a previously created submission.

**Input:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `submissionId` | string | Yes | UUID of the submission |

**Returns:** `{ submissionId, status, objectType, objectName, submissionType, createdAt, reviewComment?, reviewedAt?, reviewNote? }`

**Permission:** Requires `mcp-read` (standard auth level).

### MCP Resources (J6 — Done)

| Resource | URI | Description |
|---|---|---|
| Knowledge Base Overview | `knowledge://overview` | Static markdown describing collections and relationships |
| Relationship Map | `knowledge://relationships` | Text cross-reference graph |
| Collection Summaries | `knowledge://collections/{type}` | Dynamic: count, names, tags per collection |
