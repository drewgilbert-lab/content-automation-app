> Back to [Roadmap Index](./README.md)

# Group X — Context Assembly Test Coverage

> Scope: Add comprehensive unit tests for `lib/context-assembly.ts`, the single most important function in the application. Covers all assembly modes, edge cases, and truncation behavior before the Generate UI ships.
> Dependencies: Group I (context assembly function exists). Group U (truncation logic — tests should cover budget enforcement once U2–U3 are built).

## Why This Matters

`lib/context-assembly.ts` determines the quality of every piece of generated content. The `assembleContext()` function selects skills, retrieves knowledge objects, applies business rules, and optionally includes a content narrative. A bug in this function silently degrades all generated output. It currently has zero tests. Before the Generate UI ships and users depend on generation quality, this function needs thorough test coverage to catch regressions.

**X1 — Test Infrastructure Setup**
Verify that the existing test framework (Jest or Vitest, whichever is already configured) can import and test `lib/context-assembly.ts`. Create `lib/__tests__/context-assembly.test.ts`. Set up mock factories for the Weaviate client responses: mock knowledge objects (personas, segments, use cases, business rules, ICPs, competitors, customer evidence), mock skills, and mock narratives. Each mock factory returns a realistic object matching the types in `lib/knowledge-types.ts` and `lib/skill-types.ts`. Mock `withWeaviate()` to return deterministic data without hitting the real Weaviate cluster.

**X2 — Core Assembly Tests**
Test the following scenarios:

- **Business rules only:** Assemble context with no skills, no pinned knowledge objects, and no narrative. Verify that all active, non-deprecated business rules appear in the "Business Rules (Constraints)" section.
- **Skills matched by content type:** Assemble context with `contentType: "email"`. Verify that only skills with `contentType` including `"email"` are included. Verify skills appear in the "Active Skills" section with name and version.
- **Manually selected skills:** Assemble context with explicit `skillIds`. Verify that exactly those skills are included regardless of content type matching. Verify that auto-selected skills are excluded when manual selection is provided.
- **Hybrid skill selection:** Assemble context with `contentType: "email"` and additional `skillIds`. Verify that both auto-matched and manually selected skills are included, with deduplication.
- **Knowledge object retrieval:** Assemble context with a generation prompt. Verify that semantic search is called and retrieved objects appear in the correct system prompt sections (persona under "Target Persona", segment under "Target Account Segment", etc.).
- **Pinned knowledge objects:** Assemble context with pinned persona and segment IDs. Verify that pinned objects are always included regardless of semantic search results. Verify that semantic search supplements un-pinned slots.

**X3 — Narrative Integration Tests**
Test assembly with a content narrative (once Group R is built, or with mocks):

- **Narrative included:** Assemble context with a `narrativeId`. Verify the narrative content appears in the system prompt in the correct position (after knowledge objects, before business rules, or per the defined prompt template order).
- **Approved vs. non-approved narrative:** Verify that only `status: "approved"` narratives are included. Attempting to assemble with a draft or archived narrative should produce a warning or exclusion.
- **Narrative with linked knowledge objects:** Verify that knowledge objects linked to the narrative are included in the context alongside the narrative itself.

**X4 — Context Window and Truncation Tests**
Test budget enforcement (once Group U is built, or with mocks):

- **Under budget:** Assemble context where total content fits within the token budget. Verify no truncation is applied and `truncationApplied` is `false`.
- **Over budget — knowledge object truncation:** Assemble context with a 50,000-word persona. Verify the persona content is truncated to fit its allocated budget, the truncation marker is appended, and other content sources are not affected.
- **Over budget — skill exemption:** Assemble context where skills exceed their budget. Verify that skills are not truncated (per Group U rules) and instead the number of included skills is reduced.
- **Budget allocation:** Verify that the default budget percentages (30% narrative, 25% skills, 30% knowledge, 10% rules, 5% framing) are applied correctly.

**X5 — Edge Case Tests**
Test defensive behavior:

- **No matching skills:** Assemble context for a content type with no matching skills. Verify the "Active Skills" section is omitted (not rendered as empty).
- **Deprecated objects excluded:** Assemble context where some retrieved knowledge objects are deprecated. Verify they are filtered out before inclusion.
- **Empty content:** Assemble context where a knowledge object has an empty `content` field. Verify it is either skipped or handled gracefully (no empty section in the prompt).
- **No knowledge objects found:** Assemble context where semantic search returns zero results. Verify the system prompt still includes skills and business rules.
- **All business rules deprecated:** Assemble context where all business rules are deprecated. Verify the "Business Rules" section is omitted.
- **Maximum skill limit:** Assemble context where auto-matching returns 10 skills but the limit is 5. Verify only the top 5 (by relevance or priority) are included.

**X6 — Claude Skill Package Schema Tests**
Add tests for canonical Claude-compatible skill packages (`SKILL.md` plus optional support files). Validate frontmatter parsing and constraints (`name`, `description`, optional invocation controls), markdown body extraction, and deterministic conversion between internal `Skill` objects and package representation. Include round-trip tests (`Skill -> package -> Skill`) and explicit assertions for expected lossy fields, if any.

**X7 — API/MCP Interop Contract Tests for Skill Push/Pull**
Add route/tool tests that verify skill payloads can be pushed and pulled using the shared contract across external API and MCP interfaces. Cover happy path, invalid-type rejection, missing required field rejection, unsupported frontmatter key rejection, and stable machine-readable error payloads. Ensure test fixtures match the standards documented for contributor-authored skills.

**X8 — Env-Gated Claude Acceptance Smoke Test**
Add an optional smoke test suite (skipped by default) that runs only when required environment variables are present. The suite should build a real skill bundle artifact from test fixtures, submit it through the configured push path, and verify the resulting payload is accepted by Claude-oriented validation rules. This test is intended as a release gate for interoperability changes, not as a mandatory local dev test.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Mocking Weaviate responses is complex | Test setup becomes fragile and hard to maintain | Create reusable mock factories that mirror actual Weaviate response shapes; update mocks when schema changes |
| Tests for Group U truncation cannot be written until Group U is built | X4 tests are blocked by U2–U3 | Write X4 test stubs with `test.todo()` annotations; implement when Group U lands |
| Tests for narrative integration require Group R | X3 tests are partially blocked | Write X3 tests using mock narrative objects that match the planned `ContentNarrative` schema; validate against real implementation when Group R lands |
| Context assembly function may need refactoring to be testable | Tight coupling to Weaviate makes mocking difficult | If necessary, extract a pure `buildSystemPrompt()` function that accepts pre-fetched data, making it trivially testable; keep Weaviate queries in a separate data-fetching layer |
| Test coverage does not guarantee generation quality | Tests verify structure, not whether Claude produces good output | Tests ensure correct context is assembled; generation quality depends on prompt design (Skills) and knowledge quality — tracked separately |
| Live Claude acceptance tests can be flaky or credential-gated | CI instability or false negatives when external access is unavailable | Keep live checks env-gated, run schema/mapping tests in default CI, and reserve live smoke for release/pre-merge validation |
