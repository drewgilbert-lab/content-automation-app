> Back to [Roadmap Index](./README.md)

# Group Q — Weaviate Query Agent

> Scope: Integrate the Weaviate Query Agent as the retrieval layer for a standalone "Ask the Knowledge Base" feature. The Query Agent handles cross-collection natural language retrieval (Search mode only); Claude handles answer synthesis. This hybrid model keeps all generated answers consistent with the app's existing Claude-based voice while leveraging the agent's autonomous query planning across all knowledge collections. The feature is standalone — not bundled with Module 2 Generate. Future directions extend the agent into context assembly (Module 2) and external access channels (MCP, REST API).
> Dependencies: Groups A–B (knowledge CRUD), Group I (Skills Module), [Group K](./group-k.md) (REST API semantic search — replaced/enhanced), [Group J](./group-j.md) (MCP Server — enhanced in future phase).

## Why This Matters

The app currently has three separate search/retrieval pathways, each with limitations:

1. **Context assembly** (`lib/context-assembly.ts`): Runs a separate `nearText` query per collection (Persona, Segment, UseCase), one at a time, taking only the top-1 result from each. No cross-collection ranking — a weakly-relevant Persona is included at the same weight as a strongly-relevant UseCase. Business rules are fetched by brute-force (list all, filter in memory), not by relevance.

2. **External REST API** (`/api/v1/knowledge/search` via `semanticSearchKnowledge()`): Searches across collections in parallel, merges and ranks by certainty score. Returns raw object snippets (500-char truncation), no synthesized answers, no follow-up/conversational capability.

3. **MCP Server** (`search_objects` tool): Calls the same `semanticSearchKnowledge()` function. Returns JSON search results for external LLMs to interpret. No ability for the calling LLM to refine its query based on what was returned.

The Weaviate Query Agent addresses all three by providing autonomous cross-collection query planning — the agent reads collection and property descriptions, decomposes a natural language query into targeted searches across the relevant collections, and returns ranked results. This replaces the rigid 1-persona + 1-segment + 1-use-case retrieval model with adaptive retrieval where the agent determines which collections and how many objects are relevant to any given query.

## Architecture

The hybrid model separates retrieval from synthesis:

```
User asks a question
        │
        ▼
Query Agent (Search mode)
  - Reads collection/property descriptions
  - Decomposes query into targeted searches
  - Executes searches across knowledge collections
  - Returns ranked objects with metadata
        │
        ▼
Claude (Answer synthesis)
  - Receives retrieved objects as structured context
  - System prompt: answer using ONLY retrieved knowledge
  - Generates response citing source objects
  - Streams to the UI
        │
        ▼
Response with answer + source citations
  - Each source links to /knowledge/[id]
  - Type badge and relevance score per source
```

**Why hybrid instead of Query Agent Ask mode:** The Query Agent's Ask mode uses Weaviate Cloud's generative model for answer synthesis. Using Claude instead ensures consistent tone and voice with the rest of the app (AI merge, content generation, bulk upload classification all use Claude). It also gives full control over the system prompt and streaming behavior.

**Collection registry pattern:** A single registry file (`lib/query-agent-collections.ts`) defines which collections the Query Agent can search, along with their descriptions, property descriptions, and view properties. When a new knowledge collection is added to the app, the developer adds an entry to the registry — the Query Agent, Ask API, and all downstream consumers automatically pick it up. See Collection Expansion Process below.

**Deprecated object filtering:** The Query Agent is instantiated with a persistent `additional_filters` that excludes `deprecated: true` objects from all collections. This mirrors the existing behavior where deprecated objects are excluded from generation context and list views.

## Constraints

