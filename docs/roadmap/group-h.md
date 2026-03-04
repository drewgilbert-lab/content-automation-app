> Back to [Roadmap Index](./README.md)

# Group H — Enhanced Change Review Workflows — **Done**

> Scope: Two improvements to the review queue: (1) upload a document to supplement an existing knowledge object via AI merge, and (2) visual diff highlighting for all manual edits.
> Dependencies: Groups E–F (review queue, AI merge). G1 document parser (shared).

## Workflow H-a: Add Document to Existing Object

A user uploads a new document (research report, updated spec, etc.) to add information to an existing knowledge object. The system uses Claude to produce a merged version incorporating the new document's information, then routes it to the review queue with tracked changes.

**H1 — Document Upload for Existing Objects** — **Done**
Build `/knowledge/[id]/add-document` page. File upload form accepts a single document (same formats as G1). On upload, the system parses the document via `lib/document-parser.ts`, then creates a submission with a new `submissionType: "document_add"`. The submission's `proposedContent` stores the raw extracted document text. The `targetObjectId` points to the existing knowledge object. Add a "Add Document" button to the knowledge detail page action bar (visible to Contributors).

**H2 — Document Addition Merge Prompt** — **Done**
Extend `lib/merge.ts` with a new `buildDocumentAdditionPrompt()` function. The prompt framing differs from the existing update merge: instead of "resolve differences between two versions," it instructs Claude to "incorporate the new document's information into the existing knowledge object while preserving the existing structure and removing redundancies." The existing object content is provided as the base; the uploaded document is provided as supplementary material to integrate.

**H3 — Review Queue Integration for Document Additions** — **Done**
When an admin opens a `document_add` submission in the review queue, the UI offers a "Merge Document" button (similar to the existing "Merge with AI" for updates). Clicking it calls `POST /api/submissions/[id]/merge` (which detects the `document_add` type and uses H2's prompt). The admin sees the existing content vs. the AI-merged result with tracked changes via the existing `MergeEditor` component. The admin can edit the merged version before saving. Alternatively, the admin can view the raw uploaded document alongside the current content for manual comparison.

## Workflow H-b: Visual Diff for Manual Edits

Currently, `ContentDiff` (`app/queue/components/content-diff.tsx`) shows a side-by-side comparison of current vs. proposed content without diff highlighting. This needs to match the quality of the `MergeEditor`'s tracked-changes view.

**H4 — Visual Diff Component** — **Done**
Build a reusable `VisualDiff` component at `app/queue/components/visual-diff.tsx`. Uses the existing `diff-match-patch` library (already installed) with `diff_cleanupSemantic()` for word-level granularity. Supports two display modes:
- **Unified view** (default): single panel showing inline changes — additions in green highlight, deletions in red with strikethrough, unchanged text rendered normally. Collapsible unchanged sections for long documents.
- **Side-by-side view**: two synchronized-scroll panels — left shows original with deletions highlighted, right shows modified with additions highlighted.

Extract the existing diff rendering logic from `MergeEditor` into this shared component so both `MergeEditor` and `ContentDiff` use the same rendering.

**H5 — ContentDiff Upgrade** — **Done**
Replace the current static side-by-side comparison in `content-diff.tsx` with the new `VisualDiff` component. Add a toggle to switch between unified and side-by-side views. Keep the metadata comparison (name, tags, type changes) as a separate section above the content diff. The content diff uses `VisualDiff` to show exactly what text was added, removed, or unchanged.

**Existing code to leverage:**
- `diff-match-patch` (v1.0.5) and `diff` (v8.0.3) are already installed
- `MergeEditor` already implements tracked-changes rendering — the green/red highlighting pattern can be extracted into the shared `VisualDiff` component
- `ContentDiff` at `app/queue/components/content-diff.tsx` provides the current side-by-side layout structure

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Large document diffs (50K+ chars) become unreadable | Overwhelming diff output | Collapse unchanged sections by default; virtual scrolling for very long diffs; paginate changes |
| AI merge quality for document additions | Claude may incorrectly integrate new information or lose nuance | Admin can always edit before accepting; track post-merge edit frequency as a quality signal |
| Concurrent edits to the same object | Multiple pending submissions for one object create conflicts | Detect and warn when multiple pending submissions target the same `targetObjectId`; consider object-level locking during active review |
| Markdown formatting changes create noisy diffs | Reformatting (e.g. line wrapping) appears as content changes | Diff operates on raw markdown source; optionally normalize whitespace before diff; show rendered preview alongside |
| Green/red diff colors are not colorblind-accessible | Some users cannot distinguish changes | Use patterns (underline for additions, strikethrough for deletions) in addition to color; support high-contrast mode |
| No version history for knowledge objects | Cannot view or restore previous versions after accepting a merge | Note as a dependency on the deferred "Event Logging & Audit Trails" section; consider lightweight version snapshots |
| `document_add` is a new submission type | Existing code assumes only "new" or "update" | Ensure all submission list/filter/review code handles the new type gracefully; add to filter options in queue UI |
