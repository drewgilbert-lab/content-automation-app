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

> These routes are scoped but not yet implemented. See [ROADMAP.md](./ROADMAP.md) Group G.

### POST /api/bulk-upload/parse

Parses uploaded files and creates an upload session.

**Runtime:** `nodejs`

**Request:**
- Content-Type: `multipart/form-data`
- Fields: multiple `file` entries (Markdown, PDF, DOCX, TXT)
- Limits: 10 MB per file, 100 MB total, 50 files max

**Response (success):**
- Status: `200`
- Body:
```json
{
  "sessionId": "string",
  "documents": [
    {
      "id": "string",
      "filename": "string",
      "originalFormat": "markdown | pdf | docx | txt",
      "content": "string",
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
| 400 | `{ "error": "..." }` | No files, unsupported format, or size limit exceeded |
| 500 | `{ "error": "Failed to parse documents" }` | Server/parsing error |

**Implementation:** `app/api/bulk-upload/parse/route.ts` → calls `parseDocument()` from `lib/document-parser.ts`

---

### POST /api/bulk-upload/classify

Classifies parsed documents using Claude AI. Returns classifications via Server-Sent Events for real-time progress.

**Runtime:** `nodejs`

**Request:**
```json
{
  "sessionId": "string (required)",
  "documents": [
    {
      "id": "string",
      "content": "string",
      "filename": "string"
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

**Implementation:** `app/api/bulk-upload/classify/route.ts` → calls `classifyDocument()` from `lib/bulk-classify.ts` and `streamMessage()` from `lib/claude.ts`

---

### GET /api/bulk-upload/session/[sessionId]

Retrieves the current state of an upload session.

**Runtime:** `nodejs`

**Response (success):**
- Status: `200`
- Body: `{ "sessionId": "string", "documents": ParsedDocument[], "classifications": ClassificationResult[], "userEdits": object, "status": "pending | approved | expired", "createdAt": "string" }`

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "Session not found or expired" }` | Invalid or expired sessionId |

---

### POST /api/bulk-upload/reclassify

Re-runs AI classification on a single document within a session.

**Runtime:** `nodejs`

**Request:**
```json
{
  "sessionId": "string (required)",
  "documentId": "string (required)"
}
```

**Response (success):**
- Status: `200`
- Body: Updated `ClassificationResult` for the document

**Response (error):**

| Status | Body | Condition |
|---|---|---|
| 404 | `{ "error": "..." }` | Session or document not found |
| 500 | `{ "error": "Failed to reclassify document" }` | Server/Claude error |

---

### POST /api/bulk-upload/approve

Approves selected documents and creates submissions in the review queue.

**Runtime:** `nodejs`

**Request:**
```json
{
  "sessionId": "string (required)",
  "documentIds": ["string (required)"],
  "submitter": "string (required)"
}
```

**Response (success):**
- Status: `201`
- Body:
```json
{
  "submissions": [{ "documentId": "string", "submissionId": "string" }],
  "errors": [{ "documentId": "string", "error": "string" }]
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

## Planned: Document Upload Route (Group H)

> Scoped but not yet implemented. See [ROADMAP.md](./ROADMAP.md) Group H.

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

## Planned: Skills CRUD Routes (Group I)

> Scoped but not yet implemented. See [ROADMAP.md](./ROADMAP.md) Group I.

### GET /api/skills

Returns all skills, with optional filters.

**Runtime:** `nodejs`

**Query Parameters:**
- `contentType` (optional): Filter by content type. Valid values: `email`, `blog`, `social`, `thought_leadership`, `internal_doc`
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

## Planned: External REST API (Group K)

> Versioned read-only REST API for 3rd party applications. Scoped but not yet implemented. See [ROADMAP.md](./ROADMAP.md) Group K.

All `/api/v1/` routes require `X-API-Key` header authentication (except health). Responses follow the shape `{ "data": ..., "meta": ... }`. Deprecated objects are excluded by default.

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

### GET /api/v1/health

Health check for monitoring. Does not require API key authentication.

**Runtime:** `nodejs`

**Response (success):**
- Status: `200`
- Body: `{ "status": "ok" | "degraded", "version": "1", "weaviate": { "connected": boolean }, "collections": { "persona": number, ... }, "timestamp": string }`

**Implementation:** `app/api/v1/health/route.ts` → calls `checkWeaviateConnection()` from `lib/weaviate.ts`

---

## Planned: MCP Server Tools (Groups J, L)

> MCP tools exposed by the standalone MCP server at `mcp-server/`. Scoped but not yet implemented. See [ROADMAP.md](./ROADMAP.md) Groups J and L.

The MCP server is a standalone Node.js process (not a Next.js API route). It uses `@modelcontextprotocol/sdk` with stdio and SSE transports. Tools are called by MCP clients (LLMs, automation tools) via the MCP protocol.

### Read-Only Tools (Group L — LLM RAG, also used by Group J)

| Tool | Description | Input | Returns |
|---|---|---|---|
| `list_collections` | All collections with counts and descriptions | None | Array of `{ name, type, description, objectCount, crossReferences }` |
| `list_objects` | List objects with optional type filter | `type?`, `includeDeprecated?`, `limit?`, `offset?` | Array of `{ id, name, type, tags, deprecated, createdAt, updatedAt }` |
| `get_object` | Full object detail by ID | `id` (string) | Full detail with content, metadata, and resolved cross-references |
| `search_objects` | Semantic search via `nearText` | `query`, `type?`, `limit?`, `certaintyThreshold?` | Ranked results with `id, name, type, score, snippet` |
| `get_relationships` | Outbound and inbound relationships | `id` (string) | `{ outbound, inbound }` with resolved names and types |
| `get_dashboard_health` | Knowledge base health metrics | None | Aggregated counts: total, stale, never-reviewed, gaps |
| `get_collection_schema` | Schema definitions for collections | `type?` | Properties, data types, descriptions, cross-reference definitions |

### Discovery Tools (Group J — Inbound MCP)

| Tool | Description | Input | Returns |
|---|---|---|---|
| `list_knowledge_types` | Supported types with required/optional fields | None | Array of `{ type, label, description, requiredFields, optionalFields }` |
| `get_object_schema` | Full field schema for a specific type | `objectType` | Field-level schema with types, constraints, examples |

### Write Tools (Group J — Inbound MCP)

| Tool | Description | Input | Returns |
|---|---|---|---|
| `create_knowledge_object` | Propose a new object (creates Submission) | `objectType`, `name`, `content`, `tags?`, type-specific fields | `{ submissionId, status: "pending" }` |
| `update_knowledge_object` | Propose an update (creates Submission) | `objectId`, writable fields | `{ submissionId, status: "pending", targetObjectId }` |
| `check_submission_status` | Check status of a submission | `submissionId` | `{ submissionId, status, reviewComment? }` |

### MCP Resources (Group L)

| Resource | URI | Description |
|---|---|---|
| Knowledge Base Overview | `knowledge://overview` | Static markdown describing collections and relationships |
| Relationship Map | `knowledge://relationships` | Text cross-reference graph |
| Collection Summaries | `knowledge://collections/{type}` | Dynamic: count, names, tags per collection |
