# Content Engine — Changelog

> Newest entries first. Last updated: March 24, 2026

---

## 2026-03-24

### Group AA Phase 2 — Navigation Shell and App Chrome (AA5–AA9)

- **AA5 — Sidebar Navigation Component**: Created `app/components/layout/sidebar-nav.tsx` with fixed left sidebar, 4 nav groups (Core, Operations, Intelligence, Admin), Lucide icons, active state highlighting via `usePathname()`, admin-only group conditional rendering via `useRole()`, "Content Engine by HG Insights" wordmark, and user role indicator.
- **AA6 — App Shell Layout**: Created `app/components/layout/app-shell.tsx` wrapping sidebar + main content area. Integrated into root `app/layout.tsx`. Auth pages (`/auth/*`) excluded from shell and render full-page.
- **AA7 — Top Bar Component**: Created `app/components/layout/top-bar.tsx` with URL-derived breadcrumbs, `RoleToggle` and `UserMenu` migrated from per-page headers into global top bar.
- **AA8 — Accent Bar**: Added 4px `bg-hg-blue` fixed accent bar at top of viewport in root layout. Visible on all pages including sign-in, matching HG branded deliverable pattern.
- **AA9 — Phase 2 Validation**: `npm run build` passes. Sign-in page confirmed rendering without sidebar (full-page layout). All semantic token replacements verified. No lint errors.

**Page migration**: All 25 `page.tsx` files updated — removed `<main>` wrappers (shell provides background), removed per-page `RoleToggle`/`UserMenu` (top bar), removed back links (sidebar navigation), replaced raw `gray-*`/`blue-*` Tailwind classes with semantic tokens (`bg-surface-card`, `text-text-primary`, `border-border-default`, `bg-action-primary`, etc.). Home page converted from navigation card grid to dashboard landing with system status card.
**New files**: `app/components/layout/sidebar-nav.tsx`, `app/components/layout/app-shell.tsx`, `app/components/layout/top-bar.tsx`
**Modified files**: `app/layout.tsx`, 25 `page.tsx` files, `package.json`
**Dependency added**: `lucide-react`
**Documentation**: `docs/roadmap/group-aa.md` (AA5–AA9 marked done), `docs/roadmap/README.md` (AA status updated), `docs/SCOPE.md` (status updated), `docs/CHANGELOG.md` (this entry).
**User guide update**: N/A — navigation shell is an internal UI infrastructure change; no new user-facing workflow requiring guide updates.

---

### Group AA Phase 1 — Token Migration and Brand Foundation (AA1–AA4)

- **AA1 — Update Semantic Token Values**: Replaced all semantic color tokens in `app/globals.css` from generic Tailwind gray/blue primitives to HG-branded navy-tinted dark palette. Surfaces now use navy-tinted hex values (`#0B1121`, `#162032`, `#243550`). Text tokens use Slate scale with blue undertone. Status background tints reduced from 15% to 12% opacity. Removed `border-hover` and `text-link` tokens.
- **AA2 — Add New Brand Tokens**: Added 4 new tokens: `hg-blue` (`#2563EB`), `hg-blue-bright` (`#60A5FA`), `hg-blue-muted` (`#93C5FD`), `surface-active` (blue tint at 10% opacity).
- **AA3 — Update DESIGN_TOKENS.md**: Rewrote design token documentation with new hex values, WCAG contrast ratios for every text/surface combination, brand reference section, and usage constraints.
- **AA4 — Phase 1 Validation**: Build passes (`npm run build` zero errors). Token audit confirms no broken references to removed tokens. All 4 new tokens verified in `@theme inline` block.

**Modified files:** `app/globals.css`, `app/components/ui/button.tsx`, `app/skills/components/skill-detail-actions.tsx`, `docs/DESIGN_TOKENS.md`
**Tokens removed:** `border-hover` (→ use `border-focus`), `text-link` (→ use `hg-blue-bright`)
**Tokens added:** `hg-blue`, `hg-blue-bright`, `hg-blue-muted`, `surface-active`
**Documentation:** `docs/DESIGN_TOKENS.md` (full rewrite), `docs/roadmap/group-aa.md` (AA1–AA4 marked done), `docs/roadmap/README.md` (Group AA added to status table), `docs/CHANGELOG.md` (this entry).
**User guide update:** N/A — token value changes are internal infrastructure with no user-facing behavior change requiring guide updates.

---

### Group S Phase 2 — Shared Atom Components (S3.5–S9)

- **S3.5 — Install Headless UI**: Added `@headlessui/react` as project dependency. Foundation for Phase 3-4 organisms (Dialog, Tabs). Build verified.
- **S4 — Button Component**: Created `app/components/ui/button.tsx` — polymorphic button with 4 variants (primary, secondary, danger, ghost), 2 sizes (sm, md), loading state with spinner, disabled styling. Uses semantic tokens via `cn()`.
- **S5 — Input, Select, Textarea Components**: Created `app/components/ui/input.tsx`, `select.tsx`, `textarea.tsx` — `forwardRef` wrappers around native HTML elements with consistent styling (semantic tokens for surfaces, borders, text) and `error` prop for validation states.
- **S6 — FormField Component**: Created `app/components/ui/form-field.tsx` — label + input wrapper with optional help text and error text. Error text replaces help text when present.
- **S7 — Badge Component**: Created `app/components/ui/badge.tsx` — unified badge with 6 variants (default, success, warning, danger, info, purple), 2 sizes (sm, md). Updated `app/knowledge/components/type-badge.tsx` to be a thin wrapper around Badge with per-type color overrides. Updated `app/bulk-upload/components/confidence-badge.tsx` to use Badge internally.
- **S8 — Migration**: Migrated 5 existing components to use shared atoms: `connection-form.tsx` (Button, Input, Select, Textarea, FormField, cn()), `skill-detail-actions.tsx` (Button, cn()), `content-diff.tsx` (cn()), `document-review-card.tsx` (Button, Input, Select, cn()), `confidence-badge.tsx` (Badge). Toggle chips and hand-rolled confirm modal left as-is (Phase 4 scope).
- **S9 — Validation**: Build passes, TypeScript clean (no new errors), zero lint errors on all new/modified files, browser smoke test confirmed sign-in page renders correctly with dark theme and Geist Sans font.

**New files:** `app/components/ui/button.tsx`, `app/components/ui/input.tsx`, `app/components/ui/select.tsx`, `app/components/ui/textarea.tsx`, `app/components/ui/form-field.tsx`, `app/components/ui/badge.tsx`
**Modified files:** `app/knowledge/components/type-badge.tsx`, `app/bulk-upload/components/confidence-badge.tsx`, `app/connections/components/connection-form.tsx`, `app/skills/components/skill-detail-actions.tsx`, `app/queue/components/content-diff.tsx`, `app/bulk-upload/components/document-review-card.tsx`, `package.json`
**Documentation:** `docs/DESIGN_TOKENS.md` (component usage examples), `docs/roadmap/group-s.md` (S3.5–S9 marked done), `docs/roadmap/README.md` (Group S status), `docs/CHANGELOG.md` (this entry).
**User guide update:** N/A — design system atoms are internal infrastructure with no user-facing behavior change.

---

## 2026-03-24

### Group Y — Production Redis Configuration (Y1–Y4)

- **Y1 — Upstash Redis Account and Database Setup**: Provisioned Upstash Redis database (free tier, us-east-1 region) for production use.
- **Y2 — Vercel Environment Variable Configuration**: Added `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel project for Production and Preview environments.
- **Y3 — Production Validation**: Created integration test suite at `__tests__/integration/redis-validation.test.ts` with 14 tests covering Redis session round-trips, rate limit enforcement (standard/elevated/search tiers), graceful fallback behavior, and rate limit header contract.
- **Y4 — Update .env.example and Documentation**: Updated `.env.example` to document Redis vars for both rate limiting and upload session persistence. Added ADR-022 to `docs/TECH_DECISIONS.md`. Updated roadmap files.

**New files:** `__tests__/integration/redis-validation.test.ts`
**Modified files:** `.env.example`, `docs/TECH_DECISIONS.md`, `docs/roadmap/group-y.md`, `docs/roadmap/README.md`, `docs/SCOPE.md`, `docs/CHANGELOG.md`
**Documentation:** `docs/TECH_DECISIONS.md` (ADR-022), `docs/roadmap/group-y.md` (Y1–Y4 marked done), `docs/roadmap/README.md` (Group Y status), `docs/SCOPE.md` (status update), `docs/CHANGELOG.md` (this entry). User guides: N/A (Redis is infrastructure, no user-facing behavior change).

---

## 2026-03-24

### Group S Phase 1 — Infrastructure Fixes and Semantic Tokens (S1–S3)

- **S1 — Fix Font Stack and Remove Dead Code**: Removed `font-family: Arial, Helvetica, sans-serif` from `body` in `app/globals.css` so Geist Sans renders via `--font-sans`. Removed light-mode `:root` values (`#ffffff`, `#171717`) and `@media (prefers-color-scheme: dark)` block. Removed unused `--color-background` and `--color-foreground` theme tokens. App is now dark-mode-only with clean `:root`.
- **S2 — Semantic Design Token Layer**: Added 30+ semantic design tokens to `app/globals.css` via `@theme inline`: surfaces (`surface-page`, `surface-card`, `surface-input`, `surface-overlay`), borders (`border-default`, `border-hover`, `border-focus`), text (`text-primary`, `text-secondary`, `text-tertiary`, `text-muted`, `text-link`), actions (`action-primary`, `action-primary-hover`, `action-danger`, `action-danger-hover`), status (`status-success`, `status-warning`, `status-danger`, `status-info` with `-bg` tint variants), spacing (`page-x`, `page-y`), sizing (`content-max`, `sidebar`), and radii (`sm`, `card`, `pill`). All tokens available as Tailwind utility classes.
- **WS5-001 — cn() Utility**: Installed `clsx` + `tailwind-merge`. Created `lib/utils.ts` with shared `cn()` class composition helper.
- **WS5-002 — Prettier Tailwind Plugin**: Installed `prettier` + `prettier-plugin-tailwindcss`. Created `.prettierrc` config for deterministic Tailwind class ordering.
- **S3 — Validation**: Build passes, no linter errors, all tokens resolve, font stack correct, dead code removed.

