# Using the Health Dashboard

> Last updated: February 2026

---

## Overview

The Health Dashboard gives you a real-time snapshot of the quality and completeness of your knowledge base. It surfaces three types of issues: structural gaps (missing relationships), staleness (content that hasn't been updated in a long time), and outstanding review queue items. Use it as a regular maintenance tool to keep the knowledge base in good shape for content generation.

Navigate to `/dashboard` to open the Health Dashboard.

---

## Stat Cards

At the top of the dashboard, a row of stat cards shows the total count of objects per knowledge type:

- **Personas** — number of persona objects
- **Segments** — number of account segment objects
- **Use Cases** — number of use case objects
- **ICPs** — number of ICP objects
- **Business Rules** — number of business rule objects

Each card has a color indicator that changes based on whether the count is in a healthy, warning, or critical state. A card that appears in amber or red indicates that this type has fewer objects than expected, or has objects with problems that need attention.

These counts only reflect active (non-deprecated) objects. Deprecated objects are excluded.

---

## Gap Report

Below the stat cards, the Gap Report lists knowledge objects that are missing expected relationships or properties. Gaps are grouped into categories. Click any category header to expand or collapse it.

### Gap Categories

**Zero Relationships**
Objects that have no cross-references at all. A Persona with no linked Segments or Use Cases, or a Segment with no linked Personas or Use Cases, is not providing much context value during generation.

**Partial Relationships — Missing Segments**
Personas that have at least one Use Case linked but no Segments. This means content generation using this persona has no firmographic context to work with.

**Partial Relationships — Missing Use Cases**
Personas or Segments that have account context but no linked use cases. The AI will not know which business problems to address when generating content for this audience.

**ICP Missing Persona**
An ICP definition that has not been linked to a Persona. ICPs without both a Persona and a Segment are incomplete and cannot be used effectively in generation.

**ICP Missing Segment**
An ICP definition that has not been linked to a Segment.

**BusinessRule Missing SubType**
A business rule that does not have a sub-type set (tone, constraint, or instruction_template). Sub-types control how the rule is categorized and applied — business rules without one may behave unexpectedly.

### Acting on Gaps

Each row in the gap report shows the object's name, type badge, and a **Fix** link. Clicking Fix navigates directly to that object's detail page where you can add the missing relationships or update the missing property.

Work through gap categories from highest to lowest severity. "Zero Relationships" is the most impactful — those objects are contributing nothing to context assembly until they are connected.

---

## Staleness Report

The Staleness Report section lists knowledge objects that have not been updated in 90 or more days, as well as objects that have never been reviewed since they were first created.

### Badges

- **Never Reviewed** (amber) — the object's `createdAt` and `updatedAt` timestamps are identical, meaning it has never been opened and saved since the initial import. The content could be correct, but it has never been verified.
- **Stale** (red) — the object was reviewed at some point but has not been updated in 90+ days. Company strategy, personas, and use cases evolve; stale objects may no longer reflect reality.

The list is sorted with the most severely stale objects first. Each row shows the object's name, type badge, and staleness badge. Click the object name to open its detail page.

### What To Do with Stale Objects

Open the object and read the content. If it is still accurate, simply open the edit form, make a minor formatting or wording touch-up if needed, and save. This updates the `updatedAt` timestamp and removes it from the staleness report. If the content needs a real update, make the changes and save.

If the content is clearly outdated, either update it or deprecate it.

---

## Review Queue Count

The bottom section of the dashboard shows the number of pending submissions in the Review Queue. If there are pending items, a link navigates directly to the queue. This is a quick way for Admins to see whether there is a backlog of proposed changes waiting for review.

See the [Review Queue](./review-queue.md) guide for full details on how to process submissions.

---

## Common Pitfalls

**The dashboard shows zero objects but I can see objects in the Knowledge Base.** The dashboard excludes deprecated objects from counts. If all objects have been deprecated, the counts will show zero. Also try refreshing the page — the dashboard data is fetched fresh on each load.

**A gap shows up even though I already added the relationship.** Try refreshing the dashboard. The gap data is computed at load time from the current state of Weaviate. If you just made the change and navigate back, it should be resolved.

**An object was stale but I saved a minor edit and it still shows as stale.** The staleness threshold is 90 days from the current date. Once you save, the `updatedAt` timestamp resets and the object should drop off the list on the next dashboard load.

**The Review Queue count shows pending items but I don't see them in the queue.** Confirm you are in Admin mode — only Admins can see and act on queue items. Also check whether the "Show Closed" toggle in the queue is filtering out items you expect to see.
