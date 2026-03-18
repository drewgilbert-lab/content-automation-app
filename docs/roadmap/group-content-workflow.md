> Back to [Roadmap Index](./README.md)

# Group Content Workflow — Pillar Research Orchestration

> Scope: Build an app-native orchestration system that turns one human input (use case or topic/theme) into three parallel deep-research workflows: (A) competitor functionality, (B) competitor personas + messaging, and (C) market research. The system must run automatically after step 1, persist every artifact, enforce strict step dependencies, manage context budgets, handle 10+ minute jobs, and produce pillar-ready outputs with full lineage.
> Dependencies: Groups A-F (knowledge CRUD, review queue, merge patterns), Group G (session/SSE orchestration patterns), Group I (skills + context assembly), [Group R](./group-r.md) (narrative consumption layer), [Group T](./group-t.md) (cost tracking), [Group U](./group-u.md) (context budget controls), [Group V](./group-v.md) (structured logging).

## Why This Matters

The current research-to-pillar process is manual and fragmented:

1. Capture a theme/use case manually.
2. Build prompts manually from templates.
3. Run transcript research manually.
4. Extract competitors/personas manually.
5. Run competitor research manually, one competitor at a time.
6. Run market research separately.
7. Aggregate outputs manually into pillar docs.

That creates four recurring problems:

- **Slow throughput:** one pillar can take days of analyst effort.
- **Inconsistent outputs:** each researcher interprets templates differently.
- **No durable lineage:** hard to trace which sources/prompt versions produced a claim.
- **No reliable refresh path:** reruns are ad-hoc and hard to compare over time.

This group introduces a deterministic orchestration layer that:

- captures a run once,
- fans out into three parallel branches,
- saves each prompt and research artifact immutably,
- aggregates branch outputs into pillar documents,
- and supports rerun/resume/idempotency without duplicate side effects.

## Position in the Content Engine

```
Input Capture (use case/topic-theme)
        |
        v
Pillar Research Run (durable run record + step graph)
        |
        +--> Branch A: Competitor Functionality
        |        (transcript research -> extraction -> per-competitor jobs -> aggregate)
        |
        +--> Branch B: Competitor Persona + Messaging
        |        (transcript research -> extraction -> per-competitor jobs -> aggregate)
        |
        +--> Branch C: Market Research
                 (prompt build -> deep research -> market-content-brief)
        |
        v
Fan-in + Final Aggregation
        |
        v
Pillar outputs persisted for downstream workflows (including Group R narratives)
```

## Architecture (Option 1: App-Native Orchestrator)

### Core Design

- **Parent run + child branch model**
  - Parent run owns lifecycle, orchestration policy, and fan-in logic.
  - Child branches own branch-local execution and artifacts.
  - Branches can fail/retry independently.

- **Durable execution state**
  - Redis-backed run/step state with in-memory fallback (pattern from `lib/upload-session.ts`).
  - Optional mirror of completed runs/artifacts in Weaviate for queryability and audit.

- **SSE + polling status**
  - Long-running workflows emit progress events.
  - Clients can reconnect and recover status from durable run state.

- **Immutable artifact storage**
  - Prompt artifacts, deep research artifacts, extracted entities, and aggregate docs are append-only.
  - No in-place mutation of prior artifacts; corrections create new versions.

### Orchestration Diagram

```
Step 1 (human):
  create PillarResearchRun + save initial context
  status: created

Step 1.1 (automatic):
  fan-out launch:
    A: competitor functionality
    B: competitor personas + messaging
    C: market research
  status: branches_running

Branches A/B shared upstream:
  A1/B1: build transcript-research prompt from template + context
  A2/B2: run deep transcript research
  A3/B3: extract competitors/personas/titles
  A4/B4: build branch-specific competitor prompt template with {{competitor}}
  A5/B5: run per-competitor + HG Insight jobs (parallel children)
  A6/B6: aggregate per-competitor outputs into branch pillar doc

Branch C:
  C1: build market prompt from template + context
  C2: run market deep research
  C3: save market-content-brief

Fan-in:
  F1: verify A + B + C completion
  F2: aggregate branch outputs into final pillar package
  F3: persist final outputs + lineage
  status: completed
```

## Entities and Data Contracts

