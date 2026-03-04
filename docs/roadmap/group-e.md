> Back to [Roadmap Index](./README.md)

# Group E — Review Queue — **Done**

**E1 — Submission API** — **Done**
Build `POST /api/submissions` route. Accepts: `objectType`, `proposedContent`, optional `targetObjectId` (if updating an existing object), submitter identifier. Stores the submission as a pending record (not yet written to Weaviate). Returns submission ID and status `pending`.

**E2 — Queue list API** — **Done**
Build `GET /api/submissions` route. Returns all pending submissions with: submitter, object name, object type, submission type (new / update / relationship change), submitted date. Supports filter by submission type.

**E3 — Queue review API** — **Done**
Build `POST /api/submissions/[id]/review` route. Accepts action: `accept`, `reject` (requires comment), `defer` (optional note). Accept writes to Weaviate and closes the submission. Reject records the comment and closes. Defer leaves it open with a note.

**E4 — Queue UI** — **Done**
Render the review queue at `/queue`. List of pending items with filter by type. Clicking an item opens:
- For new object submissions: full content preview, Accept / Reject / Defer actions
- For update submissions: side-by-side diff (current vs. proposed), Accept / Trigger AI Merge / Reject actions

**E5 — Connector/User submission flow** — **Done**
When a Connector or User saves a create or edit form, route the save through E1 (submission) instead of directly to Weaviate. Show a "Pending review" status on the submitted object. User and Connector cannot directly write to the live knowledge base.
