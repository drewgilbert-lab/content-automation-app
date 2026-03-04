> Back to [Roadmap Index](./README.md)

# Group F — AI Merge Workflow — **Done**

**F1 — Merge API** — **Done**
`POST /api/submissions/[id]/merge` streams an AI-merged document. Fetches the current live version of the target object and the proposed content from the submission. Sends both to Claude with a merge system prompt via `lib/merge.ts`. Returns a streaming text response. `POST /api/submissions/[id]/merge/save` accepts the reviewer-edited merged content, updates the target knowledge object, and closes the submission as accepted.

**F2 — Tracked-changes diff** — **Done**
Character-level diff computed client-side via `diff-match-patch`. Added text in green, removed text as red strikethrough, unchanged text as normal. Two-panel layout: read-only tracked-changes view (left) and editable textarea (right). Diff recalculates live as the reviewer edits.

**F3 — Merge review UI** — **Done**
"Merge with AI" button on the Queue review panel (E4) for update submissions. Calls F1, renders the tracked-changes diff (F2) in a full-width editor. Actions: "Save" (commits the merged result to Weaviate and closes the queue item) or "Discard" (returns to the side-by-side review panel).
