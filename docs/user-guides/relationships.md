# Managing Relationships Between Knowledge Objects

> Last updated: February 2026

---

## Overview

Relationships connect knowledge objects to each other, creating a web of context that the system can traverse. For example, a Persona can be linked to the Segments it appears in and the Use Cases most relevant to it. These connections improve the accuracy of content generation by letting the AI understand how pieces of company knowledge relate.

This guide explains what relationships exist, how to add and remove them, and what to expect from bidirectional sync.

---

## What Relationships Exist

The knowledge base supports the following cross-reference types:

| From | Relationship | To |
|---|---|---|
| Persona | hasSegments | Segment(s) |
| Persona | hasUseCases | UseCase(s) |
| Segment | hasPersonas | Persona(s) |
| Segment | hasUseCases | UseCase(s) |
| ICP | persona | Persona (single) |
| ICP | segment | Segment (single) |

Note that Persona↔Segment links are bidirectional — adding a Segment to a Persona automatically adds that Persona back to the Segment, and vice versa. Use Cases and Business Rules do not have outbound cross-references of their own, but they appear in the relationship panels of the Personas and Segments that reference them.

---

## The Manage Relationships Panel

The Manage Relationships panel appears at the bottom of every knowledge object detail page. It has two sections:

1. **Current Relationships** — lists all objects this item is currently linked to, grouped by relationship type (e.g. "Segments," "Use Cases"). Each linked object shows a Remove button.

2. **Add a Relationship** — a search/select dropdown that lets you find and link other objects.

The panel is visible on every detail page, including Use Cases and Business Rules. Objects that do not have outbound cross-reference types (like Use Cases) will show their inbound references — the Personas or Segments that link to them.

---

## Adding a Relationship

1. Open the detail page for the object you want to link from.
2. Scroll down to the **Manage Relationships** panel.
3. In the "Add a Relationship" section, select the **relationship type** from the dropdown (e.g. "Segments" or "Use Cases").
4. In the search field, type part of the target object's name. A dropdown list of matching objects appears.
5. Select the object you want to link.
6. Click **Add**.

The new relationship appears immediately in the Current Relationships list. No page reload is required.

### ICP Relationships (Single-Value)

ICPs have a single Persona and a single Segment — not arrays. When you add a relationship to an ICP, it replaces the existing link rather than appending to it. Make sure you are selecting the correct object, because any existing link to that type will be removed.

---

## Removing a Relationship

1. Open the detail page for the object whose relationship you want to remove.
2. Find the linked object in the **Current Relationships** section.
3. Click the **Remove** button next to it.

The relationship is removed immediately. If the relationship is bidirectional (e.g. Persona↔Segment), the reverse link is also removed automatically.

---

## Bidirectional Sync

Persona↔Segment relationships are automatically kept in sync in both directions:

- Adding a Segment to a Persona also adds that Persona to the Segment's `hasPersonas` list.
- Removing a Segment from a Persona also removes that Persona from the Segment's `hasPersonas` list.

You do not need to manually update both sides. The API handles the sync for you.

This does not apply to Persona→UseCase or Segment→UseCase links — those are directional only.

---

## Why Relationships Matter

The Health Dashboard monitors your knowledge base for relationship gaps. If objects are missing expected connections, they are flagged in the gap report. Common gap categories include:

- **Zero relationships** — a Persona or Segment with no linked objects at all
- **Partial relationships** — a Persona with Segments but no Use Cases, or vice versa
- **ICP missing persona or segment** — an ICP that has not been fully connected
- **BusinessRule missing subType** — a business rule where the sub-type was not specified

Filling in these gaps ensures the content generation system has enough context to do its job well. See the [Health Dashboard](./health-dashboard.md) guide for how to find and act on these warnings.

---

## Common Pitfalls

**I added a relationship but it does not appear.** Try refreshing the page. Relationship additions are optimistic (they show immediately), but a network error could cause the state to revert without an obvious error message.

**I removed a relationship from one object, but it still shows on the other side.** Bidirectional sync applies to Persona↔Segment only. If you removed a Persona→UseCase link, the UseCase does not automatically remove the Persona from its inbound references list. You can remove it manually from the UseCase's detail page if needed.

**The Add dropdown shows no results.** Make sure you have selected the correct relationship type first, and that objects of that type exist in the system. If the dropdown is empty for a type, there are no objects of that kind in the knowledge base yet — create them first.

**I'm on a Use Case or Business Rule detail page and don't see an Add option.** Use Cases and Business Rules do not have outbound relationship configs. The panel will still show their inbound references (who links to them), but the add flow for those types is initiated from the Persona or Segment side.
