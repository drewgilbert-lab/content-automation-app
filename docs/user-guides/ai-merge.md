# Using AI Merge

> Last updated: February 2026

---

## Overview

AI Merge is a tool available to Admins when reviewing **Update** submissions in the Review Queue. Instead of choosing between the existing version and the proposed version outright, AI Merge asks Claude to intelligently combine the two — keeping the best parts of each and resolving conflicts. The Admin then reviews the AI's merged result, edits it if needed, and saves it as the new live version.

Use AI Merge when a proposed update has valuable new information that should be incorporated, but also when the existing content has sections worth preserving that the submitter may have accidentally removed or overwritten.

---

## When to Use AI Merge

AI Merge is most useful when:
- The submitter has added new, accurate information but also inadvertently removed some existing content
- Both versions are partially correct and neither should fully replace the other
- A submission has large changes and the plain side-by-side diff is difficult to evaluate at a glance
- You want to use the proposed update as a starting point but want to refine the language before it goes live

AI Merge is less useful when:
- The proposed change is straightforwardly correct and nothing in the current version is worth keeping — just Accept it
- The proposed change is clearly wrong or incomplete — just Reject it with a comment

---

## Starting a Merge

1. Navigate to the Review Queue at `/queue`.
2. Open an **Update** submission by clicking it.
3. On the review page, click the **Merge with AI** button. This button is only active for Update submissions.
4. The page transitions into Merge Mode: the side-by-side comparison view is replaced by the Merge Editor.
5. Claude begins generating the merged result. You will see it stream in on the left panel in real time.

---

## The Merge Editor

The Merge Editor has two panels side by side:

### Left Panel — Tracked Changes View (Read-Only)

This panel shows the AI-generated merged result with **tracked changes** highlighting:
- **Green text** — content that was added (present in the merge but not in the original)
- **Red strikethrough text** — content that was removed (present in the original but not in the merge)
- Unchanged text appears normally with no highlighting

This view is read-only. It gives you a clear visual of what the AI decided to keep, add, and remove relative to the current live version.

The tracked changes view **updates live** as you type in the right panel, so you always see the impact of your edits compared to the original.

### Right Panel — Editable Version

This panel contains the actual text you will save. It is pre-populated with the AI's merged output and is fully editable.

Make any changes you want here: fix wording, restore sections the AI dropped, remove anything the AI included that you disagree with. The left panel updates in real time to reflect your changes as tracked differences from the original.

---

## Saving the Merge

Once you are satisfied with the content in the right (editable) panel:

1. Click **Save Merge**.
2. The system does two things simultaneously:
   - Updates the live knowledge object in Weaviate with your edited merged content
   - Marks the submission as **Accepted** and closes it

The submission moves to the closed state, and the knowledge object in the live knowledge base now reflects your merged version.

---

## Discarding the Merge

If you start a merge and decide you do not want to use the AI's result:

1. Click **Discard**.
2. The Merge Editor closes and the review page returns to the normal side-by-side comparison view.
3. The submission is unchanged — it remains Pending, and you can Accept, Reject, or Defer it normally.

Discarding does not make any changes to the knowledge base or the submission status.

---

## What Claude Sees During a Merge

When you click "Merge with AI," the system sends Claude:
- The full content of the **current live version** of the knowledge object
- The full content of the **proposed update** from the submission
- Instructions to combine them intelligently: preserve structure, resolve conflicts, prefer newer facts while retaining valuable existing context

Claude does not have access to any other information about the object or the submitter. The merge is purely content-to-content.

---

## Common Pitfalls

**The "Merge with AI" button is grayed out or not appearing.** AI Merge is only available for Update submissions (not New submissions). If you are on a New submission review page, the button will not appear. Also confirm you are in Admin mode — Contributors do not have access to merge.

**The AI merged result is not streaming — the panel stays blank.** This usually indicates a connectivity issue with the Claude API. Try refreshing the page and starting the merge again. If the problem persists, check that the `ANTHROPIC_API_KEY` environment variable is configured correctly on the server.

**The AI dropped some important content from the original.** This can happen when Claude judges a section as superseded by the proposed update. Edit the right panel to restore the missing content. The tracked changes view will reflect the restoration in real time.

**The AI included content from the proposed update that I want to remove.** Simply delete or rewrite that section in the right (editable) panel. The left panel will show it as a removal (red strikethrough) once you do.

**I saved the merge and want to undo it.** There is no built-in undo. The previous content is no longer stored in the system. You would need to re-open the knowledge object's edit page and manually restore the content you want.

**The tracked changes highlighting looks wrong after I made significant edits.** The tracked changes view computes character-level diffs in real time between your editable content and the original live version. Heavy structural edits can produce visually noisy diffs. This is normal — the underlying content in the editable panel is what gets saved, regardless of how the diff looks.
