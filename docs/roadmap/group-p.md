> Back to [Roadmap Index](./README.md)

# Group P — Content Cleaning Rules

> Scope: A new admin module for defining rules that clean and transform incoming content at ingestion time. Rules remove repeated non-value patterns (terms and conditions, company address boilerplate, legal disclaimers) before content enters the review queue. Reviewers see cleaned content with a diff showing what was removed.
> Dependencies: Groups E–G (submission pipeline, bulk upload).

## Core Concept

Content arrives unchanged from source to storage. Repeated non-value patterns (terms and conditions, company locations, legal boilerplate) pollute knowledge objects. Content cleaning rules provide an automated layer that strips these patterns at ingestion time, with full transparency for reviewers.

Three rule types are supported:

| Type | Pattern Field | Behavior |
|---|---|---|
| `regex` | Regular expression | Pattern-based removal/replacement (e.g., strip "Terms & Conditions" sections) |
| `substring` | Literal text | Simple text matching (e.g., remove "123 Main St, Anytown USA" everywhere) |
| `ai_prompt` | Claude instruction | Send content through Claude with the prompt as instructions (e.g., "Remove any legal disclaimers and copyright notices"). More flexible but higher cost; for complex patterns that are hard to regex |

**P1 — CleaningRule Weaviate Collection and CRUD**
Design and create a `CleaningRule` Weaviate collection with fields: `name` (text), `description` (text), `ruleType` (text: `regex` | `substring` | `ai_prompt`), `pattern` (text), `replacement` (text, default empty for removal), `active` (boolean), `priority` (int, lower = runs first), `scope` (text array of object types, empty = all), `createdAt` (date), `updatedAt` (date). Build `lib/cleaning-rule-types.ts` with types and constants. Build `lib/cleaning-rules.ts` with CRUD operations: `listCleaningRules`, `getCleaningRule`, `createCleaningRule`, `updateCleaningRule`, `deleteCleaningRule`.

**P2 — Content Cleaner Engine**
Build `lib/content-cleaner.ts` with an `applyCleaningRules(content, objectType?)` function. Loads active rules sorted by priority, filters by scope (matching `objectType` or rules with empty scope), and applies each in order. For `regex` rules, applies `content.replace(new RegExp(pattern, 'g'), replacement)`. For `substring` rules, replaces all occurrences. For `ai_prompt` rules, sends content through Claude with the pattern as the system instruction. Returns `{ cleaned: string, changes: CleaningChange[] }` where each `CleaningChange` records the rule name, what was matched, and the replacement.

**P3 — Pipeline Integration**
Apply cleaning rules at ingestion time so reviewers see cleaned content. In `app/api/bulk-upload/approve/route.ts`, call `applyCleaningRules(doc.content, objectType)` before creating the submission; store cleaned content in `proposedContent` and attach `cleaningChanges` as metadata. In `lib/submissions.ts`, when creating submissions from MCP or API sources, apply cleaning rules to `proposedContent.content` if present. In `app/queue/components/submission-review.tsx`, if `cleaningChanges` metadata exists on the submission, show a collapsible "Content Cleaned" section with a diff of what was removed so the reviewer has full visibility.

**P4 — Admin UI**
Build an admin module at `/cleaning-rules`:
- **List page** (`app/cleaning-rules/page.tsx`): shows all rules with active/inactive toggle, rule type badges, priority ordering, scope tags. Links to create and edit.
- **Create page** (`app/cleaning-rules/new/page.tsx`): form with name, description, rule type selector, pattern input (with regex tester UI for regex type), replacement, scope multi-select (object types), priority number input.
- **Detail/edit page** (`app/cleaning-rules/[id]/page.tsx`): view and edit rule details.
- **API routes**: `GET/POST /api/cleaning-rules` for list and create; `GET/PUT/DELETE /api/cleaning-rules/[id]` for detail, update, and delete.
- Add a "Cleaning Rules" navigation entry to the app layout.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Regex rules run on user-supplied patterns | Potential ReDoS or unexpected behavior | Validate regex at creation time; run with a timeout; show a pattern tester in the admin UI |
| `ai_prompt` rules add latency and cost | Each rule invokes Claude per document | Reserve `ai_prompt` for cases where regex/substring are insufficient; show cost warning in admin UI |
| Rules interact unexpectedly when chained | Earlier rules change content that later rules expected to match | Priority ordering is explicit; show a "test content" feature that applies all rules in order with intermediate results |
| Cleaning removes valuable content | Overly broad patterns strip useful information | Diff is shown to the reviewer before acceptance; rules can be scoped to specific object types; easy to deactivate |

## Suggested Implementation Order for Groups N–P

1. **N1 + N2** (fix missing UI types + schema change rule) — quick fix, establishes the process for subsequent work
2. **N3 + N4 + N5 + N7** (skill type expansion + SKILL.md classification) — core type expansion, done together
3. **N6** (MCP duplicate detection) — builds on the expanded submission pipeline from step 2
4. **O2 + O3** (editable tags + shared TagEditor) — independent UI improvement
5. **O1** (bulk approve) — independent UI improvement
6. **P1 → P2 → P3 → P4** (content cleaning rules) — largest item, new module, done last

Steps 4–5 can be parallelized with step 3. Group P is fully independent and can begin at any time.
