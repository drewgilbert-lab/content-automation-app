> Back to [Roadmap Index](./README.md)

# Group G — Bulk Upload with AI Classification

> Scope: Upload multiple documents at once, classify each into the correct knowledge object type using AI, review classifications, then route to the admin review queue. Phase 2 adds per-file upload resilience and comprehensive error reporting with actionable guidance.
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

## Phase 2 — Upload Resilience and Error Reporting

> Phase 1 (G1–G5) is complete. G6 (per-file upload isolation) is done. G7 (comprehensive error reporting) is planned.

**G6 — Per-File Upload Isolation** — ✅ Done (2026-07-13)
Refactored the parse flow in `app/bulk-upload/components/bulk-upload-wizard.tsx` to upload files individually (`UPLOAD_CONCURRENCY = 1` from `lib/bulk-upload-constants.ts`) rather than sending all files in a single `FormData` request. A single file failure does not prevent other files from being parsed. Added `POST /api/bulk-upload/session` to create an empty session, then `POST /api/bulk-upload/parse-single` accepting one file and returning one `ParsedDocument` plus errors; the existing batch `POST /api/bulk-upload/parse` endpoint remains for backward compatibility. As each file successfully parses, it is added to the upload session via `addDocumentToSession()` in `lib/upload-session.ts` so the session builds incrementally. Failed files show a per-file retry button without re-uploading the entire batch; users can continue with successfully parsed files on partial failure. Step 1 shows per-file upload progress with individual status (pending, uploading, parsed, failed). Enforces 50-file and 100 MB batch limits client-side before starting uploads; server-side per-file limit lowered to 4 MB (Vercel 4.5 MB body limit). Middleware excludes multipart parse routes from Edge body buffering; auth still enforced via `requireRole` on routes.

**G7 — Comprehensive Error Reporting and Recovery**
Surface all per-file errors at every stage of the bulk upload pipeline with actionable remediation guidance. Specific improvements:

- **Parse error display**: Render per-document `parseErrors` from the parse API response in the wizard UI. Show a warning banner per file with the specific error message (e.g., "PDF has no extractable text", "File exceeds 4 MB limit", "Unsupported file type"). Currently `parseErrors` is stored in component state (`parsedDocs`) but no JSX renders it.
- **Failed file visibility in review**: Documents that failed classification should remain visible in the Step 3 review list as error cards instead of vanishing. Show the file name, error reason, and actions: "Retry Classification", "Edit Content Manually", or "Remove from Batch". Currently `reviewDocs` in `bulk-upload-wizard.tsx` filters to only `classifications.has(i)`, hiding failures.
- **Actionable error guidance**: Map each error type to a user-facing remediation hint:
  - "PDF has no extractable text" → "This PDF may be scanned/image-based. Convert to text or use OCR before uploading."
  - "File exceeds 4 MB limit" → "Reduce file size or split into smaller documents."
  - "Unsupported file type" → "Supported formats: .md, .pdf, .docx, .txt"
  - "Classification failed" → "The AI could not determine the document type. Edit the type manually or retry."
  - Submission creation failure → surface the specific Weaviate/validation error.
- **Approve error detail**: Replace the current "N errors" count shown after approval with a per-document error list showing file name, error message, and remediation. Currently `bulk-upload-wizard.tsx` only displays `errors.length`.
- **Reclassify error feedback**: Surface reclassify failures as an inline error or toast on the affected document review card. Currently the reclassify handler returns silently on `!res.ok`.
- **Error summary panel**: Add a collapsible "Issues" panel at the top of Step 3 (review) that aggregates all errors across parsing and classification, grouped by error type, with counts and links to the affected documents.

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
