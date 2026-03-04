> Back to [Roadmap Index](./README.md)

# Group O — Review Queue Enhancements

> Scope: Add bulk approve capability and editable tags to the review queue. Upgrade the knowledge form tag input to the pill-style TagEditor.
> Dependencies: Group E (Review Queue).

**O1 — Bulk Approve**
Add multi-select capability to the review queue list page (`app/queue/components/submission-list.tsx`). Convert from a server-rendered link list to a client component with: checkbox per row (only for pending/deferred submissions), "select all visible" checkbox in the header, and a sticky action bar that appears when items are selected showing count and "Approve Selected" button. Clicking the row (not the checkbox) still navigates to the detail page. Build a new `POST /api/submissions/bulk-review` endpoint accepting `{ submissionIds: string[], action: "accept" }`. The endpoint iterates through IDs and calls `reviewSubmission(id, "accept")` for each, returning a summary of successes and failures. Bulk reject is intentionally excluded since rejection requires a per-submission comment.

**O2 — Editable Tags in Review Queue**
Replace static tag pills in `app/queue/components/submission-review.tsx` with the `TagEditor` component from the bulk upload flow. Store edited tags in local state. When the reviewer clicks "Accept", include the edited tags in the proposed content sent to the review endpoint. Update `POST /api/submissions/[id]/review` to accept an optional `proposedContentOverrides` field in the request body. If present, merge overrides into the submission's `proposedContent` before calling `reviewSubmission()`.

**O3 — Upgrade Knowledge Form TagEditor**
Replace the comma-separated text input in `app/knowledge/components/knowledge-form.tsx` with the pill-style `TagEditor` component. Since `TagEditor` is now used in three places (bulk upload, review queue, knowledge form), move it from `app/bulk-upload/components/tag-editor.tsx` to `app/components/tag-editor.tsx` as a shared component. Update all existing imports.
