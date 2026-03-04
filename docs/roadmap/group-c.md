> Back to [Roadmap Index](./README.md)

# Group C — Relationship Layer — **Done**

**C1 — Relationship write API** — **Done**
Build `POST /api/knowledge/[id]/relationships` and `DELETE /api/knowledge/[id]/relationships` routes. Accept `targetId` and `relationshipType`. Write Weaviate cross-references directly.

**C2 — Manage Relationships panel** — **Done**
On every object detail page, add a "Manage Relationships" panel (separate from the content editor). Shows current cross-references grouped by type. Search/select to add new cross-references from compatible collections. Remove button on each existing reference. Saves immediately via C1.