| Entity | Purpose | Key Fields |
|---|---|---|
| `PillarResearchRun` | Top-level run record | `id`, `status`, `inputType`, `inputValue`, `createdBy`, `startedAt`, `completedAt`, `idempotencyKey`, `errorSummary` |
| `PillarResearchBranch` | Branch state | `id`, `runId`, `branchType`, `status`, `currentStep`, `attemptCount`, `startedAt`, `completedAt`, `lastError` |
| `PillarResearchStep` | Granular step execution | `id`, `branchId`, `stepType`, `status`, `dependsOnStepIds`, `attempt`, `maxRetries`, `startedAt`, `completedAt` |
| `PillarResearchArtifact` | Immutable outputs | `id`, `runId`, `branchId`, `stepId`, `artifactType`, `name`, `version`, `contentRef`, `metadata`, `createdAt` |
| `ExtractedEntitySet` | Structured extraction from transcript research | `id`, `runId`, `competitors[]`, `personas[]`, `titles[]`, `confidence`, `sourceArtifactId` |
| `PromptTemplateVersion` | Template registry | `templateKey`, `version`, `body`, `variables`, `active`, `createdAt` |
| `PromptArtifact` | Rendered prompt snapshot | `id`, `templateKey`, `templateVersion`, `renderedBody`, `variables`, `namingKey`, `hash` |
| `BranchAggregate` | Branch-level pillar output | `id`, `branchType`, `artifactIds[]`, `contentRef`, `qualityChecks` |
| `FinalPillarPackage` | Fan-in output bundle | `id`, `runId`, `functionalityBriefRef`, `personaMessagingBriefRef`, `marketBriefRef`, `finalAggregationRef` |

## ArtifactType Taxonomy (Canonical)

All persisted workflow outputs MUST declare an `artifactType`. This is the primary taxonomy for orchestration storage, lineage, and validation.

```ts
type ArtifactType =
  | "transcript_research_doc"
  | "extracted_entity_set"
  | "prompt_rendered"
  | "competitor_functionality_doc"
  | "competitor_persona_messaging_doc"
  | "functionality_content_brief"
  | "competitor_persona_messaging_content_brief"
  | "market_content_brief"
  | "final_pillar_package";
```

| artifactType | Purpose | Producer Step | Payload Shape |
|---|---|---|---|
| `transcript_research_doc` | Deep customer transcript analysis output for branch A/B upstream | A2/B2 | Markdown document |
| `extracted_entity_set` | Structured extraction of competitors, personas, and titles | A3/B3 | JSON (`competitors[]`, `personas[]`, `titles[]`, `confidence`) |
| `prompt_rendered` | Fully rendered prompt snapshot from template + variables | A1/B1/C1/A4/B4 | Text + JSON metadata (`templateKey`, `templateVersion`, `renderHash`) |
| `competitor_functionality_doc` | Per-competitor functionality research output | A5 | Markdown document |
| `competitor_persona_messaging_doc` | Per-competitor persona and messaging research output | B5 | Markdown document |
| `functionality_content_brief` | Branch A aggregate brief | A6 | Markdown brief + citations metadata |
| `competitor_persona_messaging_content_brief` | Branch B aggregate brief | B6 | Markdown brief + citations metadata |
| `market_content_brief` | Branch C final market research output | C3 | Markdown brief |
| `final_pillar_package` | Fan-in bundle for downstream workflows | F2/F3 | JSON package containing refs + optional synthesized markdown |

### Artifact Immutability and Versioning Rules

- Artifacts are append-only and immutable after creation.
- Corrections create a new artifact version and keep a pointer chain (`previousArtifactId`).
- Lineage records parent artifact IDs and producing run/branch/step IDs.
- Orchestration uses artifact references between steps (not mutable in-memory payload passing) to preserve replayability.

## ContentType Strategy for This Workflow

This workflow introduces two layers of typing:

- `artifactType` (required now): persistence and orchestration taxonomy.
- `contentType` (optional now): skill auto-selection, cost breakdown, and analytics taxonomy.

### Current Platform Compatibility

Current skill `contentType` values in `lib/skill-types.ts` are:

- `email`
- `blog`
- `social`
- `thought_leadership`
- `internal_doc`
- `content_narrative`
- `pillar_research`
- `competitor_functionality_brief`
- `competitor_persona_messaging_brief`
- `market_content_brief`

