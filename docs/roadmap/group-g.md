> Back to [Roadmap Index](./README.md)

# Group G — Bulk Upload with AI Classification

> Scope: Upload multiple documents at once, classify each into the correct knowledge object type using AI, review classifications, then route to the admin review queue.
> Dependencies: Groups A–F (existing submission/review queue infrastructure). Shares document parser with [Group H](./group-h.md).

**G1 — Document Parser** — **Done**
Build `lib/document-parser.ts` supporting four file formats: Markdown (`.md`), PDF (`.pdf`), DOCX (`.docx`), and plain text (`.txt`). PDF extraction via `pdf-parse`; DOCX conversion via `mammoth`. Returns a `ParsedDocument` containing extracted text content, filename, original format, word count, and any parse errors. Enforces configurable limits: 10 MB per file, 100 MB per batch, 50 files per batch. Validates MIME types server-side.

**G2 — AI Classification API** — **Done**
Build `POST /api/bulk-upload/classify` route. For each parsed document, calls Claude with the document content plus a summary of all existing knowledge objects in the system. Claude returns a JSON classification: `objectType`, `objectName`, `tags`, `suggestedRelationships` (with target names resolved to IDs via Weaviate lookup), and a `confidence` score (0.0–1.0). Items below 0.7 confidence are flagged for manual review. Processing is sequential to avoid rate limits, with progress reported via Server-Sent Events.

**G3 — Upload Session Management** — **Done**
Build `POST /api/bulk-upload/parse` route accepting `FormData` with multiple files. Parses all files via G1, creates a transient upload session stored server-side (in-memory with optional Redis persistence). Each session stores parsed documents, classification results, and user edits. Sessions expire after 24 hours. `GET /api/bulk-upload/session/[sessionId]` retrieves session state. `POST /api/bulk-upload/reclassify` re-runs classification on a single document within a session.

**G4 — Uploader Review UI** — **Done**
Build `/bulk-upload` page. Step 1: drag-and-drop file upload zone with file list preview (name, size, format). Step 2: classification progress indicator ("Classifying document 3 of 10...") with per-document status. Step 3: review list where the uploader can verify and edit the AI-assigned type (dropdown), name (text input), tags (tag editor), and suggested relationships (expandable panel with add/remove) for each document. Confidence scores displayed per item; low-confidence items highlighted. Expandable document preview shows parsed content. Bulk actions: "Accept All", "Accept Selected", "Reclassify Selected". Individual actions: edit, remove from batch, view original.

**G5 — Submission Bridge** — **Done**
Build `POST /api/bulk-upload/approve` route. For each approved document, creates a `Submission` via the existing `createSubmission()` function with `submissionType: "new"`. The `proposedContent` JSON includes `name`, `content`, `tags`, and `relationships` (with resolved target IDs). Approved documents enter the existing admin review queue at `/queue`. Returns an array of created submission IDs with per-document error reporting for partial failures.

**Bug fixes applied (February 26, 2026):** Critical fixes to make the pipeline functional end-to-end: `pdf-parse` downgraded from v2.x to v1.x (v2 crashed Node.js via `DOMMatrix`), lazy PDF import to isolate parser failures, error surfacing in upload wizard, step-back to Step 1 on classification failure, try/catch in reclassify route, missing type labels added, `sourceFile` provenance added to approve route, and `globalThis` session store for Turbopack dev mode stability. See CHANGELOG.md for full details.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| PDF/DOCX parsing loses formatting, tables, images | Extracted content may be incomplete or garbled | Show parsed preview before classification; allow manual content editing; log parse errors per document |
| No OCR for scanned PDFs | Image-based PDFs produce empty or minimal text extraction | Document the limitation; consider `tesseract.js` or cloud OCR as a future enhancement |
| AI misclassifies object type | Wrong type assigned to a document | Confidence scoring with 0.7 threshold; flag low-confidence items; user corrects before submitting |
| Claude API rate limits on large batches | 50 documents = 50 API calls; may hit rate limits | Sequential processing with configurable delays; exponential backoff on 429 responses; batch size limit |
| Partial batch failures | Some documents fail to parse or classify while others succeed | Continue processing remaining documents; surface per-document errors; allow retry of failed items |
| No semantic duplicate detection | User may upload documents that duplicate existing knowledge objects | Add Weaviate `nearText` similarity check during classification; flag potential duplicates in review UI |
| Upload session lost on server restart | In-memory session storage is volatile | Persist sessions to Redis or a temp database for production; show "Resume Upload" if session exists |
| High API costs for large batches | No visibility into token usage per batch | Track token consumption; consider a cheaper model for initial classification; display cost estimate |
| Reviewing 50+ documents is overwhelming | Poor UX at scale | Pagination, type/confidence filters, bulk actions, keyboard shortcuts |
| Malicious file uploads | Security risk from unvalidated files | Validate MIME types + extensions server-side; enforce size limits; sanitize filenames |
