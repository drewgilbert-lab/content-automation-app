# Creating and Managing Knowledge Objects

> Last updated: February 2026

---

## Overview

This guide covers how to create new knowledge objects, edit existing ones, deprecate objects that are no longer active, and permanently delete objects when needed. Admins can perform all of these actions directly. Contributors go through the Review Queue — their create and edit submissions are staged for Admin review before going live.

---

## Creating a New Object

### Admin Flow

1. Navigate to `/knowledge` (the Knowledge Base list page).
2. Click **+ New Object** in the top-right corner.
3. On the create form page, select the **Object Type** from the dropdown. The form fields update dynamically based on the type you select.
4. Fill in all required fields (see Field Reference below).
5. Click **Create Object** to save directly to the knowledge base.

The new object appears immediately in the list.

### Contributor Flow

1. Navigate to `/knowledge` and click **+ New Object**.
2. Select the object type and fill in all fields.
3. Click **Submit for Review** instead of saving directly.
4. Your submission enters the Review Queue with status "Pending." An Admin will review it and either accept, reject, or defer it.

---

## Editing an Existing Object

### Admin Flow

1. Open the detail page for the object you want to edit.
2. Click the **Edit** button in the top-right action area.
3. The edit form is pre-populated with the current values.
4. Make your changes and click **Save Changes**.

The update is applied immediately to the live knowledge base.

### Contributor Flow

1. Open the detail page and click the **Edit** button.
2. The edit form opens with current values pre-filled.
3. Make your changes and click **Submit for Review**.
4. The current live version is unchanged. Your proposed update enters the Review Queue as an "Update" submission.

---

## Form Field Reference

Fields vary by object type. Here is a breakdown of what each type requires:

### All Types
| Field | Required | Description |
|---|---|---|
| Name | Yes | A unique, descriptive name for the object. The system enforces name uniqueness — you cannot create two objects with the same name within the same type. |
| Content | Yes | The full markdown body of the object. This is what gets injected into the AI's context during content generation. Write it clearly and thoroughly — the richer the content, the better the AI's output. |
| Tags | No | Comma-separated labels for categorization and filtering. |

### Segment (additional fields)
| Field | Required | Description |
|---|---|---|
| Revenue Range | No | The revenue band this segment covers (e.g. "$1B–$10B"). |
| Employee Range | No | The employee count range for this segment (e.g. "1,000–10,000"). |

### Business Rule (additional fields)
| Field | Required | Description |
|---|---|---|
| Sub-Type | Yes | One of: **tone** (brand voice guidelines), **constraint** (what not to say or do), or **instruction_template** (step-by-step instructions for a specific content type — these are being migrated to Skills). |

### Competitor (additional fields)
| Field | Required | Description |
|---|---|---|
| Website | No | The competitor's website URL (e.g. "https://acme.com"). Used for reference; not injected into AI context. |

### Customer Evidence (additional fields)
| Field | Required | Description |
|---|---|---|
| Sub-Type | Yes | One of: **proof_point** (a quantified customer outcome, e.g. "reduced churn by 30%") or **reference** (a named customer or quote). The system flags Customer Evidence objects that are missing this field as a data gap in the Health Dashboard. |
| Customer Name | No | The name of the customer this evidence relates to. Used to attribute quotes or outcomes to a specific account. |
| Industry | No | The customer's industry vertical (e.g. "Financial Services", "Healthcare"). Helps the AI select contextually relevant evidence. |

### Content Tips

The `content` field accepts full markdown. Use headings, bullet points, and bold text to structure the content clearly. The AI reads this field verbatim, so well-structured, specific content leads to better generation output.

For example, a Persona's content field might include sections like:
- Role & Responsibilities
- Primary Goals
- Pain Points
- How They Communicate
- Common Objections

---

## Deprecating an Object

Deprecation is a soft-delete. The object remains in the system and is still browsable, but it is excluded from AI content generation. Use deprecation when a piece of knowledge is outdated or no longer applicable — rather than deleting it and losing the history.

1. Open the detail page for the object.
2. Click the **Deprecate** button (Admins only).
3. The object is immediately marked as deprecated. A red banner appears at the top of its detail page, and a "Deprecated" badge appears in the list.

### Restoring a Deprecated Object

1. Open the detail page for a deprecated object.
2. The action button now reads **Restore**.
3. Click **Restore** to make the object active again. It will be included in content generation from that point forward.

---

## Deleting an Object

Deletion permanently removes the object from the knowledge base. This cannot be undone. Use deletion only when you are certain the object is no longer needed.

1. Open the detail page.
2. Click the **Delete** button.
3. A confirmation dialog appears. Read it carefully.

### Delete Guard: Content References

The system checks whether any generated content in the system references this object before deleting. If other objects depend on it, the delete dialog will warn you. Proceeding removes the object and those references — the generated content that used it will lose the link.

If you are unsure, deprecate the object instead of deleting it.

---

## Common Pitfalls

**I got a "name already exists" error.** Object names must be unique within the same type. Check whether an object with that name already exists (even if it is deprecated). If the old one is deprecated and you want to replace it, restore and edit it, or choose a different name for the new object.

**The form saved but I don't see the object in the list.** If you are a Contributor, your submission went to the Review Queue, not the live list. Check `/queue` to see its status.

**I edited an object but the old content is still showing.** If you are a Contributor, your edit is pending review. The live object has not changed yet — only the approved version will appear in the knowledge base.

**The Deprecate button is grayed out or missing.** Only Admins can deprecate objects. Switch to Admin mode using the role toggle or ask an Admin to deprecate it on your behalf.

**I accidentally deleted an object.** Deletion is permanent and cannot be undone through the UI. Contact a developer to restore from a Weaviate backup if needed.

**The content field looks like raw text with markdown symbols.** The list and edit form show raw markdown. The rendered preview is visible on the detail page and in the create/edit form's preview tab (if available).
