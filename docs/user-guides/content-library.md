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
2. **Submitted** — Creator clicks "Submit for Review" to send content for editorial review
3. **Approved** — A reviewer approves the content
4. **Published** — An admin publishes the approved content

If a reviewer rejects the content, it returns to draft status with feedback comments. The creator can revise and re-submit.

### Available Actions by Status

| Status | Creator Actions | Reviewer Actions | Admin Actions |
|--------|----------------|------------------|---------------|
| Draft | Edit, Submit for Review | Delete | Delete |
| Submitted | (read-only) | Approve, Reject | Approve, Reject |
| In Review | (read-only) | Approve, Reject | Approve, Reject |
| Approved | Edit (resets to draft) | — | Publish, Edit |
| Published | Edit (resets to draft) | — | Edit |

---

## Exporting Content

On the content detail page, you can copy the body text or download it as a markdown file using the export options.
