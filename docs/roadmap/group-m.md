> Back to [Roadmap Index](./README.md)

# Group M — Knowledge-Linked Skills — **Done**

> Scope: Allow skills to declare which knowledge objects they depend on. When a knowledge object is updated and accepted, the system evaluates whether the change is significant enough to generate a skill refresh suggestion. If significant, a system-generated submission enters the review queue for admin review using the same AI merge infrastructure as Groups E–F.
> Dependencies: Group I (Skills Module), Groups E–F (Review Queue, AI Merge).

## Core Concept

Skills often derive their instructions from specific knowledge objects — a persona's language, a segment's firmographic context, a use case's business drivers. When those facts change, skill instructions become stale without a visible signal. Group M introduces a formal link between skills and the knowledge objects they reference, with an automated refresh workflow that routes through the existing review queue.

Each skill-to-object link carries its own **integration prompt** — a short instruction that defines *how* that specific object's content should be incorporated into the skill. Example: a skill linked to the Sales persona carries an integration prompt like *"Update references to job titles, pain points, and language patterns to reflect any changes in the linked persona."* This integration prompt is passed to Claude during the refresh cycle alongside the current skill content and the updated knowledge object. A skill may link to multiple knowledge objects across different collections.

The refresh evaluation is **lazy**: no AI merge runs until an admin clicks "Merge with AI" in the queue. This is consistent with how the existing merge infrastructure works and avoids wasted Claude calls on unreviewed suggestions.

## The Refresh Flow

```
Admin accepts an update to a knowledge object
        │
        ▼
System checks: any active, non-deprecated skills
with this object ID in sourceKnowledgeObjects?
        │
        ├── None → done
        │
        └── Yes → for each linked skill:
                    Run materiality evaluation
                    (Is this change significant enough
                     to warrant a skill update suggestion?)
                           │
                    Not significant → skip, log reason
                    Significant →
                      createSubmission({
                        objectType: "skill",
                        submissionType: "update",
                        targetObjectId: skill UUID,
                        sourceChannel: "system",
                        sourceDescription: "Auto-generated: [Object] updated",
                        proposedContent: {
                          content: updated object content,
                          linkedObjectId, linkedObjectName,
                          integrationPrompt
                        }
                      })
                           │
                           ▼
                    Admin reviews at /queue
                    Merge with AI → buildSkillRefreshPrompt
                    Accept / Reject / Defer
                           │
                           ▼
                    Live skill updated in Weaviate
```

## Items

**M1 — `sourceKnowledgeObjects` Field on Skill Collection** — ✅ Done (2026-03-23)
Add a `sourceKnowledgeObjects` text field to the `Skill` Weaviate collection. Stores a JSON array of link objects: `{ "id": string, "collection": string, "integrationPrompt": string }`. Multiple links supported — a skill may reference objects from different collections (e.g. both a Persona and a UseCase). Add a `SkillKnowledgeLink` type to `lib/skill-types.ts`. Update `SkillDetail` and `SkillUpdateInput`. Update `lib/skills.ts` to read/write the field. Migration script to add the field to the existing Skill collection with a `null` default.

**M2 — Skill UI for Managing Knowledge Links** — ✅ Done (2026-03-23)
Extend skill detail and edit pages.

- `/skills/[id]` detail: add a "Linked Knowledge Objects" section showing each linked object (name, type badge, link to detail page) and its integration prompt.
- `/skills/[id]/edit`: add a dynamic link management panel — search/select knowledge objects to link, write or edit the integration prompt for each link, remove links. Prompt field: textarea with placeholder examples. Integration prompt is required before a link can be saved.

**M3 — `buildSkillRefreshPrompt` in `lib/merge.ts`** — ✅ Done (2026-03-23)
Add a third prompt function alongside `buildMergePrompt` and `buildDocumentAdditionPrompt`. Accepts `currentSkillContent`, `updatedObjectContent`, and `integrationPrompt`. System prompt instructs Claude to preserve all procedural structure, steps, and methodology in the skill — only updating references to facts, attributes, or language patterns that appear in the updated knowledge object. The `integrationPrompt` focuses Claude on which aspects to update. Returns only the updated skill content with no commentary.

**M4 — Materiality Evaluation** — ✅ Done (2026-03-23)
Before creating a skill refresh submission, run a lightweight Claude call to evaluate whether the knowledge object change is significant enough to warrant a skill update suggestion.

Input: diff between old and new knowledge object content, the skill's current content, and the integration prompt. Output: `{ significant: boolean, reason: string }`. If `significant: false`, skip submission creation and log the reason. A change is significant if it alters facts, attributes, or context that the integration prompt indicates the skill depends on.

Implemented as `evaluateSkillRefreshSignificance()` in `lib/skills.ts`. Called after `updateKnowledgeObject()` in the merge/save and review/accept routes as a **fire-and-forget** async call — it does not block the acceptance response. The old object content must be fetched before the update is applied, requiring a minor adjustment to the acceptance paths.