**New files:** `lib/utils.ts`, `docs/DESIGN_TOKENS.md`, `.prettierrc`
**Modified files:** `app/globals.css`, `package.json`
**Documentation:** `docs/DESIGN_TOKENS.md` (new — full token reference), `docs/TECH_DECISIONS.md` (ADR-021), `docs/SCOPE.md` (status update), `docs/roadmap/group-s.md` (S1–S3 marked done), `docs/roadmap/README.md` (Group S status), `docs/CHANGELOG.md` (this entry).

---

## 2026-03-24

### Group W Phase 3 — Advanced Access Control (W8–W9)

- **W8 — Permission Sets (Custom Roles)**: Created `lib/permission-set-types.ts` with `PermissionSetRecord`, `PermissionSetCreateInput`, `PermissionSetUpdateInput`, and `DEFAULT_PERMISSION_SETS`. Created `lib/permission-sets.ts` with Weaviate `PermissionSet` collection CRUD, 5-minute `globalThis` cache, name uniqueness enforcement, built-in set deletion protection, and automatic seed of 4 default sets on collection creation. Updated `lib/user-types.ts` to add `permissionSetId` to `UserRecord` and `UserUpdateInput`. Updated `lib/users.ts` to include `permissionSetId` in User collection schema, `mapToUserRecord`, and `updateUser`. Updated `lib/permissions.ts` with `ALL_PERMISSIONS`, `resolvePermissions(user)` (checks `permissionSetId` first, falls back to role matrix), and `userHasPermission(user, permission)`. Updated `lib/auth-server.ts` with `requirePermission(permission)`. Created `app/api/admin/roles/route.ts` (GET list, POST create — admin only, audit logged) and `app/api/admin/roles/[id]/route.ts` (GET detail, PATCH update, DELETE with built-in deletion protection — admin only, audit logged). Created `/admin/roles` page with permission set list, `/admin/roles/new` with permission checkbox grid form, and `/admin/roles/[id]/edit` with edit form (built-in sets: name disabled). Updated `/admin/users` page with permission set assignment dropdown and admin nav links.
- **W9 — Audit Log for Auth Events**: Created `lib/audit-types.ts` with `AuditEventType` union (9 event types), `AuditLogRecord`, `AuditLogCreateInput`, and `AUDIT_EVENT_LABELS`. Created `lib/audit.ts` with Weaviate `AuditLog` collection, fire-and-forget `logAuditEvent()`, and `listAuditEvents()` with filtering and pagination. Created `app/api/admin/audit/route.ts` (GET paginated list — admin only, type/actor filters). Created `/admin/audit` page with event timeline, type/actor filters, color-coded badges, and pagination. Updated `lib/auth.ts` to instrument signIn callback (logs `sign_in`/`sign_in_failed`) and added `events.signOut` handler (logs `sign_out`). Updated `app/api/admin/users/[id]/route.ts` with audit logging for `role_change`, `user_activated`, `user_deactivated`, and `permissionSetId` support.
- **New Weaviate collections**: `PermissionSet` (name, description, permissions, isBuiltIn, timestamps; no vectorizer; 4 built-in sets seeded) and `AuditLog` (eventType, actorEmail, actorName, targetEmail, targetId, details, ipAddress, timestamp; no vectorizer). Added `permissionSetId` text property to User collection.

**Documentation:** `docs/KNOWLEDGE_BASE.md` (PermissionSet + AuditLog collection schemas, User schema update), `docs/API.md` (permission set + audit admin routes), `docs/TECH_DECISIONS.md` (ADR-020 permission set architecture), `docs/SCOPE.md` (Auth module status), `docs/roadmap/group-w.md` (W8–W9 marked complete), `docs/roadmap/README.md` (Group W status updated), `docs/user-guides/authentication.md` (permission sets + audit log sections), `docs/CHANGELOG.md` (this entry).

---

## 2026-03-23

### Group W Phase 2 — Role-Based Access Control (W5–W7)

- **W5 — Permission Model**: Created `lib/permissions.ts` with typed permission matrix and role-permission mapping. Migrated all internal API routes from `requireAuth()` to `requireRole()` with appropriate minimum roles (viewer/contributor/editor/admin). Updated client-side `RoleProvider` to fetch real user role from server via `/api/auth/me`. `RoleToggle` now displays the authenticated user's role badge.
- **W6 — Admin User Management UI**: Built `GET /api/admin/users` and `PATCH /api/admin/users/[id]` routes (admin-only). Created `/admin/users` page with user table, role dropdowns, activate/deactivate toggle, search by name/email, self-demotion protection, and mobile-responsive card layout. Added User Management nav card to dashboard.
- **W7 — User Attribution**: Added `createdBy`/`updatedBy` fields to knowledge object types and CRUD functions. Added `reviewedBy` to submission types and review workflow. Added `updatedBy` to skill types and update functions. All mutating API routes now pass the session user's email into CRUD operations. Knowledge detail, skill detail, and submission review pages display attribution metadata.

### 2026-03-23 — Fix: Railway Build

- Reverted `lib/skills.ts` import from `@/lib/weaviate.ts` to `./weaviate` to fix `tsconfig.lib.json` compilation failure
- Removed `.ts` extensions from Group M test file mocks and imports to match established conventions
- Removed `allowImportingTsExtensions` flag from `tsconfig.json` (no longer needed)

### Group W Phase 1 — Authentication Foundation (W1–W4) — March 23, 2026

**W1 — NextAuth.js Integration with Google Provider:**
- Installed `next-auth@beta` (Auth.js v5) with Google OAuth provider.
- Created `app/api/auth/[...nextauth]/route.ts` for Auth.js route handling (GET, POST).
- Created `lib/auth.ts` with Auth.js configuration: Google provider, JWT session strategy (1-hour maxAge), domain restriction via `ALLOWED_DOMAINS`/`ALLOWED_EMAILS` env vars.
- Exports: `handlers`, `auth`, `signIn`, `signOut`, `requireAuth()`, `requireRole()`, `getCurrentUser()`.
- Created sign-in page at `app/auth/signin/page.tsx` (server component, dark theme, error handling) with `app/auth/signin/signin-button.tsx` (Google sign-in button, client component).

**W2 — Session Middleware and Route Protection:**
- Created `middleware.ts` using Auth.js `auth()` wrapper. Redirects unauthenticated page requests to `/auth/signin`. Returns 401 JSON for unauthenticated API requests. Public paths: `/auth/*`, `/api/auth/*`, `/api/v1/*`.
- Added `requireAuth()` import and call to all 33 internal API route files (`/api/knowledge`, `/api/skills`, `/api/submissions`, `/api/dashboard`, `/api/connections`, `/api/bulk-upload`, `/api/chat`, `/api/content-workflow`).
- External API routes (`/api/v1/*`) unaffected — continue using API key auth (Group K).

**W3 — User Session UI:**
- Created `app/components/session-provider.tsx` (SessionProvider wrapper, client component) and `app/components/user-menu.tsx` (UserMenu dropdown with avatar, name, sign out).
- Updated `app/layout.tsx` to wrap content with SessionProvider alongside existing RoleProvider.
- Updated `app/page.tsx` to show UserMenu alongside RoleToggle in header.

**W4 — User Record Creation:**
- Created `lib/user-types.ts` with `UserRole` type (`"admin"|"editor"|"contributor"|"viewer"`), `UserRecord` interface, `UserCreateInput`, `UserUpdateInput`, `ROLE_HIERARCHY`, `VALID_ROLES`, `isValidRole()`, `hasMinimumRole()`.
- Created `lib/users.ts` with User CRUD using Weaviate (`withWeaviate` pattern): auto-creates `User` collection on first sign-in, `getOrCreateUser()` (first user = admin or honors `ADMIN_EMAIL`), `getUserByEmail()`, `getUserById()`, `listUsers()`, `updateUser()`, `updateUserRole()`, `deactivateUser()`, `activateUser()`, `getUserCached()`/`refreshUserCache()`/`invalidateUserCache()` with 5-minute TTL `globalThis` cache.
- New `User` Weaviate collection (non-vectorized): email, name, avatarUrl, role, active, lastLoginAt, createdAt, updatedAt.

