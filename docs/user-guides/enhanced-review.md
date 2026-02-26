# Enhanced Change Review

> Last updated: February 2026

---

## Overview

Enhanced Change Review adds two capabilities to the Review Queue: (1) a document addition workflow that lets users upload a document to supplement an existing knowledge object via AI merge, and (2) visual diff highlighting that shows exactly what changed between the current and proposed content with green/red markup.

---

## Document Addition Workflow

### Uploading a Document

1. Navigate to a knowledge object's detail page at `/knowledge/[id]`.
2. Click **Add Document** in the action bar (visible to Contributors).
3. Upload a single file (markdown, PDF, DOCX, or plain text).
4. The system parses the document and creates a `document_add` submission targeting the existing knowledge object.

The submission appears in the Review Queue alongside regular update and new submissions.

### Reviewing a Document Addition

1. Navigate to the Review Queue at `/queue`.
2. Open the `document_add` submission by clicking it.
3. The review page shows the current knowledge object content alongside the raw uploaded document text.
4. Click **Merge Document** to start the AI merge. Claude reads the existing content and the uploaded document, then produces a merged version that incorporates the new information while preserving the existing structure.
5. The Merge Editor opens with tracked changes on the left and an editable version on the right, identical to the standard AI Merge workflow.
6. Edit the merged content as needed, then click **Save Merge** to update the live knowledge object and close the submission.

You can also click **Discard** to cancel the merge without making changes. The submission remains pending and can be reviewed again later.

---

## Visual Diff Highlighting

### What Changed

When reviewing any submission in the queue, the content diff now shows precise text-level changes:

- **Green text with underline** marks content that was added in the proposed version
- **Red text with strikethrough** marks content that was removed from the current version
- Unchanged text appears normally

This replaces the previous plain side-by-side comparison that showed the two versions without highlighting differences.

### Metadata Changes

Above the content diff, a metadata changes section highlights field-level differences:

- **Name, subType, revenueRange, employeeRange** changes are shown with red strikethrough for the old value and green highlighting for the new value
- **Tag changes** are displayed as pill badges: green for added tags, red with strikethrough for removed tags, and gray for unchanged tags

The metadata section only appears when there are actual field or tag differences between the current and proposed versions.

### View Modes

A toggle above the content diff lets you switch between two display modes:

- **Unified view** shows changes inline in a single panel. Additions and deletions appear in sequence. Unchanged sections are collapsible to reduce noise in long documents.
- **Side-by-side view** shows the original content in the left panel and the modified content in the right panel, with synchronized scrolling. Deletions are highlighted in the left panel; additions are highlighted in the right panel.

A legend bar at the top identifies the color coding: Added, Removed, and Unchanged.

---

## Relationship to AI Merge

The Merge Editor (used during AI Merge) and the Content Diff (used during standard review) now share the same underlying `VisualDiff` component. This means the green/red tracked-changes highlighting is consistent across both workflows. The Merge Editor's tracked changes view updates live as you edit, while the Content Diff view is read-only.

---

## Common Pitfalls

**The "Add Document" button does not appear on the knowledge detail page.** Confirm you are in Contributor or Admin mode using the role toggle. The button is only visible to users who can submit changes.

**The "Merge Document" button is not appearing for a document addition submission.** Confirm the submission type is `document_add`. The button only appears for `document_add` and `update` submissions, not for `new` submissions.

**The diff shows many small changes that are just formatting differences.** The diff operates on raw markdown source text. Changes in whitespace, line wrapping, or markdown formatting (e.g., heading levels, list markers) appear as content changes. This is expected behavior.

**Unified view is hard to read for very long documents.** Switch to side-by-side view for long documents. Unchanged sections collapse automatically in unified view to reduce scrolling.

**I saved the merge and want to undo it.** There is no built-in undo. The merged content replaces the previous version in Weaviate. You would need to manually restore the content via the knowledge object's edit page.
