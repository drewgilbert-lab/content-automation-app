> Back to [Roadmap Index](./README.md)

# Group N — Unified Object Type Support

> Scope: Extend the submission pipeline, MCP tools, bulk upload classifier, and UI to treat `skill` as a first-class object type alongside the 7 knowledge types. Fix missing object type coverage in the Knowledge Base UI. Add MCP duplicate detection so resubmitting an existing document routes through review/merge. Establish a schema-change process so type additions propagate automatically.
> Dependencies: Group I (Skills Module), Groups E–F (Review Queue, AI Merge), [Group J](./group-j.md) (MCP Server).

## Context

The `Skill` collection exists in Weaviate with full CRUD in `lib/skills.ts`, but it is isolated from the submission/review pipeline. The MCP `create_knowledge_object` tool rejects `skill` as a type, and `reviewSubmission()` only calls `createKnowledgeObject()`/`updateKnowledgeObject()` — accepting a skill submission would fail at the review stage. Additionally, the Knowledge Base list page hardcodes only 5 of 7 knowledge types in its filter tabs (missing `competitor` and `customer_evidence`). The MCP create tool has no duplicate detection, so resubmitting content for an existing object creates a duplicate "new" submission instead of routing through review/merge.

**N1 — Fix Missing Object Types in Knowledge Base UI**
The `TABS` and `TYPE_ORDER` arrays in `app/knowledge/components/knowledge-list.tsx` are hardcoded with only 5 types (`persona`, `segment`, `use_case`, `business_rule`, `icp`). `competitor` and `customer_evidence` have no filter tabs and do not appear in the grouped view. Fix: derive `TABS` and `TYPE_ORDER` from `VALID_TYPES` and `getTypeLabel()` in `lib/knowledge-types.ts` so any future type additions propagate automatically. Add a fallback color in `type-badge.tsx` for unknown types as a safety net.

**N2 — Schema Change Rule**
Create `.cursor/rules/schema-change.mdc` — a checklist of all files and locations that must be updated when object types are added or changed. This becomes part of the AI-assisted workflow so changes propagate to every touchpoint. Locations to document: `lib/knowledge-types.ts` (type union, `VALID_TYPES`, `getTypeLabel()`), `lib/submission-types.ts` (after N3), `app/knowledge/components/type-badge.tsx` (color map), `app/knowledge/components/knowledge-list.tsx` (after N1, derived automatically), `lib/classifier.ts` (classification prompt type descriptions), `mcp-server/src/tools/create-object.ts` (`VALID_TYPES`), `mcp-server/src/schema.ts` (collection metadata), `app/api/bulk-upload/approve/route.ts` (type-specific field handling), `app/queue/components/submission-review.tsx` (type-specific rendering).

**N3 — Expand Submission Pipeline for Skill Type**
Introduce a broader `ObjectType` that includes `"skill"` alongside the existing `KnowledgeType` values. Update `SubmissionCreateInput` in `lib/submission-types.ts` to use the expanded type. Update `reviewSubmission()` in `lib/submissions.ts`: on accept of a `"new"` submission where `objectType === "skill"`, call `createSkill()` from `lib/skills.ts` instead of `createKnowledgeObject()`. On accept of an `"update"` or `"document_add"` submission where `objectType === "skill"`, call `updateSkill()` instead of `updateKnowledgeObject()`. Map the proposed content fields to the correct input shapes (`SkillCreateInput` vs `KnowledgeCreateInput`).

**N4 — MCP Create Tool: Add Skill Support**
Add `"skill"` to the `VALID_TYPES` array in `mcp-server/src/tools/create-object.ts`. Add skill-specific optional parameters to the tool schema: `description`, `contentType` (string array), `category`, `author`, `triggerConditions`, `parameters`, `outputFormat`. Include these in `proposedFields` when `objectType === "skill"`. Update the tool description to mention skill as a valid type.

**N5 — MCP Update Tool: Add Skill-Specific Parameters**
Add skill-specific optional parameters (`description`, `contentType`, `category`, `author`, `triggerConditions`, `parameters`, `outputFormat`) to the `update_knowledge_object` tool schema in `mcp-server/src/tools/update-object.ts`. The tool already looks up skills by ID; this adds the ability to propose changes to skill-specific fields.

**N6 — MCP Duplicate Detection**
Before creating a submission in the MCP `create_knowledge_object` tool, search for existing objects by name (exact match) in the target collection using `listKnowledgeObjects` (for knowledge types) or `listSkills` (for skill type). If a match is found, set `submissionType: "update"` instead of `"new"` and set `targetObjectId` to the existing object's ID. The response to the MCP caller should clearly indicate whether the submission was treated as new or as an update to an existing object. If no match, proceed with `submissionType: "new"` as today.

```
MCP create_knowledge_object called
        │
        ▼
Search by name in target collection
        │
        ├── Match found → Create "update" submission
        │                  with targetObjectId set
        │
        └── No match → Create "new" submission (today's behavior)
        │
        ▼
Submission enters review queue
        │
        ├── Accept new → createKnowledgeObject() or createSkill()
        ├── Accept update → updateKnowledgeObject() or updateSkill()
        └── Reject / Defer → No changes to collections
```

**N7 — SKILL.md Filename Classification in Bulk Upload**
Add a pre-AI filename check in `lib/classifier.ts`: if filename ends with `SKILL.md` (case-insensitive), set `objectType: "skill"` with `confidence: 1.0` and `needsReview: false`, skipping the Claude classification call for that document. Update `buildClassificationPrompt()` to include `skill` as a valid type with description: *"Content generation skill — prompt template, instructions, output format for producing specific content types."* Update `app/api/bulk-upload/approve/route.ts` to build skill-specific `proposedContent` with skill fields (`description`, `contentType`, `category`) when `objectType === "skill"`.