**Environment variables added:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ALLOWED_DOMAINS`, `ALLOWED_EMAILS`, `ADMIN_EMAIL` (added to `.env.example`).

**Dependency added:** `next-auth@beta` in `package.json`.

**Documentation:** `docs/KNOWLEDGE_BASE.md` (User collection schema), `docs/API.md` (auth section and endpoints), `docs/TECH_DECISIONS.md` (ADR-019), `docs/SCOPE.md` (Authentication module status), `docs/roadmap/group-w.md` (W1–W4 marked complete), `docs/roadmap/README.md` (Group W status updated), `docs/user-guides/authentication.md` (new user guide), `docs/CHANGELOG.md` (this entry).

---

### Group W Documentation — 4-Role RBAC Model — March 23, 2026

Updated the Group W (Authentication & User Management) roadmap and all related documentation to replace the 3-role model (Admin, Contributor, Viewer) with a 4-role model:

- **Admin** — Full platform access: user management, system configuration, connected systems, plus all Editor permissions.
- **Editor** — Content governance: review/approve/reject submissions, AI merge, direct create/edit without review queue.
- **Contributor** — Content submission: create/edit via review queue, bulk upload, view content.
- **Viewer** — Read-only: browse knowledge, skills, narratives, cost dashboard.

Files updated: `docs/roadmap/group-w.md` (permission matrix, W4 User collection schema, W5 permission model, W8 custom roles), `docs/roadmap/README.md`, `docs/roadmap/phase-3-backlog.md`, `docs/roadmap/cross-cutting.md`, and six user guides (`getting-started`, `review-queue`, `managing-knowledge`, `knowledge-base`, `ai-merge`, `enhanced-review`).

---

### Group M — Knowledge-Linked Skills — March 23, 2026

**M1 — sourceKnowledgeObjects Field:**
- Added `SkillKnowledgeLink` type and `sourceKnowledgeObjects` optional field to Skill types (`SkillDetail`, `SkillCreateInput`, `SkillUpdateInput`).
- `lib/skills.ts` reads/writes JSON-serialized link arrays to Weaviate Skill collection.
- Skill API PUT route validates link structure (id, collection, non-empty integrationPrompt).

**M2 — Skill UI for Managing Knowledge Links:**
- Skill detail page shows "Linked Knowledge Objects" section with object name links, type badges, and integration prompts.
- Skill form includes dynamic link management: search knowledge objects, add/remove links, edit integration prompts with validation.

**M3 — buildSkillRefreshPrompt:**
- Added `buildSkillRefreshPrompt()` to `lib/merge.ts` for AI-assisted skill updates. Preserves procedural structure while updating knowledge-referenced facts.

**M4 — Materiality Evaluation:**
- Added `evaluateSkillRefreshSignificance()` to `lib/skills.ts`. Lightweight Claude call to assess whether a knowledge object change warrants a skill update suggestion.

**M5 — System-Generated Skill Refresh Submissions:**
- Extended `SourceChannel` with `"system"` and created `SubmissionObjectType = KnowledgeType | "skill"`.
- `reviewSubmission` accept path now routes skill submissions to `updateSkill()`.
- Added `triggerSkillRefreshCheck()` as fire-and-forget hook after knowledge object acceptance.
- Trigger hooks added to merge/save and review routes.

**M6 — Review Queue Support for Skill Submissions:**
- Merge route uses `buildSkillRefreshPrompt` for skill submissions.
- Queue list shows "Skill" type badge and "System" source channel badge.
- Queue detail loads skills and shows skill refresh context (current skill content, updated knowledge object, integration prompt).
- Dashboard shows pending system-generated skill submission count.

**M7 — Suggested Links via Semantic Similarity:**
- Added `POST /api/skills/[id]/suggest-links` endpoint using Weaviate `nearText` across all knowledge collections.
- `SuggestLinks` component on skill detail page with accept/dismiss actions per suggestion.
- Accept pre-populates skill edit form with the suggested link.

**Tests:** 7 new test files (28 tests) covering link serialization, merge prompts, significance evaluation, trigger logic, submission routing, suggest-links, and merge route branching.

**User guide update:** N/A — Knowledge-linked skills is an internal admin workflow feature; no new end-user guide required. Existing skill management patterns are extended in-place.

---

### Workflows UI Test Harness — March 18, 2026

- Enabled the existing **Workflows** home module card and added a minimal `/workflows` page to manually test content-workflow APIs in-app.
- The page supports create run, start run, refresh status, load run detail, and load package with JSON response panels and basic error/loading states.
- Added light UX hardening for run ID validation, stale panel clearing on run switch, and clearer package-not-ready messaging.
- Verification completed with lint + API test pass and smoke flow (create/start/status/package) against local dev server.
- Documentation updated: `docs/roadmap/group-content-workflow.md`, `docs/API.md`, `docs/CHANGELOG.md`.
- User guide update: N/A (internal test harness only; no end-user feature workflow).

---

### Content Workflow CW20–CW21 — Test Matrix and Documentation — March 17, 2026

**CW20 — Test matrix (unit/integration/e2e):**
- Added CW20 test matrix coverage in content workflow test files: lifecycle transitions, retries, branch isolation, fan-in validation, artifact type validation, and lineage integrity.
- All content-workflow tests pass.

**CW21 — Documentation updates:**
- Marked CW20 and CW21 complete in `docs/roadmap/group-content-workflow.md` with action-level completion markers.
- Updated `docs/roadmap/README.md`: Content Workflow status now reflects CW20–CW21 done with CW11–CW19 still pending in roadmap tracking.
- Updated `docs/API.md`: Content Workflow routes header CW1–CW21; added test matrix status note.
- Updated `docs/BUSINESS_LOGIC.md`: CW20/CW21 test and validation coverage note; refreshed last-updated.
- Updated `docs/CHANGELOG.md` (this entry).

**User guide update:** N/A — Content workflow is internal orchestration; no end-user UI or user guide exists yet.

---

### Content Workflow CW17–CW19 — Budget Enforcement, Telemetry, Failure Operations — March 17, 2026

**CW17 — Context/token budget enforcement:**
- Added `lib/content-workflow-budget.ts` with `TokenBudgetPolicy`, `BudgetExceedPolicy` (truncate/summarize/fail), `enforceTextBudget()`, `enforceArtifactOutputBudget()`.
- Step-level and artifact-level token budgets with per-type policies.
- Extended `lib/content-workflow-types.ts` with step token budget/usage and replay metadata fields.
- Extended `lib/content-workflow-artifacts.ts` with artifact output budget enforcement metadata.
- Orchestrator and executor propagate execution metrics and enforce step budgets.

**CW18 — Structured logging and metrics:**
- Added `lib/content-workflow-telemetry.ts` with `logWorkflow()`, `listWorkflowLogs()`, `getWorkflowMetricsSnapshot()`.
- Structured JSON logs to stdout with `scope: "content-workflow"`; in-memory per-run aggregation for diagnostics.
- Added `GET /api/content-workflow/metrics` returning active runs by status, average duration, branch failure rates, top failing steps, token usage by branch.

**CW19 — Failure operations and replay tools:**
- Added `GET /api/content-workflow/runs/failed` listing failed runs with diagnostics.
- Added `GET /api/content-workflow/runs/[id]/diagnostics` returning failed branches, failed steps, and logs.
- Extended `POST /api/content-workflow/runs/[id]/retry` to accept `replayFromStepId`, `reason`, `requestedBy` for replay-from-checkpoint and audit metadata.
- Store: `listWorkflowRuns()`, `updateRunReplayMetadata()` for replay support.

**Documentation:** `docs/roadmap/group-content-workflow.md` (CW17–CW19 marked complete), `docs/roadmap/README.md`, `docs/API.md` (metrics, failed, diagnostics, retry payload), `docs/BUSINESS_LOGIC.md` (budget policy), `docs/TECH_DECISIONS.md` (ADR-018 workflow telemetry), `docs/CHANGELOG.md`.
- User guide update: N/A (internal orchestration APIs; no end-user UI for content workflow yet).

---

### Content Workflow CW14–CW16 — Fan-In Validation, Final Package Assembly, Package API — March 17, 2026

**CW14 — Branch aggregate validators:**
- Added `lib/content-workflow-validators.ts` with `validateBranchAggregateArtifacts()`.
- Strict validation before fan-in: each branch must have its required aggregate artifact (functionality_content_brief, competitor_persona_messaging_content_brief, market_content_brief).
- Returns explicit error summary on validation failure.

**CW15 — Final package assembler:**
- Added `lib/content-workflow-assembler.ts` with `assembleFinalPillarPackage()` and `getLatestFinalPillarPackage()`.
- Persists `final_pillar_package` artifact with lineage `parentArtifactIds` pointing to the three branch aggregates.
- Payload includes `functionalityBriefRef`, `personaMessagingBriefRef`, `marketBriefRef`, and `finalAggregationRef`.

**CW16 — Downstream handoff contract:**
- Orchestrator `finalizeRun` validates branch aggregates, assembles package, fails with explicit error summary on validation/assembly failure, and emits `run.package_assembled` event.
- Added `GET /api/content-workflow/runs/[id]/package` returning latest final package payload + artifact metadata for downstream workflows (e.g. Group R narratives).

**Testing:**
- Added `__tests__/lib/content-workflow-validators.test.ts`, `__tests__/lib/content-workflow-assembler.test.ts`.
- Updated orchestrator and content-workflow API tests.

**Documentation:** `docs/roadmap/group-content-workflow.md` (CW14–CW16 marked complete), `docs/API.md` (package endpoint), `docs/BUSINESS_LOGIC.md` (fan-in validation, assembly, handoff), `docs/CHANGELOG.md`.
- User guide update: N/A (internal orchestration; no end-user UI for content workflow yet).

---

### Content Workflow CW11–CW13 — Branch Implementations — March 17, 2026

**CW11 — Branch A (competitor functionality):**
- Added `lib/content-workflow-branches.ts` with concrete step handlers for transcript/shared extraction, competitor fan-out (concurrency limit 5), and branch aggregate creation.
- Branch A flow: transcript research → extraction → per-competitor jobs → aggregate functionality brief.

**CW12 — Branch B (competitor personas + messaging):**
- Implemented end-to-end B flow with branch-specific template family.
- Per-competitor persona/messaging research and aggregate brief creation.

**CW13 — Branch C (market research):**
- Implemented market workflow as independent branch.
- Market branch draft/final brief flow.

**Orchestrator updates:**
- Updated `lib/content-workflow-orchestrator.ts` to auto-register default branch step handlers on start/retry.
- Reset handler registration on `_clearWorkflowStepHandlers`.

**Testing:**
- Added `__tests__/lib/content-workflow-branches.test.ts`.
- Updated `__tests__/lib/content-workflow-orchestrator.test.ts`.

**Documentation:** `docs/roadmap/group-content-workflow.md` (CW11–CW13 marked complete), `docs/roadmap/README.md`, `docs/CHANGELOG.md`.
- User guide update: N/A (internal orchestration; no end-user UI for content workflow yet).

---

### Content Workflow CW8–CW10 — Orchestration Core — March 17, 2026

**CW8 — Parent run orchestrator (`lib/content-workflow-orchestrator.ts`):**
- Added orchestration entrypoint with fan-out branch execution and fan-in completion/failure transitions.
- Added structured workflow lifecycle events (`run.*`, `branch.*`, `step.*`, `retry.accepted`) via `lib/content-workflow-events.ts`.

**CW9 — Step scheduler and dependency resolver:**
- Added deterministic branch plans and step ordering per branch type.
- Added dependency-aware `blocked`/`pending` reconciliation and guarded branch progression.

**CW10 — Retry/timeout/idempotency framework:**
- Added shared execution wrapper in `lib/content-workflow-executor.ts` with timeout policy classes, exponential backoff retries, and deterministic fail-fast handling.
- Added retry APIs and orchestration APIs: `POST /api/content-workflow/runs/:id/start`, `GET /api/content-workflow/runs/:id/events`, `POST /api/content-workflow/runs/:id/retry`.
- Extended run/branch transition rails to support retry from failed states.

**Testing:**
- Added and passed targeted suites for executor, orchestrator, and API routes:
  - `__tests__/lib/content-workflow-executor.test.ts`
  - `__tests__/lib/content-workflow-orchestrator.test.ts`
  - `__tests__/api/content-workflow-runs.test.ts`
- Full content-workflow suite pass (35 tests) covering unit + integration/API flow.

**Documentation:**
- Updated `docs/API.md`, `docs/roadmap/group-content-workflow.md`, `docs/roadmap/README.md`, and `docs/CHANGELOG.md`.
- User guide update: N/A for this change set (internal orchestration and API capability; no end-user UI behavior changed yet).

---

### Content Workflow CW5–CW7 — Template and Prompt Layer — March 17, 2026

**CW5 — Template registry and version management (`lib/content-workflow-templates.ts`):**
- Template registry APIs: `registerTemplateVersion`, `listTemplateVersions`, `getTemplateVersion`, `getActiveTemplateVersion`, `setActiveTemplateVersion`, `seedDefaultWorkflowTemplates`.
- Rendered prompt snapshots persisted as `prompt_rendered` artifacts.

**CW6 — Rendered prompt artifact generation:**
- Render and integrity APIs: `renderPromptTemplate`, `extractTemplatePlaceholders`, `ensureNoUnresolvedPlaceholders`, `buildPromptArtifactName`, `persistRenderedPromptArtifact`.
- Variable binding, validation, and artifact naming conventions.

**CW7 — Prompt integrity checks:**
- `PromptIntegrityError` with non-retryable fail-fast codes.
- `validateArtifactFields` in `lib/content-workflow-types.ts` enforces `prompt_rendered` payload metadata: `renderedBody`, `templateKey`, `templateVersion`, `renderHash`, `namingConventionKey`, `variables`.

**Tests:** Targeted content-workflow test suites pass (`content-workflow-templates.test.ts`, `content-workflow-types.test.ts`).

**Documentation:** `docs/roadmap/group-content-workflow.md` (CW5–CW7 marked implemented), `docs/CHANGELOG.md` (this entry).

---

### Content Workflow CW1–CW4 — Foundation and Data Model — March 17, 2026

**CW1 — Run/branch/step/artifact types (`lib/content-workflow-types.ts`):**
- Canonical `ArtifactType` union and artifact payload map.
- Lifecycle/status enums and transition helpers for run, branch, and step.
- Validation helpers for run creation and artifact required metadata.

**CW2 — Durable workflow run store (`lib/content-workflow-store.ts`):**
- Redis + in-memory fallback pattern (aligned with `lib/upload-session.ts`).
- Parent run create/get/status transition/cancel support.
- Branch and step persistence/indexing and default branch seeding.
- Idempotency-key deduplication support.

**CW3 — Workflow APIs (`app/api/content-workflow/`):**
- `POST /api/content-workflow/runs` — create parent run.
- `GET /api/content-workflow/runs/:id` — full run snapshot with artifacts.
- `GET /api/content-workflow/runs/:id/status` — status summary for polling.
- `POST /api/content-workflow/runs/:id/cancel` — cancel run and branches.

**CW4 — Artifact persistence contract (`lib/content-workflow-artifacts.ts`):**
- Append-only create/read/list operations.
- Version-chain enforcement with `previousArtifactId`.
- Lineage and required metadata validation.

**Tests:** 18 targeted workflow tests pass across `content-workflow-types.test.ts`, `content-workflow-store.test.ts`, `content-workflow-artifacts.test.ts`, and `content-workflow-runs.test.ts`. ESLint passes on all new/changed workflow files.

**Documentation:** `docs/roadmap/group-content-workflow.md` (CW1–CW4 marked implemented), `docs/API.md` (route contracts), `docs/CHANGELOG.md` (this entry).

---

### Roadmap Scoping — Group S: Design System Foundation — March 4, 2026

**Group S — Design System Foundation:** Fully scoped in roadmap/README.md. Twenty steps (S1–S20) across 5 phases: infrastructure fixes and semantic tokens (S1–S3), shared atom components and migration (S4–S9), page layout and shared infrastructure (S10–S14), organism consolidation and cross-feature centralization (S15–S19), and documentation and standards (S20). Each phase includes a dedicated testing and validation step.

The Content Engine currently has no design system — every component uses inline Tailwind utility classes with hardcoded values, and there are no shared primitives, semantic tokens, or page layout abstractions. Group S establishes the foundation: semantic design tokens in `globals.css` via Tailwind v4's `@theme inline` directive (surfaces, borders, text, actions, status), shared atom components in `app/components/ui/` (Button, Input, Select, Textarea, FormField, Badge, LoadingSpinner, PageSkeleton, ErrorState, ConfirmDialog, FilterableList), a PageLayout template in `app/components/layout/`, centralized cross-feature components (TagEditor, MarkdownRenderer, VisualDiff), global and route-level error boundaries, and UI coding standards. Also fixes the broken font stack (Geist Sans loaded but overridden by Arial) and removes dead dark-mode CSS. No dependencies on other groups; can be built incrementally alongside feature work.

**Documentation updates:** roadmap/README.md (Group S with full scope, architecture decisions, 5 phases, risks/gaps, open questions, build order; Phase 1 Remaining Work table updated), CHANGELOG.md (this scoping entry), SCOPE.md (Design System Foundation module status).

---

### Roadmap Scoping — Group R: Content Narratives — March 3, 2026

**Group R — Content Narratives:** Fully scoped in roadmap/README.md. Twenty-four steps (R1–R24) across 7 phases: schema and CRUD (R1–R4), UI pages (R5–R8), AI-assisted creation (R9–R12), review workflow integration (R13–R15), context assembly integration (R16–R17), staleness detection and health dashboard (R18–R20), external API and MCP extensions (R21–R23), and documentation (R24). Each phase includes a dedicated testing and validation step.

Content Narratives are strategic documents assembled from multiple pieces of core knowledge, organized around a specific theme, audience, and intent. They serve as the instruction layer between raw knowledge and content generation — ensuring that every downstream deliverable (battle cards, emails, blog posts, etc.) shares the same strategic foundation. Three creation modes: manual, AI-assisted (semantic search + Claude draft), and clone. Full review/approval workflow reusing existing Submission infrastructure. Context assembly extended to inject approved narratives as primary strategic context above skills and business rules.

**Documentation updates:** roadmap/README.md (Group R with full scope, schema, phases, risks/gaps, open questions, build order; Phase 1 Remaining Work table updated), PRD.md (user stories CN-1–CN-12), KNOWLEDGE_BASE.md (ContentNarrative collection schema, cross-references, migration entry), BUSINESS_LOGIC.md (narrative context assembly template, content_narrative type added), API.md (narrative CRUD routes, workflow routes, generation route, external API endpoints), SCOPE.md (Content Narratives module status).

---

### Vercel Production Deployment — March 3, 2026

**Production URL:** `https://content-automation-app-zeta.vercel.app`