N10 implemented **Option B** and promoted workflow-specific `contentType` values to first-class support across shared surfaces (API, MCP, UI labels, and external type metadata endpoint).

### Proposed Workflow Content Types (When Enabled)

If we opt into content-type expansion for workflow execution and analytics, add:

- `pillar_research`
- `competitor_functionality_brief`
- `competitor_persona_messaging_brief`
- `market_content_brief`

### Decision Matrix: Now vs Later

| Option | What ships now | Pros | Tradeoffs | Follow-on Groups |
|---|---|---|---|---|
| **A — Recommended now** | Add `artifactType` taxonomy only; keep orchestration independent from skill `contentType` auto-selection | Fastest path, lowest cross-system risk, unblocks build immediately | Workflow outputs are not yet first-class in content-type analytics | None required for initial build |
| **B — Full now** | Add both `artifactType` and new workflow `contentType` values | Unified skill/cost/reporting taxonomy from day one | Requires coordinated enum/API/MCP/classifier/UI propagation | Group I, Group T, Group U, Group N |

## Workflow Scope and Branch Logic

### Step 1 (shared trigger)

1. User selects existing use case or enters new topic/theme.
2. System validates required fields and creates parent run.
3. System persists canonical seed context (immutable snapshot).
4. System launches branches A, B, and C automatically.

### Branch A: Competitor Functionality

1. Build transcript-research prompt using seed context + template.
2. Save prompt artifact with standard naming convention.
3. Run deep transcript research (10+ min).
4. Save transcript research doc artifact.
5. Extract competitors/personas/titles; persist structured extraction.
6. Build competitor functionality prompt template with `{{competitor}}`.
7. Save templated prompt artifact.
8. Execute prompt for each extracted competitor plus HG Insights.
9. Save one functionality doc per competitor/HG.
10. Aggregate per-competitor docs into `functionality-content-brief`.
11. Save branch aggregate artifact.

### Branch B: Competitor Personas + Messaging

1. Build transcript-research prompt (same seed context; branch-specific framing).
2. Save prompt artifact with naming convention.
3. Run deep transcript research (10+ min).
4. Save transcript research doc artifact.
5. Extract competitors/personas/titles; persist structured extraction.
6. Build competitor persona/messaging prompt template with `{{competitor}}`.
7. Save templated prompt artifact.
8. Execute prompt for each extracted competitor plus HG Insights.
9. Save one persona/messaging doc per competitor/HG.
10. Aggregate per-competitor docs into `competitor-persona-messaging-content-brief`.
11. Save branch aggregate artifact.

### Branch C: Market Research

1. Build market prompt from seed context + market template.
2. Save prompt artifact.
3. Run deep market research (10+ min).
4. Save `market-content-brief`.

### Fan-In and Finalization

1. Wait for A, B, C terminal success.
2. Validate required artifacts exist for each branch.
3. Assemble final pillar package (branch aggregates + market brief).
4. Save final package and lineage graph.
5. Mark run completed and publish downstream references for future workflows.

## State Machines

### Run Status

`created -> branches_running -> fan_in_pending -> completed`

Failure rails:

- any unrecoverable branch failure -> `failed`
- manual stop -> `cancelled`

### Branch Status

`pending -> running -> completed`

Failure rails:

- transient failure -> `retrying` (bounded)
- retries exhausted -> `failed`
- parent cancellation -> `cancelled`

### Step Status

`pending -> running -> completed`

Failure rails:

- dependency unmet -> `blocked`
- execution failure -> `retrying` or `failed`

## Prompting and Template Governance

- Prompt templates are never used directly at runtime.
- Runtime always creates rendered prompt artifacts from:
  - template body,
  - template version,
  - branch variables,
  - seed context.
- Required metadata on each prompt artifact:
  - `templateKey`
  - `templateVersion`
  - `renderHash`
  - `namingConventionKey`
  - `runId/branchId/stepId`

### Naming Convention Requirements

Each prompt artifact name should include:

- workflow family (`pillar-research`)
- branch (`functionality` / `persona-messaging` / `market`)
- context slug (use case/theme)
- template version
- timestamp or run short-id

Example pattern:

`pillar-research.functionality.<theme-slug>.v<template-version>.<run-short-id>`

## Long-Running Execution Strategy

Deep research tasks can exceed 10 minutes and should not depend on request lifecycle.

### Required behavior

- background-capable execution
- resumable state
- heartbeat/progress updates
- timeout and retry policies per step
- reconnect-safe status retrieval

### Timeout policy (initial)

- transcript deep research: 20 min hard timeout
- per-competitor research: 15 min hard timeout
- aggregation steps: 8 min hard timeout

### Retry policy (initial)

- network/rate limit failures: exponential backoff (up to 3 retries)
- deterministic validation failures: fail fast, no retry

## Context Window and Token Budget Controls

To prevent context overflow in multi-artifact aggregation:

1. **Step-level token budgets**
   - each step has a max token budget and max output budget.

2. **Branch-level output constraints**
   - per-competitor outputs are normalized to structured sections.

3. **Hierarchical aggregation**
   - aggregate per-competitor docs into branch brief first.
   - final aggregation consumes branch briefs, not raw competitor docs.

4. **Artifact references over raw payloads**
   - pass artifact IDs and retrieval filters between steps.
   - avoid pushing full prior outputs through every call.

## Observability and Operations

Capture structured telemetry per run/branch/step:

- run creation/completion/failure
- step start/end durations
- retry counts and failure classes
- per-step token usage and cumulative run usage
- queue delay vs execution time
- artifact count and storage footprint

### Minimum dashboards

- active runs by status
- average run duration
- branch failure rates
- top failing steps
- token/cost distribution by branch

## Security and Governance

- enforce role-based run initiation (future integration with Group W).
- store immutable audit trail for prompt and artifact lineage.
- optional approval gate before promoting final package to downstream workflows.
- redact sensitive transcript fragments from logs/telemetry.

## Implementation Phases and Tasks

## Phase 1 - Foundation and Data Model

**CW1 - Define run/branch/step/artifact types** — ✅ Done (2026-03-17)  
Create `lib/content-workflow-types.ts` with unions, lifecycle states, and validation helpers, including canonical `ArtifactType` enum and payload contracts per artifact type.

**CW2 - Build durable run store** — ✅ Done (2026-03-17)  
Create `lib/content-workflow-store.ts` using Redis + in-memory fallback patterns from `lib/upload-session.ts`.

**CW3 - Add workflow APIs (run create/get/status/cancel)** — ✅ Done (2026-03-17)  
Add routes under `app/api/content-workflow/`.

**CW4 - Add artifact persistence contract** — ✅ Done (2026-03-17)  
Define artifact interfaces and storage adapters (Weaviate/object-store references) with required fields: `artifactType`, `version`, `previousArtifactId`, `lineage`.

## Phase 2 - Template and Prompt Layer

**CW5 - Template registry and version management** — ✅ Done (2026-03-17)  
Create `lib/content-workflow-templates.ts` and registry format, and persist rendered prompt snapshots as `prompt_rendered` artifacts.

**CW6 - Rendered prompt artifact generation** — ✅ Done (2026-03-17)  
Implement variable binding, validation, and artifact naming conventions.

**CW7 - Prompt integrity checks** — ✅ Done (2026-03-17)  
Validate required variables and schema before execution.

## Phase 3 - Orchestration Engine

**CW8 - Parent run orchestrator** — ✅ Done (2026-03-17)  
Implement fan-out launch and fan-in coordination logic.

**CW9 - Step scheduler and dependency resolver** — ✅ Done (2026-03-17)  
Ensure step order and block/unblock transitions are deterministic.

**CW10 - Retry/timeout/idempotency framework** — ✅ Done (2026-03-17)  
Introduce shared execution wrapper with policies.

## Phase 4 - Branch Implementations

**CW11 - Branch A implementation (functionality)**  
Implement end-to-end A flow including per-competitor fan-out and branch aggregate.

**CW12 - Branch B implementation (persona + messaging)**  
Implement end-to-end B flow with branch-specific template family.

**CW13 - Branch C implementation (market)**  
Implement market workflow as independent branch.

## Phase 5 - Aggregation and Output Packaging

**CW14 - Branch aggregate validators**  
Validate branch outputs before fan-in.

**CW15 - Final package assembler**  
Build final fan-in assembly and lineage writer.

