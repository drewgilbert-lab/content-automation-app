> Back to [Roadmap Index](./README.md)

# Cross-Cutting Notes: Groups J and K

## K + J Data Overlap

Group K (REST API) and Group J (MCP server read tools) expose the same underlying data through different protocols — REST for HTTP clients and MCP for LLMs. Both should use the same `lib/knowledge.ts` functions as their implementation layer. Neither should duplicate query logic or maintain separate data-shaping code.

Group K is fully built. When Group J is implemented, it should reuse the same query functions (`listKnowledgeObjects()`, `getKnowledgeObject()`, `semanticSearchKnowledge()`, `listSkills()`, `getSkill()`) established during K3. If a consumer can use MCP (e.g. an AI agent), they should use Group J. If they need a standard HTTP API (e.g. a BI tool, CRM sync, or non-MCP application), they should use Group K.

## API Key Strategy

Group K implements the `ConnectedSystem` Weaviate collection with per-system API keys, including key generation, hashing, in-memory caching, and an admin UI for managing connected systems. This establishes the key management pattern for the project.

When Group J is implemented, it should extend the existing `ConnectedSystem` model rather than building a separate key system. The `permissions` field on `ConnectedSystem` (currently `["read"]` for REST API access) is extended with additional scopes (`"mcp-read"`, `"mcp-write"`) to control which tool sets are available per client. The same `apiKeyHash` validation and `globalThis` caching pattern from `lib/api-auth.ts` is reused by the MCP server's authentication layer.

**Build order:** Group K first (establishes `ConnectedSystem` schema, key management, and `lib/knowledge.ts` query functions) — **Done**. Group J second (consumes the same infrastructure).

## Weaviate-Level Access Control (Defense-in-Depth)

Both groups leverage Weaviate's built-in RBAC (v1.30+) as a defense-in-depth layer beneath application-level API key auth. Each access channel connects to Weaviate with a scoped user (`content-engine-admin`, `content-engine-api-reader`, `content-engine-mcp`) so that even if application-level authentication is bypassed, the Weaviate user limits the blast radius. See [Group K](./group-k.md) Architecture Decisions for the full user mapping.

## No User Authentication Dependency

Both groups are designed to work without end-user authentication or role-based access at the application level. The review queue is the authorization layer for writes (Group J Phase 2). Read access (Groups K, J) is protected by application-level API keys and Weaviate-level read-only users. This is appropriate for the current single-company internal tool. When user Auth/RBAC is added ([Group W](./group-w.md)), both groups should integrate with the four-role auth system (admin, editor, contributor, viewer) for per-user or per-team scoping. See [Phase 3+ backlog](./phase-3-backlog.md) for the OIDC/SSO upgrade path.

## OIDC/SSO Upgrade Path

The current API key authentication model (Group K `ConnectedSystem`, Group J API keys) is designed to be replaceable when user authentication is added. The upgrade path:

1. **Phase 1 (current):** Application-level API keys per connected system + Weaviate-level RBAC per access channel. No end-user authentication.
2. **Phase 3+:** Add OIDC integration (Okta, Auth0, Azure AD, or Keycloak) for the web UI. Internal routes (`/api/knowledge`, `/api/skills`, etc.) are protected by session-based auth. External API keys (`/api/v1/`) continue working alongside OIDC — connected systems use API keys, human users use OIDC tokens.
3. **Future:** Extend OIDC groups to Weaviate RBAC for end-to-end identity propagation. A user's OIDC group membership determines their Weaviate role, enabling per-team access scoping across all channels.

No implementation is needed now. The key design constraint is that `lib/api-auth.ts` and `lib/api-middleware.ts` should accept both API keys and Bearer tokens, so the auth layer can be extended without rewriting route handlers.

## Query Agent and Collection Descriptions

Group Q introduces collection-level and property-level descriptions to Weaviate (Q4). These descriptions benefit all search pathways — not just the Query Agent. The REST API semantic search (`semanticSearchKnowledge()`), MCP `search_objects` tool, and context assembly (`lib/context-assembly.ts`) all query the same Weaviate collections. Richer descriptions improve Weaviate's understanding of the data model, which can improve vector search quality across the board.

The collection registry (`lib/query-agent-collections.ts`, Q3) becomes the canonical source for collection metadata. Any group that adds a new knowledge collection must update the registry per the Group Q Collection Expansion Process: add a registry entry, then run the description migration script. This requirement should be added to the schema change checklist in `.cursor/rules/schema-change.mdc` (Group N2).
