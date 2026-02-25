# Using the Review Queue

> Last updated: February 2026

---

## Overview

The Review Queue is the approval layer for all proposed changes to the knowledge base. Any time a Contributor submits a new object or an edit to an existing one, it lands in the queue as a submission. Admins review each submission and decide whether to accept it, reject it, or defer it to a later time.

This guide covers both sides of the workflow: how Contributors submit changes, and how Admins process the queue.

---

## Contributor: Submitting a Change

### Submitting a New Object

1. Navigate to the Knowledge Base at `/knowledge`.
2. Click **+ New Object**.
3. Select the object type and fill in all required fields. See the [Managing Knowledge](./managing-knowledge.md) guide for field details.
4. Click **Submit for Review**.

Your submission enters the queue with type **New** and status **Pending**. You will not see it in the live knowledge base until an Admin accepts it.

### Submitting an Edit to an Existing Object

1. Open the detail page of the object you want to edit.
2. Click **Edit**.
3. Make your changes in the edit form.
4. Click **Submit for Review**.

Your submission enters the queue with type **Update** and status **Pending**. The live version of the object is unchanged until an Admin reviews and accepts your edit.

### After Submitting

You can check the status of your submissions by visiting the Review Queue at `/queue`. Look for your submission in the list. The status column shows whether it is still Pending, or has been Accepted, Rejected, or Deferred.

---

## Admin: Reviewing Submissions

### Navigating to the Queue

Go to `/queue` to open the Review Queue. The page shows a list of all submissions.

### Filtering the Queue

Use the tab filters to narrow the list:
- **All** — every submission regardless of type
- **New** — submissions proposing a brand new knowledge object
- **Update** — submissions proposing a change to an existing object

By default, the list hides closed submissions (those that have been accepted or rejected). Toggle **Show Closed** in the top-right of the list to include them. This is useful for auditing past decisions.

### Opening a Submission

Click any submission row to open its review page at `/queue/[id]`.

---

## The Review Page

### New Submissions

For a **New** submission, the review page shows a full preview of the proposed content exactly as it would appear in the knowledge base. Read through it carefully — check that the content is accurate, well-structured, and appropriate for the type.

The sidebar shows submission metadata:
- **Submitter** — who submitted the change
- **Object Type** — the knowledge type being proposed
- **Proposed Name** — the name of the new object
- **Submitted At** — when the submission was created

### Update Submissions

For an **Update** submission, the review page shows a **side-by-side comparison**:
- **Left panel** — the current live version of the knowledge object
- **Right panel** — the proposed new version from the submission

Read both panels carefully to understand exactly what is changing. Look for additions, removals, and rewrites. The side-by-side layout makes it easy to spot differences.

For complex updates, consider using the **AI Merge** workflow instead of accepting or rejecting outright — see the [AI Merge](./ai-merge.md) guide for details.

---

## Review Actions

Three action buttons appear at the bottom of every review page:

### Accept

Accepting a submission makes the change live immediately:
- For **New** submissions: a new knowledge object is created in the live knowledge base.
- For **Update** submissions: the existing knowledge object is updated with the proposed content.

The submission status changes to **Accepted** and is moved to the closed state.

### Reject

Rejecting a submission declines the change. You must provide a **comment** explaining why — this is required and visible to the submitter. A rejection closes the submission without making any changes to the knowledge base.

Use rejection when the proposed content is incorrect, off-brand, duplicates an existing object, or otherwise should not go live in its current form.

### Defer

Deferring a submission keeps it open in the queue without accepting or rejecting it. You can optionally add a note explaining what additional information or changes are needed.

Use deferral when the content is not ready yet but has potential — for example, if you need the submitter to clarify a section, or if the change is valid but should wait for a related update to be completed first.

---

## Reviewing Your Own Work

Admins can also create and edit objects directly without going through the queue. But if an Admin submits using the Contributor flow (by switching to Contributor mode), their submission still goes through the queue like any other. This is intentional — it allows Admins to test the submission workflow.

---

## Common Pitfalls

**I submitted a change but I don't see it in the queue.** Make sure you are looking at the correct tab filter. If you are a Contributor, ensure the queue is not filtered to hide open items. Submissions appear as soon as they are created.

**The Accept button is not doing anything.** Check your network connection and try again. The accept action makes an API call to write the content to Weaviate — if it fails silently, a page refresh should show the current queue state.

**I rejected a submission but the submitter says they don't know why.** Rejection comments are stored on the submission record. The submitter can see the comment by viewing their submission in the queue. Make sure your comment clearly explains the reason and what changes (if any) would make the submission acceptable.

**I want to accept most of a submission but change a few things.** Use the AI Merge workflow instead of a plain Accept. Merge lets you generate a combined version, edit it manually, and then save the result. See the [AI Merge](./ai-merge.md) guide.

**The side-by-side diff for an Update submission is hard to read because the changes are large.** Large diffs can be difficult to review in the basic side-by-side view. The AI Merge workflow provides a tracked-changes view with character-level highlighting that makes large updates much easier to parse.

**I accidentally accepted a submission I should have rejected.** There is no undo for an accepted submission. You will need to open the now-live knowledge object, edit it back to the previous version manually, and save.