**CW16 - Downstream handoff contract**  
Write output references consumable by future workflows and Group R.

## Phase 6 - Reliability, Cost, and Observability

**CW17 - Context/token budget enforcement**  
Apply budget controls with truncation/summarization policies.

**CW18 - Structured logging and metrics**  
Add run/branch/step metrics and operational dashboards.

**CW19 - Failure operations and replay tools**  
Add branch rerun, step replay, and dead-letter diagnostics.

## Phase 7 - Testing and Documentation

**CW20 - Test matrix (unit/integration/e2e)**  
Cover all lifecycle transitions, retries, branch isolation, fan-in correctness, artifact-type validation, and artifact lineage integrity.

**CW21 - Documentation updates**  
Update `docs/roadmap/README.md`, this group doc, relevant API docs, and user guides, including explicit `artifactType` and `contentType` policy.

## Taxonomy Acceptance Criteria

- `artifactType` enum is defined once and referenced across store/API/orchestrator contracts.
- Every persisted artifact includes `artifactType`, `version`, and lineage metadata.
- `contentType` policy is explicit: prompt artifacts use `text/plain`, markdown research/brief artifacts use `text/markdown`, and package/reference artifacts use `application/json`.
- `prompt_rendered` artifacts include template version and render hash metadata.
- Decision (Option A or B) is documented before implementation starts.
- If Option B is selected, downstream propagation tasks are tracked under Group N and related groups before execution.

## API Surface

| Method | Route | Purpose | Status |
|---|---|---|---|
| `POST` | `/api/content-workflow/runs` | Create parent run from Step 1 input | Implemented |
| `GET` | `/api/content-workflow/runs/:id` | Get full run status and branch states | Implemented |
| `GET` | `/api/content-workflow/runs/:id/status` | Get run status summary (branch/step counts, artifact count) | Implemented |
| `POST` | `/api/content-workflow/runs/:id/cancel` | Cancel run and active branches | Implemented |
| `POST` | `/api/content-workflow/runs/:id/start` | Start orchestration (or auto-start on create) | Implemented |
| `GET` | `/api/content-workflow/runs/:id/events` | SSE stream for progress | Implemented |
| `POST` | `/api/content-workflow/runs/:id/retry` | Retry failed branch/step according to policy | Implemented |

## Risks and Gaps

| Risk | Impact | Mitigation |
|---|---|---|
| Request-time execution for 10+ min jobs | Timeouts and partial writes | Use durable run state + background execution and resumable status |
| Context blowout in aggregation | Hallucinations, truncation, inconsistent briefs | Hierarchical aggregation and strict token budgets |
| Duplicate runs from accidental retrigger | Cost spikes and conflicting artifacts | Idempotency key + run dedupe window |
| Template drift during in-flight runs | Non-reproducible outputs | Pin and persist template version at run start |
| Extraction errors cascading into downstream branches | Poor competitor set and weak briefs | Confidence checks + fallback/manual checkpoint for low-confidence runs |
| Branch-specific failure blocking all outcomes | No final output despite partial success | Explicit failure policy (`strict` vs `partial`) and branch-level rerun |

## Open Questions

| Question | Context |
|---|---|
| Should transcript research be shared physically between A and B or duplicated for branch independence? | Shared reduces cost/time; duplicated can improve branch isolation and tailoring. |
| Should final fan-in require all three branches (`strict`) or allow partial delivery with warnings? | Product decision tied to quality bar and SLA. |
| Where should large artifact bodies live long-term? | Weaviate text fields vs object storage with references. |
| Should branch A/B per-competitor runs execute with bounded concurrency? | Needed to balance latency vs rate limits/cost. |
| When should outputs enter review queue governance? | Immediately at branch aggregate, at final package, or both. |

## Recommended Build Order

1. **CW1 -> CW4** (data model + persistence)
2. **CW5 -> CW7** (template/versioning)
3. **CW8 -> CW10** (orchestrator core)
4. **CW11 + CW12 + CW13** (branch implementations; parallelizable)
5. **CW14 -> CW16** (aggregation + output packaging)
6. **CW17 -> CW19** (reliability/cost/observability)
7. **CW20 -> CW21** (testing and docs)

Branches can be developed in parallel only after orchestration core is stable.
