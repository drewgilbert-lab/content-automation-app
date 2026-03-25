# Content Library User Guide

> Last updated: March 25, 2026

The Content Library is where all content produced by or submitted to the Content Engine is stored, browsed, and managed. It is the counterpart to the Knowledge Base: the Knowledge Base stores what the company knows; the Content Library stores what the company produces.

---

## Browsing Content

Navigate to **Content** in the sidebar (or click the Content Library card on the home page).

The Content Library list page shows all content pieces with:
- **Filter tabs**: All, Draft, Submitted, In Review, Approved, Published — click a tab to filter by status
- **Content type dropdown**: Filter by content type (Email, Blog Post, Social Post, etc.)
- **Search**: Type in the search box to filter by title or tag

Each content row shows the title, status badge, content type, source channel (if external), tags, and creation date.

---

## Viewing Content Details

Click any content piece to view its detail page. The detail page includes:

- **Body**: The full content rendered as markdown
- **Generation Prompt**: If the content was generated, the original prompt is shown (collapsible)
- **Context Used**: Links to the knowledge objects and skills used during generation (persona, segment, use cases, business rules, skills)
- **Metadata sidebar**: Content type, status, source channel, creator, dates, reviewer information
- **Reviewer Feedback**: If content was rejected, the reviewer's feedback is displayed prominently

---

## Submitting Content Manually

1. Click **+ Submit Content** on the Content Library page (or navigate to `/content/new`)
2. Fill in the form:
   - **Title** (required)
   - **Content Type** — select from the dropdown
   - **Body** (required) — write in markdown; use the Preview toggle to see rendered output
   - **Tags** — comma-separated categorization labels
   - **Source Description** — optional, describe where this content came from
3. Click **Create** to save as a draft

---

## Editing Content

From the content detail page, click **Edit** to modify the title, body, or tags.

- Only **draft** content can be edited directly
- **Approved** or **published** content requires confirmation — editing resets the piece to draft status, requiring a new review cycle

---

## Editorial Workflow

Content follows a lifecycle from creation to publication:

1. **Draft** — Content is created and can be freely edited
2. **Submit for Review** — Creator clicks "Submit for Review"; the content is sent for editorial review
3. **Approve or Reject** — A reviewer (editor role) approves or rejects the content
4. **Publish** — An admin publishes the approved content

### What Happens on Rejection

If a reviewer rejects content, a comment is required explaining what needs to change. The content returns to draft status and the rejection feedback is displayed as a prominent banner on the detail page. The creator can revise the content and re-submit for review.

### Editing Approved or Published Content

Clicking **Edit** on approved or published content shows a confirmation dialog warning that editing will reset the piece to draft status. After confirming, the content returns to draft and must go through the full review cycle again before it can be re-published.

### Available Actions by Role

| Status | Contributor (Creator) | Editor (Reviewer) | Admin |
|--------|----------------------|-------------------|-------|
| Draft | Edit, Submit for Review | Edit, Submit for Review, Delete | Edit, Submit for Review, Delete |
| Submitted | (read-only — "Awaiting review" message) | Approve, Reject | Approve, Reject |
| In Review | (read-only — "Awaiting review" message) | Approve, Reject | Approve, Reject |
| Approved | Edit (resets to draft) | Edit (resets to draft) | Publish, Edit (resets to draft) |
| Published | Edit (resets to draft) | Edit (resets to draft) | Edit (resets to draft) |

Content creators viewing their own submitted or in-review content see an "Awaiting review" message instead of review actions. Editors and admins see the Approve/Reject buttons.

---

## Toast Notifications

Every workflow action provides immediate feedback via toast notifications:

- **Success toasts** confirm completed actions (e.g., "Content submitted for review", "Content approved", "Content published")
- **Error toasts** explain failures (e.g., invalid status transitions, network errors)

Toasts appear briefly at the top of the page and dismiss automatically.

---

## Exporting Content

On the content detail page, you can copy the body text or download it as a markdown file using the export options.
