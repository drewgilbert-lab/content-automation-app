# Browsing and Searching the Knowledge Base

> Last updated: February 2026

---

## Overview

The Knowledge Base is the central library of your company's strategic knowledge. It contains every persona, account segment, use case, ICP, business rule, skill, competitor, and customer evidence object that the Content Engine uses to generate content. This guide covers how to navigate the list, filter by type, search for specific objects, and read a knowledge object's full detail page.

---

## The Knowledge Base List Page

Navigate to `/knowledge` to open the list page. You will see all knowledge objects grouped and sortable by type.

### Filtering by Type

At the top of the list, there are tab filters:

- **All** — shows every object regardless of type
- **Persona** — shows only persona objects
- **Segment** — shows only account segment objects
- **Use Case** — shows only use case objects
- **ICP** — shows only ICP objects
- **Business Rule** — shows only business rule objects
- **Competitor** — shows only competitor objects
- **Customer Evidence** — shows only customer evidence objects (proof points and references)

Click any tab to narrow the view. The selected tab highlights to indicate the active filter.

### Searching

A search box above the list lets you filter by object name as you type. The search is applied on top of whichever type tab is active, so you can filter to "Use Case" and then search for "lead" to find use cases with "lead" in their name. The search is case-insensitive.

### Reading the List

Each row in the list shows:
- The object's **name**
- A **type badge** with a color-coded label (e.g. Persona, Segment)
- A **deprecated** badge if the object has been soft-deleted — deprecated objects are visually distinct and excluded from content generation

### Creating a New Object

If you are an Admin, there is a **+ New Object** button in the top-right of the list page. Clicking it opens the create form. See the [Managing Knowledge](./managing-knowledge.md) guide for the full creation workflow.

---

## The Knowledge Object Detail Page

Clicking any object in the list takes you to its detail page at `/knowledge/[id]`. This is the full view of a single knowledge object.

### Main Content Area

The left panel displays the object's `content` field rendered as formatted markdown. This is the full text of the knowledge object — everything the AI reads when this object is used as context. You will see headings, bullet points, bold text, and any other markdown formatting the content contains.

### Sidebar

The right sidebar shows metadata about the object:

- **Type** — the knowledge type (Persona, Segment, etc.)
- **Tags** — any labels attached to the object
- **Created** — when the object was first added to the system
- **Last Updated** — when the object was most recently modified
- **Sub-type** — shown for Business Rules (tone, constraint, or instruction_template) and Customer Evidence (proof_point or reference)
- **Revenue Range / Employee Range** — shown for Segments only
- **Website** — shown for Competitors only
- **Customer Name / Industry** — shown for Customer Evidence only

### Related Objects Panel

Below the main content and sidebar, you will see the **Relationships** panel listing all cross-references: other knowledge objects this object is linked to. For example, a Persona might show which Segments and Use Cases it is connected to.

Clicking any linked object navigates to its detail page. See the [Relationships](./relationships.md) guide for how to add or remove these links.

### Action Buttons (Admin Only)

If you are an Admin, the detail page shows action buttons:
- **Edit** — opens the edit form for this object
- **Delete** — permanently removes the object (with a confirmation step)
- **Deprecate / Restore** — toggles the object's deprecated status

These buttons are not visible to Contributors.

---

## Deprecated Objects

Deprecated objects are visible in the knowledge base but marked with a red "Deprecated" banner at the top of their detail page. They are also visually flagged in the list. Deprecated objects are:

- Still browsable and readable
- Excluded from AI content generation
- Restorable by an Admin at any time

If you see content that is outdated or no longer accurate, ask an Admin to deprecate it rather than deleting it. Deprecation is reversible; deletion is not.

---

## Common Pitfalls

**The search is not finding what I expect.** The search filters by object name only, not by the full text content. If you are looking for a topic that appears inside the content body, you will need to browse by type and read detail pages.

**A knowledge object shows a "Never Reviewed" warning in the Dashboard but looks fine to me.** "Never Reviewed" means the object has never been edited since it was first created (its creation and last-updated timestamps are the same). It does not necessarily mean the content is wrong — it just signals that no one has opened and saved it since the initial seed. Visit the Dashboard for a full list of objects in this state.

**I cannot see the + New Object button.** This button is only visible to Admins. If you are in Contributor mode, switch to Admin mode using the role toggle in the header, or ask an Admin to create the object.

**Cross-references show no linked objects.** Some objects may not have relationships set up yet. This is a data gap — the Dashboard's gap report flags objects that are missing expected relationships. See the [Relationships](./relationships.md) guide to add them.
