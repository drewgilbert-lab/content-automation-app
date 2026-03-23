> Back to [Roadmap Index](./README.md)

# Phase 3+ — Backlog

Items below are recognized but not yet scheduled. They will be promoted to a phase when prioritized.

## Business Rules to Author

The following `business_rule` objects are planned but not yet created. They will be authored and added to Weaviate via the Knowledge Base UI.

| Rule | Description |
|---|---|
| Tone Guide | Defines overall brand voice — direct, confident, data-driven, human |
| Competitor Policy | How (or whether) to reference competitors by name |
| Claim Standards | Which claims require data backing vs. can be stated generally |
| CTA Standards | Approved CTA language and what to avoid |
| Prohibited Terms | Words or phrases to never use |

## Infrastructure & Integrations

| Item | Notes |
|---|---|
| Vercel deployment | ✅ Done (March 3, 2026). Production: `https://content-automation-app-zeta.vercel.app`. GitHub repo `drewgilbert-lab/content-automation-app` connected, auto-deploys on push to main. Upload sessions migrated to Upstash Redis for serverless compatibility (ADR-017). Data-fetching pages marked `force-dynamic` (ADR-016). `vercel.json` with security headers for `/api/v1/` routes. |
| Auth / RBAC | Now scoped as [Group W](./group-w.md) — Authentication & User Management. Google OAuth sign-in, RBAC with admin/editor/contributor/viewer roles, admin user management UI, permission sets. Replaces the earlier OIDC-only plan with a concrete phased approach. External API keys (Group K) and MCP keys (Group J) continue working alongside user auth. See [Group W](./group-w.md) and [Cross-Cutting Notes](./cross-cutting.md): OIDC/SSO Upgrade Path. |
| Internal API route protection | All internal routes (`/api/knowledge`, `/api/skills`, `/api/submissions`, `/api/dashboard`, `/api/connections`, `/api/bulk-upload`) currently have zero authentication. Accepted risk for the current single-user internal tool. Protected when Group W is implemented (W2 — Session Middleware and Route Protection). |
| External integrations | CRM, MAP, social platforms — future consideration. Groups J and K provide the programmatic access layer for building these integrations. |
| Databricks sync | Canonical account/segment data may already exist in Databricks; a sync pipeline (Databricks → Weaviate) could replace manual entry |
| MCP server hosting | Group J requires a long-running Node.js process (standalone from Vercel). Options: Railway, Fly.io, dedicated Vercel Fluid Compute. Decision needed before implementation. |
| API key management | Groups J and K need API key auth. Group K implements the `ConnectedSystem` collection with per-system keys, hashing, caching, and admin UI. Group J extends the same model with additional permission scopes (`mcp-read`, `mcp-write`). See [Cross-Cutting Notes](./cross-cutting.md): API Key Strategy. |
| Rate limiting infrastructure | Upstash Redis for serverless-compatible rate limiting. Code is written and tested. Production configuration tracked in [Group Y](./group-y.md) — requires `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` environment variables in Vercel. MCP server (Group J) implements in-process rate limiting. |
| CI/CD Pipeline | Now scoped as [Group Z](./group-z.md). GitHub Actions workflow for automated testing on push to main and PRs. 121 tests exist and pass locally; need to run automatically. See [Group Z](./group-z.md). |