**Deployment:**
- Connected GitHub repo `drewgilbert-lab/content-automation-app` to Vercel project — auto-deploys on push to `main`.
- Environment variables configured in Vercel: `WEAVIATE_URL`, `WEAVIATE_API_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_MCP_SERVER_URL` (production + preview). `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` not yet configured — rate limiting and Redis-backed upload sessions gracefully fall back.
- Created `vercel.json` with security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`) applied to all `/api/v1/` routes.
- Updated `tsconfig.json` — added `mcp-server` to the `exclude` array to prevent Vercel build failures (MCP server is built separately on Railway).

**Upload Session Redis Migration (ADR-017):**
- Rewrote `lib/upload-session.ts` from in-memory `globalThis.__uploadSessions` Map to `@upstash/redis` with graceful fallback for local dev. In-memory sessions are incompatible with Vercel's serverless model where each function invocation runs in an isolated container.
- Added `deleteUserEdit()` function for proper Redis-backed session mutation.
- All bulk-upload API route handlers (`parse`, `classify`, `session/[sessionId]`, `reclassify`, `approve`) updated to `await` the now-async upload session functions.

**force-dynamic Pages (ADR-016):**
- Marked pages with `export const dynamic = "force-dynamic"` to prevent build-time pre-rendering of pages that fetch from Weaviate at runtime: homepage (`app/page.tsx`), dashboard, knowledge list, knowledge/new, queue, skills, connections.

**Smoke Test Results:**
- All 10 API/page tests passed (200 status on all pages, 401 on unauthed API, security headers present).
- Browser tests confirmed: Weaviate connected (green badge), Claude connected (green badge), 29 knowledge objects, dashboard health metrics working, bulk upload wizard functional.

---

### Bugfix: MCP server tool import paths resolving to wrong directory — March 3, 2026

- Fixed dynamic import paths in all tool and resource files under `src/tools/` and `src/resources/` from `../../lib/` to `../../../lib/`. These files compile to `dist/tools/` and `dist/resources/`, which are one level deeper than `dist/` — the extra `../` is needed to reach the project root `lib/` directory.
- Scoped `tsconfig.lib.json` to only compile the 10 `lib/` files the MCP server actually imports, avoiding pre-existing type errors in unrelated modules.

### Bugfix: MCP server stdio mode broken by stdout logging — March 3, 2026

- Replaced all `console.log` and `console.warn` calls in `mcp-server/src/weaviate.ts` with `console.error`. In stdio mode, stdout is reserved for JSON-RPC messages — any non-JSON output corrupts the protocol and causes Claude Desktop to fail with parse errors.
- Added `prebuild` script to `mcp-server/package.json` that compiles `lib/*.ts` to CommonJS via `tsconfig.lib.json` before building the MCP server. This ensures the dynamically imported `lib/*.js` files exist both locally and in Docker builds.

### Bugfix: MCP server CORS missing Expose-Headers for session ID — March 3, 2026

- Added `Access-Control-Expose-Headers: Mcp-Session-Id` to the MCP server's CORS middleware. Without this, clients (Claude Desktop, Claude Code) could not read the session ID from the initialization response, causing "Server not initialized" errors on Streamable HTTP connections.

### Bugfix: Connected System permissions not saved — March 3, 2026

- Fixed `POST /api/connections` and `PUT /api/connections/[id]` silently dropping the `permissions` field from request bodies. MCP Read/Write permissions selected in the form were never written to Weaviate.
- Added `permissions` to request body destructuring, input validation, and the `ConnectedSystemCreateInput`/`ConnectedSystemUpdateInput` objects in both route handlers.
- Added `invalidateApiKeyCache()` call in `updateConnectedSystem()` so permission changes take effect immediately instead of waiting for the 5-minute cache TTL.

### MCP Server auth fix: compile shared lib/ modules in Docker build — March 3, 2026

- The MCP server's `auth.ts` dynamically imports `lib/api-auth.js` at runtime, but the Dockerfile only copied TypeScript sources without compiling them to JavaScript, causing a 500 Internal Server Error on all authenticated requests.
- Added `tsconfig.lib.json` to compile `lib/*.ts` to CommonJS `.js` files and added the compilation step to the Docker build.

---

### MCP Connection Setup UX Enhancement — March 2, 2026

**Connection Creation Success Screen:**
- When creating a Connected System with `mcp-read` or `mcp-write` permissions, the success screen now shows an MCP Setup section below the API key card.
- Displays the MCP server URL (from `NEXT_PUBLIC_MCP_SERVER_URL` env var), a copyable Claude Desktop / Cursor config JSON snippet pre-filled with the server URL and generated API key, an MCP permission summary, and a stdio transport note.
- Falls back gracefully when the env var is not set.

**Connection Detail Page:**
- Added an MCP Configuration card on the detail page for connections with MCP permissions.
- Shows server URL, generic config snippet (with `<your-api-key>` placeholder), key prefix reminder, and link to full setup docs.

**Environment:**
- Added `NEXT_PUBLIC_MCP_SERVER_URL` to `.env.example` for the deployed MCP server URL.

---

### Group J Phase 2: MCP Server Write Access (J9–J12) — March 2, 2026

**J9 — Write Tools:**
- Added 3 MCP write tools: `create_knowledge_object`, `update_knowledge_object`, `check_submission_status`.
- Write tools create Submission records that enter the admin review queue — nothing writes directly to knowledge collections.
- `create_knowledge_object` validates objectType, serializes proposed fields into `proposedContent` JSON, calls `createSubmission()` with `sourceChannel: "mcp"`.
- `update_knowledge_object` verifies the target object exists before creating the update submission.
- `check_submission_status` returns current status, review comments, and timestamps for a previously created submission.

**J10 — Submission Metadata Extension:**
- Extended `SubmissionCreateInput`, `SubmissionListItem`, and `SubmissionDetail` types with `sourceChannel`, `sourceAppId`, and `sourceDescription` fields.
- Added `SourceChannel` type (`"ui" | "mcp" | "bulk_upload"`) and `getSourceChannelLabel()` utility.
- Updated `createSubmission()` to write source properties to Weaviate, defaulting `sourceChannel` to `"ui"`.
- Updated `listSubmissions()` and `getSubmission()` to read and return provenance fields.

**J11 — Queue UI Updates:**
- Added source channel badge to submission list rows (gray for Web UI, violet for MCP, teal for Bulk Upload).
- Added source channel filter tabs alongside existing submission type filters.
- MCP submissions display `sourceAppId` next to the badge for traceability.
- Added Source, Source App, and Source Description fields to submission review detail card.

**J12 — Tool Access Control:**
- `createServer()` now accepts optional `AuthenticatedSystem` and passes it to `registerTools()`.
- Write tools (`create_knowledge_object`, `update_knowledge_object`) check for `mcp-write` permission when `authSystem` is defined.
- stdio transport (local-only): all tools available without auth check.
- HTTP transport: read tools require `mcp-read`, write tools additionally require `mcp-write`.

**Testing:**
- 52 vitest tests across 8 files: added write-tools.test.ts (8 tests for permission checks, input validation, tool registration). Updated tools.test.ts (tool count 7→10). All passing.
- MCP server TypeScript build and Next.js production build both pass cleanly.

---

### Group J Phase 1: MCP Server Read Access (J5–J8) — March 2, 2026

**J5 — Read Tools:**
- Implemented 7 MCP tools for knowledge base read access: `list_collections`, `list_objects`, `get_object`, `search_objects`, `get_relationships`, `get_dashboard_health`, `get_collection_schema`.
- Populated `schema.ts` with collection metadata for all 8 collections (7 knowledge + Skill), mirroring `KNOWLEDGE_BASE.md`.
- Built `formatters.ts` with LLM-optimized response formatting: list items, full details, search results (500-char snippets), health metrics, collection schemas, and relationship maps.
- Tool handlers use dynamic imports to shared `lib/` functions (same pattern as `auth.ts`), avoiding business logic duplication.

**J6 — MCP Resources:**
- Registered 3 MCP resources: `knowledge://overview` (static markdown overview), `knowledge://relationships` (cross-reference graph), `knowledge://collections/{type}` (dynamic per-collection summary with names, counts, tags).

**J7 — Semantic Search Design:**
- Validated that `semanticSearchKnowledge()` in `lib/knowledge.ts` already supports multi-collection parallel search, certainty threshold filtering, result merging by score, and 500-character snippet truncation. The `search_objects` tool calls this directly.

**J8 — LLM Client Configuration:**
- Expanded `mcp-server/README.md` with detailed setup instructions for Claude Desktop, Claude Code, Cursor (stdio), and Gemini (Streamable HTTP). Added available tools/resources reference table, example interaction patterns, and remote HTTP access documentation.

**Testing:**
- 43 vitest tests across 7 files: schema metadata (14), formatters (10), tool registration (1), resource registration (1), weaviate (7), auth (8), module exports (2). All passing.

---

### Group J Phase 1: MCP Server Foundation (J1–J4) — March 2, 2026

**J1 — Project Scaffolding:**
- Created `mcp-server/` directory with standalone Node.js project: `package.json` (ESM, `@modelcontextprotocol/sdk` v1.x, `weaviate-client`, `express`, `zod`), `tsconfig.json` (ES2022/NodeNext), directory structure for tools and resources.

**J2 — Server Process + Transport Layer:**
- Built `mcp-server/src/index.ts` with dual transport support: stdio (primary, for Claude Desktop/Code/Cursor) and Streamable HTTP (secondary, for remote access via Railway). CLI flag parsing (`--transport`, `--port`) with env var fallback. Express app with CORS, per-session `StreamableHTTPServerTransport` management, `/health` endpoint for Railway health checks. Graceful shutdown on SIGINT/SIGTERM.

**J3 — Weaviate Connection Management:**
- Built `mcp-server/src/weaviate.ts` with persistent singleton Weaviate client (differs from the Next.js per-request `withWeaviate` pattern). Exponential backoff retry on startup (5 attempts, 1s/2s/4s/8s delays). Exports `initializeClient()`, `getClient()`, `reconnect()`, `closeClient()`, `checkHealth()`. Non-fatal startup — server enters degraded mode if Weaviate is unavailable.

**J4 — Authentication:**
- Extended `ConnectedSystem` permission model with `"mcp-read"` and `"mcp-write"` scopes in `lib/connection-types.ts`. Added `getPermissionLabel()` utility. Updated `lib/connections.ts` to pass permissions through on create/update. Added permissions toggle UI to `connection-form.tsx`.
- Built `mcp-server/src/auth.ts` with Bearer token validation for HTTP transport. Reuses `validateApiKey()` from `lib/api-auth.ts` via dynamic import. Checks: active status, `mcp-read` permission. stdio transport skips auth (local-only).

**Deployment:**
- Multi-stage Dockerfile (`node:22-alpine`) for Railway deployment. Docker build context includes `lib/` for shared runtime imports. Railway domain: `content-automation-app.up.railway.app`.

**Testing:**
- 17 vitest tests across 3 files: Weaviate connection management (7 tests), auth middleware (8 tests), module structure validation (2 tests).

---

### Group K Phase 1: Read API, Admin UI, Rate Limiting, Tests (K3–K6) — February 28, 2026

**K3 — Read API Endpoints:**
- Created 7 versioned read-only endpoints at `/api/v1/`: knowledge list (with pagination, type/tags/deprecated filtering), knowledge detail, semantic search, knowledge types, skills list, skill detail, and health check.
- Added `semanticSearchKnowledge()` and `listKnowledgeObjectsPaginated()` to `lib/knowledge.ts`. Added `SearchResult` and `KnowledgeListParams` types to `lib/knowledge-types.ts`.
- All endpoints except health wrapped with `withApiAuth()` middleware. Responses follow `{ "data": ..., "meta": ... }` shape.

**K4 — Connected Systems Admin UI:**
- Created 4 pages at `/connections`: list, create, detail, edit. Three components: `connection-list.tsx` (tabs, search), `connection-form.tsx` (create/edit with API key display), `connection-detail-actions.tsx` (edit, rotate key, activate/deactivate, delete).
- Added "Connected Systems" nav card to the home page.

**K5 — Rate Limiting:**
- Created `lib/rate-limit.ts` using `@upstash/ratelimit` and `@upstash/redis`. Standard tier: 100 req/min, elevated: 300 req/min, semantic search: 20 req/min (sliding window).
- Integrated rate limiting into `withApiAuth()` middleware. Added `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers to all responses. Returns 429 with `retryAfter` when exceeded.
- Graceful degradation: rate limiting is skipped if Upstash env vars are not configured.

**K6 — Testing and Documentation:**
- 42 new Vitest tests across 10 files: unit tests for `lib/api-auth.ts` (7), `lib/connections.ts` (9), `lib/rate-limit.ts` (4); integration tests for all `/api/v1/` endpoints (22).
- Created `docs/EXTERNAL_API.md` (developer API guide) and updated `docs/user-guides/external-api.md` (end-user integration guide).

---

### Group K Phase 1: ConnectedSystem Schema and API Key Auth (K1–K2) — February 28, 2026

**K1 — ConnectedSystem Collection Schema:**
- Created `lib/connection-types.ts`: type definitions (`ConnectedSystemListItem`, `ConnectedSystemDetail`, `ConnectedSystemCreateInput`, `ConnectedSystemUpdateInput`), constants (`RATE_LIMIT_TIERS`, `PERMISSIONS`), and `getRateLimitTierLabel()` utility. `apiKeyHash` is never exposed in client-facing types.
- Created `lib/connections.ts`: full CRUD operations — `listConnectedSystems`, `getConnectedSystem`, `createConnectedSystem` (generates API key, returns plaintext once), `updateConnectedSystem` (with name uniqueness check), `deleteConnectedSystem`, `activateConnectedSystem`, `deactivateConnectedSystem`. All follow the `withWeaviate` pattern from `lib/skills.ts`.
- Created `scripts/create-connected-system-collection.ts`: idempotent schema migration script creating the `ConnectedSystem` Weaviate collection with 10 properties (`name`, `description`, `apiKeyHash`, `apiKeyPrefix`, `permissions`, `subscribedTypes`, `rateLimitTier`, `active`, `createdAt`, `updatedAt`).

**K2 — API Key Generation, Rotation, and Validation Middleware:**
- Created `lib/api-auth.ts`: `generateApiKey()` (64-char hex via `crypto.randomBytes`), `hashApiKey()` (SHA-256), `validateApiKey()` (constant-time comparison via `crypto.timingSafeEqual` across all cache entries), `invalidateApiKeyCache()`, and `refreshApiKeyCache()` (loads all ConnectedSystems into a `globalThis` cache with 5-minute TTL per ADR-012 pattern).
- Created `lib/api-middleware.ts`: `withApiAuth()` higher-order function — validates `X-API-Key` header, checks active status (401 for invalid, 403 for deactivated), applies security headers (`X-Content-Type-Options: nosniff`, `Cache-Control: no-store`, `X-Frame-Options: DENY`), handles CORS via `ALLOWED_ORIGINS` env var, logs each request to stdout as JSON.
- Created `app/api/connections/route.ts`: `GET` (list with optional active filter), `POST` (create + return plaintext API key once).
- Created `app/api/connections/[id]/route.ts`: `GET` (detail), `PUT` (update), `DELETE`, `PATCH` (activate/deactivate).
- Created `app/api/connections/[id]/rotate-key/route.ts`: `POST` (generates new key, invalidates old one immediately, returns new plaintext key once).

---

### AI Merge Prompt Hardening and Replace with Proposed Action — February 26, 2026

**AI merge prompt hardening (`lib/merge.ts`):**
- `buildMergePrompt` (Standard Update submissions): Replaced weak preservation clause with explicit guarantees — every section, fact, and detail present in the current version must appear in the merged result unless directly contradicted or explicitly superseded by the proposed update; Claude is now explicitly instructed not to silently drop content from the current version.
- `buildDocumentAdditionPrompt` (Document Add submissions): Added a parallel preservation clause after the "Remove redundancies" instruction — all unaddressed existing content that is not contradicted by the supplementary document must be preserved in full.

**New "Replace with Proposed" action (`app/queue/components/submission-review.tsx`, `app/queue/components/replace-confirm.tsx`):**
- Added a "Replace with Proposed" button to the submission review page for **Update** submissions only.
- Clicking it opens a full-page confirmation view (`ReplaceConfirm` component) showing a warning banner and a read-only preview of the proposed content.
- On confirm: calls the existing `POST /api/submissions/[id]/merge/save` with the proposed content verbatim — the knowledge object is updated and the submission is marked accepted.
- On cancel: returns to the normal review view with no changes.
- `app/queue/components/replace-confirm.tsx` is a new file.

**Documentation:**
- `docs/user-guides/ai-merge.md` updated: strengthened overview and "What Claude Sees" section to reflect preservation guarantees; added "Replace with Proposed" section; updated "Starting a Merge" to mention both actions; softened and updated relevant common pitfalls.

---

### Security Gap Analysis and Documentation Updates — February 26, 2026

Reviewed Weaviate security best practices (authentication, RBAC, audit logging, key rotation) against the Group K External REST API plan. Identified and addressed gaps across all project documentation.

**roadmap/README.md updates:**
- Added Weaviate multi-user access control (defense-in-depth) architecture with three scoped Weaviate users: `content-engine-admin`, `content-engine-api-reader`, `content-engine-mcp`
- Promoted API key rotation from open question to Phase 1 requirement (K2) with `POST /api/connections/[id]/rotate-key`
- Added request logging specification for `/api/v1/` routes (stdout-based audit trail)
- Added API response security headers (`X-Content-Type-Options`, `Cache-Control`, `X-Frame-Options`) and CORS policy
- Resolved three open questions: `subscribedTypes` (full read for Phase 1), key rotation (Phase 1), webhook cross-references (resolved names and types)
- Updated K8 webhook spec to explicitly include timestamp in signed payload for replay attack prevention
- Added OIDC/SSO upgrade path in Cross-Cutting Notes (Phase 3+ migration from API keys to OIDC)
- Added internal API route protection as Phase 3+ backlog item (accepted risk for single-user tool)

**TECH_DECISIONS.md updates:**
- Added ADR-014: Weaviate Multi-User Access Control (defense-in-depth via scoped Weaviate users per access channel)
- Extended ADR-007: added security headers, CORS, request logging, key rotation, ConnectedSystem collection, and `WEAVIATE_READER_API_KEY` env var

**BUSINESS_LOGIC.md updates:**
- Added Weaviate User column to External Access Patterns table showing which Weaviate user backs each channel
- Added defense-in-depth paragraph with ADR-014 reference

**API.md updates:**
- Added security model summary to Group K section (app-level auth, Weaviate defense-in-depth, headers, CORS, logging)
- Added `POST /api/connections/[id]/rotate-key` endpoint documentation

**SCOPE.md updates:**
- Updated "Out of Scope" to note internal API routes are unprotected (accepted risk with Phase 3+ backlog reference)

**New files:**
- Created `.env.example` with all current and planned environment variables
- Created `docs/user-guides/external-api.md` — draft user guide for the External REST API

---

### Group I — Skills Module — February 26, 2026

**I1 — Skill Collection Schema**
- Created `scripts/add-skill-collection.ts` migration script that creates the `Skill` Weaviate collection with full property schema (name, description, content, active, contentType, triggerConditions, parameters, outputFormat, version, previousVersionId, tags, category, author, sourceFile, deprecated, createdAt, updatedAt)

**I2 — Skill CRUD API**
- Created `lib/skill-types.ts` — TypeScript types: `SkillListItem`, `SkillDetail`, `SkillCreateInput`, `SkillUpdateInput`, `SkillParameter`, content type/category constants, and utility functions
- Created `lib/skills.ts` — CRUD functions: `listSkills`, `getSkill`, `createSkill`, `updateSkill`, `deleteSkill`, `checkSkillReferences`, `activateSkill`, `deactivateSkill`, `deprecateSkill`, `restoreSkill`, plus `SkillNameConflictError`
- Created `app/api/skills/route.ts` — `GET` (list with filters: contentType, active, category) and `POST` (create)
- Created `app/api/skills/[id]/route.ts` — `GET` (detail), `PUT` (update), `DELETE` (with reference check), `PATCH` (activate/deactivate/deprecate/restore)

**I3 — Skills Library UI**
- Created `app/skills/page.tsx` — Skills Library list page with filter tabs (All/Active/Inactive/Deprecated), content type filter, category filter, and search
- Created `app/skills/[id]/page.tsx` — Skill detail page with markdown content, metadata sidebar, and activation toggle
- Created `app/skills/new/page.tsx` — Create skill form page
- Created `app/skills/[id]/edit/page.tsx` — Edit skill form page with version bump (patch/minor/major)
- Created `app/skills/components/skill-list.tsx`, `skill-form.tsx`, `skill-detail-actions.tsx` — UI components

**I4 — Context Assembly Integration**
- Created `lib/context-assembly.ts` — `assembleContext()` function for building system prompts with active skills (matched by content type), knowledge objects, and business rules

**I5 — Migration Script**
- Created `scripts/migrate-instruction-templates.ts` — migrates `BusinessRule` objects with `subType: "instruction_template"` to the `Skill` collection, preserving name, content, tags, and sourceFile; sets `active: true`, `version: "1.0.0"`; deprecates originals; supports `--dry-run` flag
- Ran migration: 2 instruction templates (Campaign Brief Generator, Ops Configuration Guide Generator) migrated to Skills and originals deprecated

**Other changes:**
- Modified `app/page.tsx` — added "Skills Library" navigation card to home page

---

### Group H — Enhanced Change Review Workflows (H3, H4, H5) — February 26, 2026

**H3 — Review Queue Integration for Document Additions**
- Fixed merge save API (`/api/submissions/[id]/merge/save`) to accept `document_add` submissions alongside `update` submissions
- Document addition merge workflow now works end-to-end: upload document → AI merge → admin review with tracked changes → save merged content

**H4 — Visual Diff Component**
- Built reusable `VisualDiff` component (`app/queue/components/visual-diff.tsx`)
- Supports two display modes: unified (inline additions/deletions with collapsible unchanged sections) and side-by-side (synchronized-scroll two-panel layout)
- Uses `diff-match-patch` with semantic cleanup for word-level diff granularity
- Additions shown in green with underline, deletions in red with strikethrough
- Includes legend bar (Added / Removed / Unchanged)
- Extracted diff rendering logic from MergeEditor into this shared component

**H5 — ContentDiff Upgrade**
- Replaced plain side-by-side markdown comparison with visual diff highlighting
- Added metadata changes section showing field-level before→after changes (name, subType, revenueRange, employeeRange) with red strikethrough → green highlighting
- Added tag diff with added (green), removed (red strikethrough), and unchanged (gray) pill badges
- Added unified/side-by-side view mode toggle
- Content diff now uses the shared `VisualDiff` component for green/red diff highlighting
- Refactored MergeEditor to use VisualDiff, removing duplicated diff logic

---

### Competitor and CustomerEvidence Collections Created (February 26, 2026)

**Migration executed:** The existing migration script `scripts/add-competitor-customerevidence-collections.ts` was run against the Weaviate Cloud instance. Both `Competitor` and `CustomerEvidence` collections now exist in Weaviate. Previously, only 5 of 7 expected collections existed (Persona, Segment, UseCase, BusinessRule, ICP). All 7 knowledge collections are now live. No code changes were made — only the migration script was executed. This is the root fix for the missing collection errors described in the "Bulk Upload Pipeline — Bug Fixes" entry below.

---

### Bulk Upload Pipeline — Bug Fixes (February 26, 2026)

**pdf-parse crash fix:** Downgraded `pdf-parse` from v2.x to v1.x — v2 requires the `DOMMatrix` browser API and crashes in Node.js, causing the "Upload & Parse" button to silently fail. Changed module-level `require("pdf-parse")` to a lazy `await import("pdf-parse")` inside `extractPdf()` so PDF library issues only affect PDF parsing. Added error handling to the upload wizard so server errors surface to the user instead of being silently swallowed.

**Claude model update:** Switched default model from `claude-opus-4-5` / `claude-sonnet-4-20250514` to `claude-haiku-4-5` in both `lib/claude.ts` (streaming and connection check) and `lib/classifier.ts` (document classification). Cost optimization for development.

**Weaviate missing collection handling:** Wrapped `fetchCollectionObjects` calls in `listKnowledgeObjects()` with try/catch that returns `[]` for missing collections. Prevents crashes when Competitor and CustomerEvidence collections don't exist in the Weaviate instance.

**Classification error UX:** Moved error rendering outside step-specific blocks so errors are visible on any wizard step. Added automatic step-back to Step 1 when classification fails fatally, allowing the user to retry instead of being stuck on a blank Step 2.

**Reclassify route error handling:** Wrapped `classifyDocument()` call in `POST /api/bulk-upload/reclassify` with try/catch, returning a proper JSON error response instead of an unhandled exception.

**Type label completeness:** Added missing `competitor: "Competitors"` and `customer_evidence: "Customer Evidence"` entries to `PLURAL_TYPE_LABELS` map in `lib/knowledge.ts`.

**Source file provenance:** Added `sourceFile: doc.filename` to `proposedBody` in the bulk upload approve route so document provenance is preserved through the submission pipeline.

**Dev mode session persistence:** Moved the in-memory `sessions` Map and cleanup timer to `globalThis` in `lib/upload-session.ts` so they survive Turbopack module re-evaluation and are shared across route handlers during development.

---

### Group G3/G4/G5 — Bulk Upload Session, Review UI, and Submission Bridge (February 2026)

**G3 — Upload Session Management:** In-memory session store (`lib/upload-session.ts`) with 24-hour TTL cleanup. Sessions track parsed documents, AI classifications, and user edits. Types defined in `lib/upload-session-types.ts`. Three new API routes: `POST /api/bulk-upload/parse` (accepts FormData with multiple files, parses via document parser, creates session), `GET /api/bulk-upload/session/[sessionId]` (retrieves serialized session state), `POST /api/bulk-upload/reclassify` (re-runs AI classification on a single document within a session). Updated existing `POST /api/bulk-upload/classify` to optionally accept `sessionId` and store classification results in the session.

**G4 — Uploader Review UI:** Multi-step bulk upload page at `/bulk-upload`. Step 1: drag-and-drop file upload with file list preview (FileDropZone component). Step 2: real-time classification progress via SSE streaming (ClassificationProgress component). Step 3: review and edit AI classifications with inline editing of type, name, and tags per document (DocumentReviewCard, TagEditor, ConfidenceBadge components). Low-confidence items (below 0.7) highlighted with amber border. Bulk actions: Select All, Approve Selected, Reclassify Selected, Remove Selected. Expandable content preview per document. Navigation card added to home page.

**G5 — Submission Bridge:** `POST /api/bulk-upload/approve` route creates one Submission per approved document via the existing `createSubmission()` function. Builds `proposedContent` JSON (name, content, tags, ICP-specific fields) matching the format expected by the review queue. Supports user overrides applied on top of AI classifications. Handles partial failures — continues processing remaining documents when individual submissions fail. Approved documents enter the existing admin review queue at `/queue`.

**Tests:** 50 new tests across 6 test files: session store unit tests (21), session types unit tests (8), parse route tests (5), reclassify route tests (6), approve route tests (8), session retrieval route tests (2). All 107 project tests pass.

---

### Group G1/G2 — Document Parser and AI Classification (February 2026)

**G1 — Document Parser (`lib/document-parser.ts`):** Server-side file parser supporting four formats: Markdown (.md), PDF (.pdf), DOCX (.docx), and plain text (.txt). PDF extraction via `pdf-parse`; DOCX extraction via `mammoth` (both added as new dependencies). Returns `ParsedDocument` with extracted text, filename, original format, word count, and per-document parse errors. Enforces configurable limits: 10 MB per file, 100 MB per batch, 50 files per batch. MIME type validation with extension fallback. Types defined in `lib/document-parser-types.ts`.

**G2 — AI Classification API (`app/api/bulk-upload/classify/route.ts`):** SSE-streaming endpoint that classifies parsed documents into knowledge object types using Claude (`claude-sonnet-4-20250514`). For each document, builds a classification prompt including the full knowledge type taxonomy and an inventory of all existing non-deprecated objects. Claude returns a JSON classification with `objectType`, `objectName`, `tags`, `suggestedRelationships`, and `confidence` (0.0–1.0). Relationships are resolved to real Weaviate object IDs by name+type matching. Items below 0.7 confidence are flagged with `needsReview: true`. Classification logic in `lib/classifier.ts`; types in `lib/classification-types.ts`. Progress, result, error, and done events streamed via SSE for real-time UI updates.

**Test infrastructure:** Vitest added as dev dependency with `vitest.config.ts`. Test scripts: `npm test` (single run), `npm run test:watch` (watch mode). 57 tests across 3 test files: document parser unit tests (23), classifier unit tests (23), API route integration tests (11).

---

### New Object Types — Competitor and CustomerEvidence (February 2026)

**Migration script:** `scripts/add-competitor-customerevidence-collections.ts` creates the two new Weaviate collections (`Competitor` and `CustomerEvidence`) with their full property schemas. Run this script against an existing Weaviate instance before using the new types.

**Type system:** `lib/knowledge-types.ts` adds `"competitor"` and `"customer_evidence"` to the `KnowledgeType` union. Adds `CUSTOMER_EVIDENCE_SUB_TYPES = ["proof_point", "reference"]`. Adds optional fields `website?`, `customerName?`, and `industry?` to `KnowledgeDetail`, `KnowledgeCreateInput`, and `KnowledgeUpdateInput`.

**CRUD layer:** `lib/knowledge.ts` — both new types are fully wired into all list, get, create, update, delete, deprecate, and restore operations. Collection name maps and type routing updated.

**Health dashboard:** `lib/dashboard.ts` — `Competitor` and `CustomerEvidence` collections added to parallel data fetches. New `customerEvidenceNoSubType` gap check flags CustomerEvidence objects that are missing a required `subType`. New stat cards and gap section added to `app/dashboard/`.

**Form:** `app/knowledge/components/knowledge-form.tsx` — type-specific field blocks added for both types. Competitor shows the optional `website` field. CustomerEvidence shows the required `subType` select (proof_point / reference) plus optional `customerName` and `industry` text fields.

**Type badge:** Both types added to the `TypeBadge` component with appropriate labels and colors.

---

### Roadmap Scoping — Groups J, K, L (February 2026)

**Group J — Inbound MCP Server for 3rd Party Write Access:** Fully scoped in roadmap/README.md. Five steps (J1–J5): standalone MCP server process with Streamable HTTP transport, read-only discovery tools (list types, search, get object), write tools that create Submissions (never write to Weaviate directly), Submission metadata extension (`sourceChannel`, `sourceAppId`, `sourceDescription`), and API key authentication. Includes example use cases (n8n workflows, Slack bots, CRM sync scripts, AI agents). Risk/gap analysis covers separate hosting requirement, rate limiting, duplicate detection, queue overwhelm, and MCP spec evolution.

**Group K — External REST API for 3rd Party Read Access:** Fully scoped in roadmap/README.md. Eight steps (K1–K8): API key auth middleware, list knowledge objects endpoint with pagination, object detail endpoint, semantic search endpoint via `nearText`, types and counts endpoint, conditional skills endpoints, unauthenticated health endpoint, and OpenAPI spec (stretch). Architecture decision: REST gateway over `/api/v1/` reusing `lib/knowledge.ts`, not direct Weaviate access or GraphQL. Risk/gap analysis covers single-key model, Vercel timeouts, schema breaking changes, and stale consumer data.

**Group L — MCP Server for LLM Read Access (RAG Interface):** Fully scoped in roadmap/README.md. Fifteen steps (L1–L15): standalone MCP server with dual transport (stdio for Claude Desktop/Code/Cursor, SSE for Gemini and remote access), persistent Weaviate connection, seven MCP tools (`list_collections`, `list_objects`, `get_object`, `search_objects`, `get_relationships`, `get_dashboard_health`, `get_collection_schema`), three MCP resources (overview, relationship map, collection summaries), semantic search design, cross-LLM compatibility strategy, and Claude Desktop configuration. Phase 2 write access vision documented. Risk/gap analysis covers context window overflow, data exposure, duplicated logic, and connection stability.

**Cross-cutting notes:** J + L consolidation opportunity (single MCP server with tool namespaces), K + L data overlap (shared `lib/knowledge.ts` implementation), unified API key strategy, and RBAC-free design.

**Documentation updates:** roadmap/README.md (Groups J, K, L with full scope, risks, and open questions; cross-cutting notes; infrastructure backlog updates), PRD.md (user stories MCP-1–6, API-1–5, RAG-1–6), API.md (planned external API routes, MCP tool references), KNOWLEDGE_BASE.md (Submission schema extensions), TECH_DECISIONS.md (ADR-006 MCP architecture, ADR-007 external API gateway), BUSINESS_LOGIC.md (external access patterns), SCOPE.md (updated development status), start.mdc (updated module status table).

---

### Roadmap Scoping — Groups G, H, I (February 2026)

**Group G — Bulk Upload with AI Classification:** Fully scoped in roadmap/README.md. Five steps (G1–G5): document parser supporting PDF/DOCX/Markdown/TXT, AI classification API using Claude, upload session management, uploader review UI with bulk actions, and submission bridge to the existing review queue. Risk/gap analysis covers parsing accuracy, classification errors, rate limiting, duplicate detection, session persistence, and cost management.

**Group H — Enhanced Change Review Workflows:** Fully scoped in roadmap/README.md. Five steps (H1–H5) covering two workflows: (a) upload a document to add content to an existing knowledge object via AI merge with a new `document_add` submission type, and (b) visual diff component upgrade replacing the static side-by-side comparison with word-level diff highlighting in unified and side-by-side modes. Risk/gap analysis covers large diffs, concurrent edits, accessibility, and version history dependency.

**Group I — Skills Module:** Fully scoped in roadmap/README.md. Six steps (I1–I6): new `Skill` Weaviate collection, CRUD API, library UI, context assembly integration, migration script for existing instruction templates, and a future skill testing interface. Includes separation criteria table (Skills = active procedural instructions vs. Business Rules = passive constraints). Risk/gap analysis covers skill conflicts, context window bloat, testing, versioning, migration, and composability.

**Documentation updates:** PRD.md (user stories BU-1–5, CR-1–4, SK-1–6), KNOWLEDGE_BASE.md (Skill collection schema, `document_add` submission type, `usedSkills` cross-reference), API.md (bulk upload routes, document upload route, skills CRUD routes), BUSINESS_LOGIC.md (Skills vs Business Rules distinction, updated context assembly template with skills section), SCOPE.md (updated development status), start.mdc (regenerated).

---

### Group F — AI Merge Workflow (February 2026)

**F1 — Merge API:** `POST /api/submissions/[id]/merge` streams an AI-merged version of a knowledge object. Fetches the current live version and the proposed update from the submission, sends both to Claude with a merge system prompt, and returns the merged text as a streaming response. `lib/merge.ts` provides `buildMergePrompt()` for constructing the system prompt and user message.

**F1 — Merge save API:** `POST /api/submissions/[id]/merge/save` accepts the reviewer-edited merged content, updates the target knowledge object in Weaviate, and marks the submission as accepted.

**F2 — Tracked-changes diff:** New `MergeEditor` client component (`app/queue/components/merge-editor.tsx`) computes character-level diffs between the current version and the AI-merged result using `diff-match-patch`. Added text shown in green, removed text in red with strikethrough. Two-panel layout: read-only tracked-changes view on the left, editable textarea on the right. Diff recalculates live as the reviewer edits.

**F3 — Merge review UI:** "Merge with AI" button enabled on the queue review page for update submissions. Clicking it enters merge mode: hides the normal side-by-side diff view and renders the `MergeEditor` full-width. Streams the AI merge result, then lets the reviewer edit and save (commits to Weaviate + closes queue item) or discard (returns to normal review view).

**Infrastructure:** `diff-match-patch` and `@types/diff-match-patch` npm packages added.

---

### Relationship Panel — Always Show Add Button (February 2026)

**Bug fix / enhancement:** Previously, UseCase and BusinessRule detail pages displayed "No relationships available for this type" with no way to add relationships, because those types have no outbound cross-reference configs. Now the "+ Add" button is always visible when any relationship configs exist (forward or reverse), and users can manage relationships from any object type.

**Reverse relationship support:** Added `reverse?: boolean` field to `RelationshipConfig` in `lib/knowledge-types.ts`. New `getReverseRelationships(type)` function in `lib/knowledge.ts` finds types that link TO a given type (e.g. Persona → UseCase), enabling types without outbound configs to discover their inbound relationship options.

**Inbound reference resolution:** New `getInboundReferences(objectId, objectType)` function in `lib/knowledge.ts` queries other collections to find objects that reference a given object. The detail page (`app/knowledge/[id]/page.tsx`) merges inbound refs into `crossReferences` so they display alongside outbound refs.

**UI changes:** `ManageRelationships` component (`app/knowledge/components/manage-relationships.tsx`) accepts a new `reverseRelationships` prop, removed the early return that hid the panel for types with no outbound configs, and handles reverse adds/removes by calling the relationship API on the candidate's ID instead of the current object's ID.

---

### Group E — Review Queue (February 2026)

**E1 — Submission API:** `POST /api/submissions` creates pending submissions. Accepts object type, name, proposed content (JSON-serialized), and optional target object ID for updates. Stores in new `Submission` Weaviate collection.

**E2 — Queue list API:** `GET /api/submissions` returns all submissions with optional filters by submission type and status. `GET /api/submissions/[id]` returns a single submission detail.

**E3 — Queue review API:** `POST /api/submissions/[id]/review` accepts actions: `accept` (writes to Weaviate and closes), `reject` (requires comment, closes), `defer` (optional note, stays open). Accept on "new" submissions creates the knowledge object; accept on "update" submissions updates the existing object.

**E4 — Queue UI:** Review queue page at `/queue` with filterable submission list (All/New/Update tabs, show-closed toggle). Review page at `/queue/[id]` with full content preview for new submissions, side-by-side comparison for updates, and Accept/Reject/Defer action buttons. AI Merge placeholder (Group F).

**E5 — Connector/User submission flow:** Role toggle (Admin/Contributor) added to app header, persisted in localStorage. Contributors' create/edit form submissions route through the submission API instead of writing directly to Weaviate. "Submit for Review" button replaces direct save. Dashboard review queue section now shows live pending count with link to queue.

**Infrastructure:** New `Submission` Weaviate collection (migration: `scripts/add-submission-collection.ts`). New `lib/submissions.ts` business logic layer. New `lib/submission-types.ts` type definitions. `diff` npm package added for future content diffing.

---

## Group D — Health Dashboard — 2026-02-25

### D1 — Dashboard data API
- `GET /api/dashboard` — returns health metrics across all 5 knowledge collections
- Object counts per type and total
- Never-reviewed detection (`updatedAt === createdAt`)
- Staleness detection (90+ days since last update)
- Relationship gap analysis: zero refs, partial refs, asymmetric refs, ICP missing persona/segment, BusinessRule missing subType
- `lib/dashboard.ts` — business logic module with `getDashboardData()`, fetches all collections in parallel with cross-references

### D2 — Dashboard page
- `/dashboard` — server component rendering 4 sections
- Overview: stat card grid with per-type counts and warning/danger indicators
- Relationship gaps: collapsible sections by gap category, each row with type badge and "Fix" link to object detail page
- Staleness report: sorted list with "Never Reviewed" (amber) and "Stale" (red) badges
- Review queue: disabled placeholder for Group E
- `app/dashboard/components/stat-card.tsx` — reusable stat card with default/warning/danger variants
- `app/dashboard/components/gap-table.tsx` — collapsible gap report with Fix CTAs
- `app/dashboard/components/staleness-list.tsx` — deduplicated staleness list with badges
- Home page (`app/page.tsx`) updated with active Dashboard navigation card

---

## Group C — Relationship Layer — 2026-02-24

### C1 — Relationship write API
- `POST /api/knowledge/[id]/relationships` — add a cross-reference between objects
- `DELETE /api/knowledge/[id]/relationships` — remove a cross-reference
- Accepts `targetId` and `relationshipType` in request body
- Auto-syncs bidirectional Persona/Segment references
- Validates source/target compatibility before writing

### C2 — Manage Relationships panel
- New `ManageRelationships` client component on every detail page
- Shows current cross-references grouped by type with remove buttons
- Search/select dropdown to add new references from compatible collections
- ICP single-value handling (replace instead of append)
- Optimistic UI updates with error handling
- Replaces the old read-only "Related Objects" card

---

## 2026-02 — Knowledge Base Write Layer (Group B)

### Added
- `POST /api/knowledge` — create endpoint with name uniqueness enforcement (409 on conflict)
- `PUT /api/knowledge/[id]` — update endpoint for any writable fields
- `DELETE /api/knowledge/[id]` — delete endpoint with `GeneratedContent` reference check and confirm flow
- `PATCH /api/knowledge/[id]` — deprecate/restore endpoint
- `/knowledge/new` — create form page
- `/knowledge/[id]/edit` — edit form page
- `app/knowledge/components/knowledge-form.tsx` — adaptive form component with type-specific fields and markdown preview
- `app/knowledge/components/detail-actions.tsx` — detail page action buttons (Edit, Delete, Deprecate/Restore)
- `scripts/add-deprecated-field.ts` — migration script adding `deprecated: boolean` to all 5 knowledge collections
- `KnowledgeCreateInput`, `KnowledgeUpdateInput`, `SUB_TYPES` in `lib/knowledge-types.ts`
- `createKnowledgeObject`, `updateKnowledgeObject`, `deleteKnowledgeObject`, `checkGeneratedContentReferences`, `deprecateKnowledgeObject`, `restoreKnowledgeObject`, `NameConflictError` in `lib/knowledge.ts`

### Changed
- Knowledge Base list page: added "+ New Object" button
- Knowledge Base detail page: added Edit/Delete/Deprecate actions and deprecated banner
- Knowledge list component: added deprecated badge styling

---

## 2026-02-25 — Knowledge Base Read Layer (Group A)

### Added
- `lib/knowledge-types.ts` — client-safe types and utility functions for knowledge objects
- `lib/knowledge.ts` — server-side Weaviate query module (`listKnowledgeObjects`, `getKnowledgeObject`)
- `GET /api/knowledge` — list endpoint with optional `type` filter (26 objects across 5 collections)
- `GET /api/knowledge/[id]` — detail endpoint with cross-reference resolution
- `/knowledge` — Knowledge Base list page with type filter tabs, search, and grouped display
- `/knowledge/[id]` — Knowledge Base detail page with markdown rendering, metadata sidebar, and cross-reference links
- `react-markdown` and `remark-gfm` dependencies for content rendering

### Changed
- Dashboard: Knowledge Base module card is now active and links to `/knowledge`
- `tsconfig.json`: Excluded `scripts/` directory from Next.js build type checking

---

## 2026-02-25

### Added
- `docs/roadmap/README.md` — single source for phases, future modules, backlog, open questions
- `scripts/seed.ts` — collection creation + 26 object seed + 49 cross-references
- `npm run seed` script, `dotenv` and `tsx` dev dependencies

### Changed — Docs Restructuring
- Eliminated content overlap across all docs; each file now has a single responsibility
- `SCOPE.md` — removed repo structure and doc index (duplicated in README/start.mdc)
- `PRD.md` — stripped to requirements only; removed vision, seed inventory, content types, future modules; added pointers
- `BUSINESS_LOGIC.md` — removed workflow states and planned business rules (moved to roadmap/README.md)
- `KNOWLEDGE_BASE.md` — updated seed inventory status from "Pending seed" to "Seeded"
- `TECH_DECISIONS.md` — removed Open Questions (moved to roadmap/README.md)
- Updated `docs-maintenance.mdc`, `start.mdc`, and `README.md` to include roadmap/README.md

### Changed
- `.env.example` now includes `CONTENT_REPO_PATH`

### Infrastructure
- Weaviate Cloud connected, all collections seeded

---

## 2026-02-24

### Added
- `.cursor/rules/start.mdc` — slim always-on project context rule (~50 lines)
- `.cursor/rules/weaviate-patterns.mdc` — glob-triggered Weaviate schema and connection pattern reference
- `.cursor/rules/api-patterns.mdc` — glob-triggered API route contracts and code patterns
- `.cursor/rules/content-logic.mdc` — glob-triggered content generation logic and context assembly
- `.cursor/rules/docs-maintenance.mdc` — description-only rule for sub-agent doc update delegation
- `.cursor/rules/sync-start.mdc` — description-only rule for manual start.mdc regeneration
- `docs/CHANGELOG.md` — this file
- `docs/API.md` — API route reference

### Changed
- Replaced boilerplate `README.md` with project-specific setup guide

---

## 2026-02-23

### Added
- Next.js 16 scaffold with App Router, TypeScript, Tailwind CSS v4
- `lib/weaviate.ts` — serverless-safe Weaviate client with `withWeaviate` helper and connection check
- `lib/claude.ts` — Anthropic client with `streamMessage` streaming and connection check
- `app/api/chat/route.ts` — POST endpoint for Claude streaming
- `app/page.tsx` — dashboard homepage with Weaviate and Claude connection status indicators
- `.env.example` — credential template
- `docs/PRD.md` — product requirements, modules, user stories
- `docs/TECH_DECISIONS.md` — architecture decision records (ADR-001 through ADR-005)
- `docs/BUSINESS_LOGIC.md` — knowledge object types, context assembly, content types, workflow states
- `docs/KNOWLEDGE_BASE.md` — Weaviate schema, content inventory, cross-reference design, seed plan
- `docs/SCOPE.md` — project overview, goals, development status
