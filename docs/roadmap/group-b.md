> Back to [Roadmap Index](./README.md)

# Group B — Write Layer — **Done**

**B1 — Create API** — **Done**
`POST /api/knowledge` route. Accepts type, name, content, tags, and type-specific fields. Writes to the correct Weaviate collection. Enforces name uniqueness within collection (returns 409 on conflict).

**B2 — Update API** — **Done**
`PUT /api/knowledge/[id]` route. Accepts any writable fields. Updates the Weaviate object and sets `updatedAt`.

**B3 — Delete API** — **Done**
`DELETE /api/knowledge/[id]` route. Checks `GeneratedContent` references and returns a warning count. Deletes on `?confirm=true` or zero references.

**B4 — Create/Edit forms** — **Done**
Adaptive form component (`knowledge-form.tsx`) with type-specific fields, markdown preview, and validation. Create page at `/knowledge/new`, edit page at `/knowledge/[id]/edit`.

**B5 — Deprecation** — **Done**
Added `deprecated: boolean` field to all 5 knowledge collections via migration script. `PATCH /api/knowledge/[id]` supports deprecate/restore actions. Detail page shows deprecated banner and action buttons (Edit/Delete/Deprecate). Deprecated objects display a "Deprecated" badge in the list view.
