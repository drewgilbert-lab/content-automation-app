> Back to [Roadmap Index](./README.md)

# Group A — Read Layer (foundation for everything else) — **Done**

**A1 — Weaviate list API** — **Done**
Build `GET /api/knowledge` route that returns all objects across all collections (Persona, Segment, UseCase, BusinessRule, ICP). Supports optional `type` query param to filter by collection. Returns: `id`, `name`, `type`, `tags`, `createdAt`, `updatedAt`.

**A2 — Weaviate detail API** — **Done**
Build `GET /api/knowledge/[id]` route that returns a single object by Weaviate UUID. Returns all fields including full `content`, cross-reference IDs and names, and `subType` for BusinessRule objects.

**A3 — Knowledge Base list page** — **Done**
Render all objects grouped by type. Each row shows name, type badge, tags, and `updatedAt`. Includes type filter tabs (All / Personas / Segments / Use Cases / Business Rules / ICPs) and a name/tag search field.

**A4 — Knowledge Base detail page** — **Done**
Render a single object at `/knowledge/[id]`. Full `content` rendered as formatted markdown. Metadata sidebar: type, subType (if applicable), tags, `createdAt`, `updatedAt`. Cross-references listed with clickable links to their own detail pages.
