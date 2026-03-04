> Back to [Roadmap Index](./README.md)

# Group U — Context Window Budget Management

> Scope: Enforce content length limits on knowledge objects and implement token budget allocation within `assembleContext()` to prevent context window overflow during content generation. Ensures that oversized knowledge objects do not degrade generation quality or cause API failures.
> Dependencies: Group I (context assembly — `lib/context-assembly.ts`). Module 2 Generate (context assembly is invoked during generation).

## Why This Matters

There is no enforced limit on how long a knowledge object's content can be. A 50,000-word persona document would consume the entire context window when assembled alongside skills, business rules, and a content narrative. `assembleContext()` currently concatenates all retrieved content without regard for total size. Claude's context window is large but finite, and overfilling it degrades output quality even before hitting hard token limits — the model loses focus when context is too long. A clear budget per content source ensures consistent generation quality regardless of individual object size.

**U1 — Content Length Validation on Write**
Add a configurable maximum content length (in characters) to the knowledge object and skill write APIs. Default: 50,000 characters (~12,500 words) per object. Enforce on `POST /api/knowledge`, `PUT /api/knowledge/[id]`, `POST /api/skills`, and `PUT /api/skills/[id]`. Return a 400 error with a clear message ("Content exceeds maximum length of 50,000 characters") if the limit is exceeded. Store the limit constant in `lib/knowledge-types.ts` as `MAX_CONTENT_LENGTH`. Add a character counter to the knowledge and skill form UIs that shows current length vs. limit, with a warning color when approaching the threshold (>80%).

**U2 — Token Budget Allocation in assembleContext()**
Extend `lib/context-assembly.ts` with a token budget system. Define a total context budget (default: 150,000 tokens, configurable via environment variable `CONTEXT_BUDGET_TOKENS`). Allocate the budget across content sources with configurable weights:

| Source | Default Allocation | Notes |
|---|---|---|
| Content Narrative | 30% | Primary strategic context; given the most room |
| Skills | 25% | Procedural instructions; typically concise |
| Knowledge Objects (persona, segment, use case, etc.) | 30% | Retrieved context; multiple objects share this budget |
| Business Rules | 10% | Constraints; typically short |
| System prompt framing | 5% | Fixed overhead for the prompt template |

Use a token estimation function (character count / 4 as a rough heuristic, or `tiktoken` for precise counts) to measure each content source before assembly. If a source exceeds its allocated budget, truncate with a trailing marker: `\n\n[Content truncated — original length: X tokens, budget: Y tokens]`.

**U3 — Smart Truncation Strategy**
Implement intelligent truncation in `lib/context-assembly.ts` rather than naive character cutoff. For knowledge objects: truncate from the end, preserving the opening summary/overview section which typically contains the most important information. For skills: never truncate — if a skill exceeds its budget, log a warning and include it fully (skills are procedural and cannot be partially applied). For business rules: include all rules but truncate individual rule content if a single rule is excessively long. For narratives: truncate from the end, preserving the theme, angle, intent, and audience sections. Add a `truncationApplied` flag to the `AssembledContext` return type so the Generate UI can warn the user that context was truncated.

**U4 — Context Budget Visibility**
Add a "Context Budget" panel to the Generate UI (after Module 2 is built). Display: total budget, allocated budget per source, actual usage per source (bar visualization), and whether any truncation was applied. This transparency helps users understand why a generation may have missed nuance from a lengthy knowledge object, and motivates them to keep objects concise.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Character-based token estimation is inaccurate | Budget calculations off by 10-20% | Use character/4 as a fast heuristic; optionally integrate `tiktoken` for precise counts; leave 10% headroom in the total budget |
| Truncation removes critical information | Generated content misses key details from truncated objects | Smart truncation preserves openings; `truncationApplied` flag warns the user; user can pin specific objects to prioritize their inclusion |
| Existing long objects fail validation retroactively | Objects already in Weaviate may exceed the new limit | Validation applies only on write (create/update), not retroactively; add a Health Dashboard report for objects exceeding the recommended length |
| Budget allocation is too rigid | Some generations need more narrative and less knowledge, or vice versa | Allow per-request budget overrides in the generation API; default weights are starting points |
| Skills should never be truncated | A partially applied skill produces worse output than no skill | Skills are exempt from truncation; if total skill content exceeds the skill budget, reduce the number of included skills rather than truncating any |
