# Using Bulk Upload

> Last updated: February 2026

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
- Limits: 10 MB per file, 100 MB total, 50 files per batch
- You can remove individual files from the list before uploading
- Click **Upload & Parse** to begin

---

## Step 2: AI Classification

- Each document is classified by Claude AI into a knowledge object type
- Progress is shown in real-time with per-document status
- Classification includes: object type, name, tags, suggested relationships, and confidence score
- Documents with confidence below 70% are flagged for manual review
- This step advances automatically when all documents are processed

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

---

## Limitations

- Scanned/image-based PDFs may produce empty text extraction (no OCR support)
- Upload sessions expire after 24 hours
- Sessions are stored in memory and may be lost on server restart

---

## Common Pitfalls

**I uploaded files but the parse step failed.** Check that your files are in a supported format (.md, .pdf, .docx, .txt) and within the size limits (10 MB per file, 100 MB total, 50 files per batch).

**The AI classification seems wrong for some documents.** Use **Reclassify** to have the AI try again. You can also edit the type, name, and tags manually before approving.

**I approved documents but don't see them in the queue.** Navigate to `/queue` and check the list. New submissions appear immediately. Ensure you are not filtering by a tab that excludes them.

**My upload session disappeared.** Sessions expire after 24 hours and are stored in memory. If the server restarted, the session is lost. Re-upload your files to start a new session.