**M5 — System-Generated Skill Refresh Submissions** — ✅ Done (2026-03-23)
Extend `createSubmission()` and the `Submission` collection to support `objectType: "skill"` and `sourceChannel: "system"`. `proposedContent` for skill refresh submissions stores the updated knowledge object content (not a pre-generated skill update) plus `linkedObjectId`, `linkedObjectName`, and `integrationPrompt`. The lazy design means Claude only runs the refresh when the admin triggers "Merge with AI" in the queue.

**M6 — Review Queue Support for Skill Submissions** — ✅ Done (2026-03-23)
Extend the queue UI and API to handle `objectType: "skill"` submissions.

- Queue list: skill submissions display with a "Skill" type badge. `sourceChannel: "system"` submissions display a distinct "System" source badge so admins can distinguish auto-generated suggestions from human submissions.
- Queue detail: fetch the current skill via `lib/skills.ts`. Show the skill's current instruction content alongside the updated knowledge object that triggered the refresh and the integration prompt.
- "Merge with AI" uses `buildSkillRefreshPrompt` with the integration prompt from `proposedContent`.
- Accept (direct or post-merge): calls `updateSkill()` from `lib/skills.ts` to write the new skill content.
- Health Dashboard: add a count of pending system-generated skill submissions so stale suggestions don't accumulate silently.

**M7 — Bootstrapping: Suggested Links via Semantic Similarity** — ✅ Done (2026-03-23)
Add a "Suggest Links" action to each skill's detail page. Runs a Weaviate `nearText` search using the skill's content against all active knowledge object collections. Returns top N results ranked by cosine similarity with scores displayed. Admin can accept (opens link editor pre-populated with the matched object, prompting them to write the integration prompt) or dismiss each suggestion. This addresses the bootstrapping problem: existing skills have no `sourceKnowledgeObjects` data and would require a full manual audit without this tool.

## Risks and Gaps

| Risk | Impact | Mitigation |
|---|---|---|
| Materiality eval adds latency to acceptance | Admin experiences delay after approving | Fire-and-forget after response; admin sees no blocking wait |
| Multiple linked objects both update the same day | Second submission built on stale skill version | Before creating a refresh submission, check for existing pending skill refresh submissions targeting the same skill; block or append |
| Linked object is deprecated | Skill has orphaned reference | On deprecation, flag linked skills with a staleness indicator in the UI; admin decides whether to remove the link or deprecate the skill |
| Integration prompt is vague | AI refresh produces low-quality suggestions | Require non-empty integration prompt before saving a link; provide example templates in the UI |
| Admin ignores system-generated queue items | Stale skill suggestions accumulate | Surface pending system-generated skill submission count on the Health Dashboard |
| Old object content unavailable for diff | Can't compute materiality without it | Fetch object before updating in acceptance routes; minor change to existing paths |
| Skill refresh accepted changes generation behavior unexpectedly | Content quality shifts without warning | Skill versioning (`version`, `previousVersionId`) already implemented — provides a one-click rollback path |

---

## Future Potential Directions

The following extend Group M and are tracked here for future consideration. None are in scope for Phase 1.

**Bi-directional Influence — Skills Flagging Knowledge Objects**
Skill edits could flag linked knowledge objects as potentially stale. If a writer refines a skill based on what's working in practice, the linked persona or use case may not reflect current reality. A soft staleness signal — "this skill was recently edited; review whether linked knowledge objects are up to date" — surfaced on the knowledge object detail page.

**Skill Drift Scoring**
Use Weaviate vector similarity to compute a periodic drift score between a skill's stored vector and each linked knowledge object's vector. When cosine similarity drops below a threshold, surface the skill in a "Potentially Stale Skills" section on the Health Dashboard — proactive visibility without requiring an update event to trigger the check.

**Skill Lineage with Knowledge Object Snapshots**
Extend skill versioning to record which state each linked knowledge object was in at the time the skill was last refreshed. Enables meaningful provenance: *"Skill v1.2 was last refreshed when Sales Persona was at state X. The persona has since changed three times."* Useful for debugging content quality drift.

**Skill Refresh Propagation to Generated Content**
`GeneratedContent` already tracks `usedSkills`. When a skill is version-bumped via a refresh, identify all `GeneratedContent` objects produced using the prior version. Surface a "Content produced with outdated skill" report — prompting writers to regenerate or manually review affected pieces.

**External-Source-Triggered Refreshes**
When an external system pushes a knowledge object update via MCP ([Group J](./group-j.md)) and that submission is accepted, the same Group M skill refresh pipeline fires automatically. Real-world intelligence from CRM syncs, competitive intel feeds, or Slack bots could cascade into skill refresh suggestions — the admin reviews in the queue as normal.
