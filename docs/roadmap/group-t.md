> Back to [Roadmap Index](./README.md)

# Group T — Content Generation Cost Tracking

> Scope: Track and display the cost of Claude API usage per content generation request, per content type, and per user. Provides visibility into token consumption for budgeting, prompt optimization, and identifying expensive generation patterns.
> Dependencies: Module 2 Generate (cost tracking instruments the generation pipeline). Group I (context assembly — token counting at assembly time).

## Why This Matters

Every content generation request burns Claude API tokens. Without cost tracking, there is no visibility into: how much each generation costs, which content types are most expensive, whether a specific skill or narrative inflates token usage, or what the monthly budget trend looks like. This data is essential for budgeting, for identifying expensive prompts that could be optimized, and for setting usage expectations with stakeholders.

## Phase 1 — Token Tracking Infrastructure (T1–T3)

**T1 — Token Counting in Generation Pipeline**
Instrument `lib/claude.ts` to capture token usage from Claude API responses. The Anthropic SDK returns `usage.input_tokens` and `usage.output_tokens` on every response. After each streamed response completes, extract the total input tokens, output tokens, and compute estimated cost based on the model's per-token pricing. Store pricing constants in a `lib/cost-constants.ts` file that maps model IDs to per-token rates (input and output separately). Pricing constants are updated manually when Anthropic changes rates. Return token usage metadata alongside the streamed content so callers can record it.

**T2 — Cost Metadata on GeneratedContent**
Extend the `GeneratedContent` Weaviate collection schema with cost tracking properties: `inputTokens` (int), `outputTokens` (int), `totalTokens` (int), `estimatedCostUsd` (number), `modelId` (text). When a generation is saved to the Content Library (Module 3), these fields are populated from the token usage captured in T1. Write a migration script to add the new properties to the existing collection. Existing records default to `null` for all cost fields.

**T3 — Cost Tracking for Non-Saved Generations**
Not all generations are saved — users may regenerate multiple times before saving, or discard a result entirely. To capture cost data for all generations (not just saved ones), log each generation event to a lightweight append-only store. Options: a `GenerationLog` Weaviate collection (simple, queryable) or structured JSON logs (cheaper, requires log aggregation to query). Each log entry records: timestamp, content type, model ID, input/output tokens, estimated cost, user identifier (when auth is added), skill IDs used, whether the result was saved. This log is the source of truth for aggregate cost reporting.

## Phase 2 — Cost Visibility UI (T4–T6)

**T4 — Generation Cost Display**
After each content generation completes in the Generate UI, display a cost summary below the generated content: input tokens, output tokens, total tokens, and estimated cost in USD. Format cost as "$0.0042" with appropriate precision. Include a tooltip explaining the calculation (model rate x tokens). This gives immediate feedback on the cost of each generation.

**T5 — Cost Dashboard**
Add a "Cost" section to the Health Dashboard at `/dashboard` (or a dedicated `/dashboard/costs` page). Display: total cost this month, cost trend (daily/weekly), cost breakdown by content type (bar chart or table), top 10 most expensive generations, average cost per content type, and token budget utilization if a monthly budget is configured. Data sourced from the generation log (T3). Include date range filters (last 7 days, last 30 days, custom range).

**T6 — Cost Budget and Alerts**
Add an optional monthly token budget configuration in the app settings (stored as an environment variable or in a `Settings` Weaviate collection). When the current month's cumulative cost exceeds configurable thresholds (e.g., 80%, 100%), display a warning banner on the Generate UI and a status indicator on the Health Dashboard. The system does not block generation when the budget is exceeded — it only warns. Blocking would require a policy decision that is outside the scope of this group.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Claude API pricing changes | Cost calculations become inaccurate | Pricing constants in `lib/cost-constants.ts` are manually maintained; add a note to check Anthropic pricing on each model upgrade |
| Token counting for streaming responses | Usage metadata may not be available until stream completes | Buffer usage data and record after stream end; if the stream is interrupted, log partial usage with an `incomplete` flag |
| High-volume generation log storage | Append-only log grows indefinitely | Implement TTL-based retention (e.g., 90 days) or aggregate old records into monthly summaries |
| No per-user cost attribution without auth | Cannot break down costs by user until Group W is implemented | Track by session or browser fingerprint as a stopgap; full per-user attribution requires Group W |
| Cost display may discourage usage | Users may avoid generating content to "save money" | Frame cost display as informational, not as a constraint; emphasize that iteration improves quality |