| Constraint | Detail | Impact |
|---|---|---|
| Usage limits | 1,000 Query Agent requests/month free per Weaviate Cloud organization. Search = 1 request per query. Ask = 4 requests per query. | Since the hybrid model uses Search mode only, budget is 1,000 searches/month. Sufficient for internal tool use. Must track consumption. |
| Execution time | Query Agent Search takes ~4-5 seconds (LLM planning step before querying Weaviate). Current `nearText` queries complete in <1 second. | The hybrid flow (agent retrieval + Claude synthesis) takes ~8-10 seconds total. Two-phase streaming UX is essential: progress indicator during retrieval, then Claude token streaming. |
| Inference provider API key | The Query Agent requires an API key for the inference provider powering the configured vectorizer. Current vectorizer is unknown — collections were created without explicit vectorizer configuration. | Q1 must discover the vectorizer before anything else. If Weaviate's managed embeddings (`text2vec_weaviate` / Snowflake Arctic), no extra key is needed. If `text2vec-openai` or `text2vec-cohere`, the corresponding API key must be added to `.env.local`. |
| Collection descriptions | The Query Agent reads collection-level and property-level descriptions from Weaviate to understand the data model and plan queries. Current schema has no descriptions. | Q4 migration script must add descriptions before the agent produces useful results. Description quality directly affects retrieval quality. |
| Weaviate Cloud tier | Query Agent is a Weaviate Cloud service. May require a paid tier or agent-enabled plan. | Must verify access before Q1. See Open Questions. |

## Phase 1 — Foundation (Q1–Q6)

**Q1 — Discover Vectorizer Configuration**
Write a diagnostic script (`scripts/check-vectorizer.ts`) that connects to Weaviate Cloud and reads the collection configuration for each knowledge collection. Output the vectorizer module and model in use. This determines which inference provider API key is needed for the Query Agent. If the vectorizer is Weaviate's managed embeddings, no extra key is needed. If it is `text2vec-openai`, `text2vec-cohere`, or similar, add the corresponding API key to `.env.local` and `.env.example`.

**Q2 — Install `weaviate-agents` Package**
Add `weaviate-agents` to `package.json` alongside the existing `weaviate-client` (v3.11.0+). Verify TypeScript types resolve correctly. No code changes beyond the dependency.

