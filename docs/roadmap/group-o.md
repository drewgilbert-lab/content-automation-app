> Back to [Roadmap Index](./README.md)

# Group O — Review Queue Enhancements

> Scope: Add bulk approve capability, editable tags, inline content editing during review, and upgrade the knowledge form tag input to the pill-style TagEditor.
> Dependencies: Group E (Review Queue), Group F (AI Merge Workflow).

**O1 — Bulk Approve**
Add multi-select capability to the review queue list page (`app/queue/components/submission-list.tsx`). Convert from a server-rendered link list to a client component with: checkbox per row (only for pending/deferred submissions), "select all visible" checkbox in the header, and a sticky action bar that appears when items are selected showing count and "Approve Selected" button. Clicking the row (not the checkbox) still navigates to the detail page. Build a new `POST /api/submissions/bulk-review` endpoint accepting `{ submissionIds: string[], action: "accept" }`. The endpoint iterates through IDs and calls `reviewSubmission(id, "accept")` for each, returning a summary of successes and failures. Bulk reject is intentionally excluded since rejection requires a per-submission comment.

**O2 — Editable Tags in Review Queue**
Replace static tag pills in `app/queue/components/submission-review.tsx` with the `TagEditor` component from the bulk upload flow. Store edited tags in local state. When the reviewer clicks "Accept", include the edited tags in the proposed content sent to the review endpoint. Update `POST /api/submissions/[id]/review` to accept an optional `proposedContentOverrides` field in the request body. If present, merge overrides into the submission's `proposedContent` before calling `reviewSubmission()`. O4 generalizes this `proposedContentOverrides` pattern to all proposed content fields.

**O3 — Upgrade Knowledge Form TagEditor**
Replace the comma-separated text input in `app/knowledge/components/knowledge-form.tsx` with the pill-style `TagEditor` component. Since `TagEditor` is now used in three places (bulk upload, review queue, knowledge form), move it from `app/bulk-upload/components/tag-editor.tsx` to `app/components/tag-editor.tsx` as a shared component. Update all existing imports.

**O4 — Inline Content Editing in Review**
Convert the read-only "Proposed Content" card in `app/queue/components/submission-review.tsx` into an editable form so reviewers can modify any field before accepting. All proposed content fields render as form inputs by default when the submission is reviewable (`pending` or `deferred`). For **new** and **update** knowledge submissions, editable fields include: `name` (text input), `subType` (text input or select), `revenueRange` (text input, segment-specific), `employeeRange` (text input, segment-specific), `content` (markdown textarea with edit/preview toggle, reusing the pattern from `KnowledgeForm`), and `tags` (pill-style `TagEditor` per O2). For **document_add** submissions, the uploaded document `content` body is editable via the same markdown textarea with preview toggle. For **skill** submissions, the skill `content` body is editable. Fields that do not apply to the current object type remain hidden as they are today.

Initialize local `editedContent` state from the parsed `proposedContent` JSON on mount. Track a dirty flag by comparing `editedContent` against the original `proposedContent`. When any field has been modified, show a "Modified" indicator on the changed field and a summary badge in the actions section so the reviewer knows the accepted content will differ from the original proposal.

When the reviewer clicks "Accept", send the edited fields as `proposedContentOverrides` in the request body to `POST /api/submissions/[id]/review`. This extends the `proposedContentOverrides` mechanism introduced by O2 from tags-only to all proposed content keys (`name`, `content`, `subType`, `revenueRange`, `employeeRange`, `tags`). The review endpoint merges overrides into the submission's `proposedContent` before calling `reviewSubmission()`. No new endpoint is needed.

Scope boundary: this task covers the normal Accept review flow only. The MergeEditor (Group F) and ReplaceConfirm flows remain unchanged — they already have their own editing mechanisms for the content body. Closed submissions (`accepted`, `rejected`) continue to render as read-only.

**Risks and Gaps:**
| Risk | Impact | Mitigation |
|------|--------|------------|
| Large markdown bodies may be awkward to edit in a plain textarea | Reviewer experience degrades for long documents | Use a resizable textarea with edit/preview toggle; consider a split-pane editor in a follow-up if needed |
| Conflicting edits if O2 (tag-only overrides) ships before O4 | API contract for `proposedContentOverrides` may need to be expanded | O2 should define `proposedContentOverrides` as `Partial<ProposedContentParsed>` from the start so O4 only adds UI, no API schema change |
| Reviewers may accidentally modify content and accept without noticing | Unintended changes written to the knowledge base | Dirty-flag indicators on changed fields plus a confirmation prompt when accepting with modifications |
