# Using Bulk Upload

> Last updated: July 13, 2026

---

## Overview

Bulk Upload lets you upload multiple documents at once, have AI classify them into knowledge object types, review the classifications, and submit them to the admin review queue. This guide walks you through the three-step wizard.

---

## Getting There

Navigate to `/bulk-upload` from the home page, or click the **Bulk Upload** card in the Modules section.

---

## Step 1: Upload Files

- Drag and drop files into the upload zone, or click to browse
- Accepted formats: Markdown (.md), PDF (.pdf), DOCX (.docx), Plain Text (.txt)
- Limits: 4 MB per file, 100 MB total, 50 files per batch
- You can remove individual files from the list before uploading
- Click **Upload & Parse** to begin

### Per-File Upload Progress

Files upload individually (up to 3 at a time) rather than in one batch request. Each file shows its own status:

- **Pending** — waiting to upload
- **Uploading** — currently being parsed
- **Parsed** — successfully extracted
- **Failed** — upload or parse error

If a file fails, click **Retry** on that file to try again without re-uploading the rest of the batch. When some files succeed and others fail, you can click **Continue** to proceed to classification with only the successfully parsed files.

---

## Step 2: AI Classification

- Each document is classified by Claude AI into a knowledge object type
- Progress is shown in real-time with per-document status
- Classification includes: object type, name, tags, suggested relationships, and confidence score
- Documents with confidence below 70% are flagged for manual review
- This step advances automatically when all documents are processed
- If classification fails, an error message is shown and you are returned to Step 1 to retry

---

## Step 3: Review & Approve

- Review the AI-assigned classification for each document
- Edit fields inline: type (dropdown), name (text), tags (add/remove)
- Low-confidence items are highlighted with an amber border
- Expand content preview to see parsed document text
- Suggested relationships are shown when available

### Bulk Actions

- **Select All / Deselect All** — Toggle selection for all documents
- **Approve Selected** — Submit selected documents to the admin review queue
- **Reclassify Selected** — Re-run AI classification on selected documents (clears any manual edits)
- **Remove Selected** — Remove documents from the batch

### Individual Actions

- **Reclassify** — Re-run classification for a single document
- **Remove** — Remove a single document from the batch

---

## After Approval

Approved documents create submissions in the admin review queue at `/queue`. Each approved document becomes one submission with:

- The AI-classified (or manually edited) object type and name
- The parsed document content
- Tags and suggested relationships

An admin reviews and accepts/rejects each submission through the standard review queue workflow. See the [Review Queue](./review-queue.md) guide for details.

---

## Tips

- Upload documents of the same general topic together for better classification results
- Review low-confidence items carefully — the AI may be uncertain about the best object type
- Use the **Reclassify** action after editing content if you want the AI to reconsider
- You can approve some documents and remove others — partial approval is supported
- If one file fails to upload, retry just that file — you do not need to restart the entire batch

---

## Limitations

- Scanned/image-based PDFs may produce empty text extraction (no OCR support)
- Upload sessions expire after 24 hours
- Individual files must be 4 MB or smaller (Vercel serverless body limit)

---

## Common Pitfalls

**I uploaded files but the parse step failed.** An error message will appear explaining what went wrong. Check that your files are in a supported format (.md, .pdf, .docx, .txt) and within the size limits (4 MB per file, 100 MB total, 50 files per batch). If the error persists, try uploading fewer files or a different file format.

**One file failed but others succeeded.** Use the per-file **Retry** button on the failed file, or click **Continue** to proceed with the files that parsed successfully.

**Classification failed and I'm back on Step 1.** If the AI classification encounters a fatal error, you are automatically returned to Step 1 with an error message. You can retry by clicking **Upload & Parse** again. The error may be temporary (e.g., API timeout).

**The AI classification seems wrong for some documents.** Use **Reclassify** to have the AI try again. You can also edit the type, name, and tags manually before approving.

**I approved documents but don't see them in the queue.** Navigate to `/queue` and check the list. New submissions appear immediately. Ensure you are not filtering by a tab that excludes them.

**My upload session disappeared.** Sessions expire after 24 hours. If the session expired or the server restarted, re-upload your files to start a new session.