**Q3 — Build Collection Registry**
Create `lib/query-agent-collections.ts` — a single-source-of-truth registry of all knowledge collections available to the Query Agent. Each entry defines: collection name, human-readable description (for the agent to understand the collection's role), property descriptions (which properties contain what kind of data), and which properties the agent should view. Initial registry covers all 8 knowledge collections: Persona, Segment, UseCase, ICP, BusinessRule, Competitor, CustomerEvidence, Skill. Operational collections (Submission, ConnectedSystem, GeneratedContent) are excluded. When a new knowledge collection is added, the developer adds an entry here — see Collection Expansion Process below.

**Q4 — Migrate Collection and Property Descriptions to Weaviate**
Write a migration script (`scripts/add-collection-descriptions.ts`) that reads the registry from Q3 and updates each knowledge collection in Weaviate Cloud with the corresponding collection-level and property-level descriptions. Uses the Weaviate client's update collection definition API. Idempotent — safe to re-run. This is the single most impactful step for retrieval quality.

**Q5 — Create `lib/query-agent.ts` Wrapper**
Factory function `withQueryAgent(fn)` following the existing `withWeaviate()` pattern in `lib/weaviate.ts`. Instantiates a `QueryAgent` from `weaviate-agents` with the registered knowledge collections from Q3, applies a persistent `deprecated != true` filter across all collections, and passes the inference provider API key (discovered in Q1). Exposes two methods: `search(query, options?)` for single queries and `searchWithConversation(messages, options?)` for multi-turn queries. Options include `limit`, `collections` override, and `timeout`.

**Q6 — Validation: Side-by-Side Comparison**
Write a test script or temporary route that runs 10-15 representative queries against both the current `semanticSearchKnowledge()` in `lib/knowledge.ts` and the Query Agent Search mode. Compare: which collections were searched, how many results returned per collection, relevance ranking, whether the agent discovered cross-collection relationships the manual approach misses. Document findings. This is a go/no-go gate before building the UI — if the agent produces worse results, revisit collection descriptions (Q4) before proceeding.

## Phase 2 — Ask API (Q7–Q9)

**Q7 — `POST /api/knowledge/ask` Route**
New API route at `app/api/knowledge/ask/route.ts`. Accepts `{ question: string, conversationHistory?: { role: string, content: string }[], collections?: string[] }`. Flow:

1. Call Query Agent `.search(question)` (or `.searchWithConversation()` if history provided) to retrieve relevant objects across knowledge collections
2. Extract returned objects: name, collection type, full content, relevance score
3. Assemble a Claude system prompt instructing it to answer using ONLY the retrieved knowledge objects, cite which objects it draws from, and say so if context is insufficient
4. Stream Claude's response via `streamMessage()` from `lib/claude.ts`
5. After stream completes, append a JSON metadata block with source objects (id, name, type, score) for the UI to render citations

If the Query Agent returns zero results, skip Claude and return a structured "no results found" response.

**Q8 — Response Type Definitions**
Create `lib/ask-types.ts` with `AskRequest`, `AskResponse`, `AskSource`, and `AskConversationMessage` types. `AskSource` includes the Weaviate object ID, name, collection type, and relevance score — enough for the UI to render linked citations to `/knowledge/[id]`.

**Q9 — Usage Tracking**
Log each Query Agent request to the server console as structured JSON: timestamp, query text, collections searched (from agent response metadata), result count, retrieval latency (ms), total latency including Claude (ms). This provides visibility into the 1,000/month usage budget without requiring a database. A future enhancement could surface this in the Health Dashboard.

## Phase 3 — Ask UI (Q10–Q12)

**Q10 — `/ask` Page with Chat Interface**
New page at `app/ask/page.tsx`. Clean chat-style layout: message input at bottom, conversation history above. Each answer displays:

- The Claude-generated answer (streamed in real-time via the Q7 route)
- A "Sources" section below the answer listing each retrieved knowledge object as a clickable link to `/knowledge/[id]`, with type badge and relevance score
- A two-phase loading UX: (1) "Searching knowledge base..." indicator while the Query Agent runs (~4-5s), then (2) Claude's answer streams in token by token. This prevents the user from staring at a blank screen for 8-10 seconds.

**Q11 — Multi-Turn Conversation Support**
Maintain conversation history in client state. Each follow-up question sends the prior Q&A pairs to the Q7 route as `conversationHistory`, which passes them as `ChatMessage[]` to the Query Agent's search. Enables context-dependent follow-ups: "Tell me about the Sales persona" → "How does that compare to Marketing?" — the agent resolves "that" from conversation context. A "New conversation" button clears history.

**Q12 — Navigation Integration**
Add "Ask" to the main nav alongside Knowledge Base, Skills, Queue, Dashboard, Connections. Add a quick-ask input to the dashboard page that redirects to `/ask` with the question pre-filled.

## Phase 4 — Contextual Ask and Polish (Q13–Q16)

**Q13 — "Ask About This" on Knowledge Detail Pages**
Add an action button on `/knowledge/[id]` that opens the Ask interface pre-scoped to that object. Pre-fills the question input with the object's name and optionally passes the object's collection type in the `collections` parameter to focus the Query Agent's search. Example from a Persona page: "What use cases are most relevant to the Sales persona?"

**Q14 — "Ask About This" on Skill Detail Pages**
Same pattern for `/skills/[id]`. Enables questions like "Which knowledge objects are most relevant to the Campaign Brief Generator skill?" — useful for the [Group M](./group-m.md) knowledge-linked skills bootstrapping (M7 Suggest Links).

**Q15 — Suggested Example Questions**
When the Ask page loads with no conversation, display 3-4 example question cards. Examples: "What are the key pain points across all personas?", "Compare Enterprise and Mid-Market segments", "Which use cases relate to competitive positioning?", "Summarize our customer evidence for enterprise accounts". Clicking a card populates the input and submits the question.

**Q16 — Collection Scope Override**
Allow users to optionally restrict the search to specific collection types via a filter chip bar above the input (e.g., "Personas only", "Use Cases + Competitors"). This narrows the Query Agent's search scope for more targeted answers. Default is all knowledge collections. Chips are generated from the collection registry (Q3) so new collections appear automatically.

## Collection Expansion Process

When a new knowledge collection is added to the app, the following steps ensure the Query Agent includes it automatically:

1. **Add to registry:** Add an entry to `lib/query-agent-collections.ts` with collection name, description, property descriptions, and view properties.
2. **Run description migration:** Execute `scripts/add-collection-descriptions.ts` to push the new descriptions to Weaviate Cloud.

No code changes are needed in the Ask route, Ask UI, MCP tools, or REST API endpoints — all downstream consumers read from the registry. This process should be added to the schema change checklist in `.cursor/rules/schema-change.mdc` ([Group N](./group-n.md) N2).

## Future Directions

The following extend Group Q and are tracked here for future consideration. None are numbered tasks — they will be scoped and numbered when their prerequisite modules are built.

**Context Assembly Upgrade (Module 2 Generate prerequisite)**
Replace the per-collection `semanticSearchFirst()` calls in `lib/context-assembly.ts` with a single Query Agent Search call spanning all knowledge collections. The agent autonomously determines which collections are relevant to the generation prompt and returns ranked results. Code categorizes returned objects by type to populate system prompt sections. Adaptive retrieval with per-type soft caps (e.g., max 2 personas, max 2 segments, max 3 use cases, max 2 competitors, max 2 customer evidence, max 1 ICP) replaces the current rigid 1+1+1 structure. Caps are configurable per generation request. When a user pins a specific persona/segment/use case (GEN-3 in Module 2), pinned objects bypass the Query Agent and count against their type's cap. The `AssembledContext` return type is expanded to include the agent's search metadata (which searches it executed, relevance scores, which collections it chose) for the transparency panels (GEN-4, GEN-5).

**External Access Enhancements (MCP + REST API)**
Upgrade the MCP `search_objects` tool in `mcp-server/src/tools/search-objects.ts` to optionally use Query Agent Search mode. Add an optional `naturalLanguage: true` parameter — when true, uses the Query Agent; when false, falls back to the existing `nearText` behavior for deterministic use cases. Add a new MCP `ask_knowledge_base` tool using the hybrid pattern (Query Agent Search + Claude synthesis) with conversational follow-up support. On the REST API side, add a `?mode=agent` parameter to `GET /api/v1/knowledge/search` for backwards-compatible Query Agent search. Optionally add `POST /api/v1/knowledge/ask` for connected systems that want synthesized answers.

## Risks and Gaps

| Risk | Impact | Mitigation |
|---|---|---|
| 1,000 requests/month usage limit exceeded | Agent requests fail until next billing cycle | Track usage via Q9 logging. Search mode costs 1 request per query. For an internal tool with a small team, 1,000/month is likely sufficient. Monitor and upgrade Weaviate Cloud plan if needed. |
| ~4-5 second retrieval latency degrades UX | Users perceive the feature as slow compared to instant search | Two-phase streaming UX (Q10): show progress indicator during agent retrieval, then stream Claude tokens. Total time (~8-10s) is comparable to ChatGPT-style interactions users are accustomed to. |
| Vectorizer requires paid inference provider key | Cannot instantiate the Query Agent without the correct key | Q1 discovers the vectorizer before any other work. If Weaviate managed embeddings, no extra key needed. If third-party, budget for the API key. |
| Collection descriptions are too vague | Query Agent misroutes queries to wrong collections or misses relevant results | Q6 validation compares agent results against the existing manual search. If results are worse, iterate on descriptions (Q4) before proceeding to the UI. |
| Weaviate Cloud plan does not include agent access | Cannot use the Query Agent at all | Verify plan tier before starting Q1. See Open Questions. |
| Collection registry drifts from actual Weaviate schema | Agent searches collections that don't exist or misses new ones | Collection expansion process (above) is added to the schema change checklist (N2). Q4 migration script validates that all registry entries correspond to existing Weaviate collections. |

## Recommended Build Order

1. **Q1 → Q2** (discover vectorizer, install package) — prerequisite for everything
2. **Q3 → Q4** (registry, description migration) — prerequisite for agent quality
3. **Q5 → Q6** (wrapper, validation) — go/no-go gate
4. **Q8 → Q7 → Q9** (types, API route, usage tracking) — backend
5. **Q10 → Q11 → Q12** (Ask page, conversations, navigation) — frontend
6. **Q13 → Q14 → Q15 → Q16** (contextual ask, polish) — enhancements

Steps 1-3 are sequential (each depends on the prior). Steps 4-5 are sequential within themselves but step 4 can begin as soon as step 3 passes validation. Step 6 can begin as soon as step 5 is complete.
