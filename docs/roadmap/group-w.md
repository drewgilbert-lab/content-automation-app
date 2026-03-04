> Back to [Roadmap Index](./README.md)

# Group W — Authentication & User Management

> Scope: Add multi-user authentication via Google OAuth sign-in, role-based access control, and an admin section for provisioning users and permission sets. Transforms the application from a single-user internal tool to a multi-user platform with governed access.
> Dependencies: None for Phase 1 (auth can be added incrementally). Group K (Connected Systems — API key auth patterns coexist with user auth). All internal API routes (`/api/knowledge`, `/api/skills`, `/api/submissions`, etc.) become protected after this group.

## Why This Matters

The application currently has zero authentication on internal routes. This is acceptable for a single-user internal tool but becomes a blocker when: multiple team members need to use the platform, submissions need to be attributed to specific users for accountability, different roles (admin, contributor, viewer) need different permissions, and the Generate UI needs to track per-user cost and usage. Google OAuth is the natural choice for an organization already using Google Workspace.

## Phase 1 — Authentication Foundation (W1–W4)

**W1 — NextAuth.js Integration with Google Provider**
Install `next-auth` (v5 / Auth.js) and configure the Google OAuth provider. Create `app/api/auth/[...nextauth]/route.ts` with Google client ID and secret from environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Configure session strategy: JWT-based sessions (stateless, no database required for Phase 1). Restrict sign-in to the organization's Google Workspace domain via the `hd` (hosted domain) parameter — only `@company.com` accounts can sign in. Add `NEXTAUTH_URL` and `NEXTAUTH_SECRET` to `.env.example`. Create a sign-in page at `app/auth/signin/page.tsx` with a "Sign in with Google" button.

**W2 — Session Middleware and Route Protection**
Create `lib/auth.ts` with helper functions: `getSession()` (reads the JWT session), `requireAuth()` (throws 401 if no session), `requireRole(role)` (throws 403 if user lacks the required role). Protect all internal API routes (`/api/knowledge`, `/api/skills`, `/api/submissions`, `/api/dashboard`, `/api/connections`, `/api/bulk-upload`, `/api/narratives`) by adding `requireAuth()` at the top of each route handler. External API routes (`/api/v1/*`) continue using API key authentication (Group K) — they are not affected. Create a Next.js middleware (`middleware.ts`) that redirects unauthenticated users to the sign-in page for all app routes except `/auth/*` and `/api/v1/*`.

**W3 — User Session UI**
Add a user avatar and name display to the app layout (`app/layout.tsx` or a shared header component). Show the signed-in user's Google profile picture and name. Add a dropdown menu with "Sign Out" action. On the sign-in page, display the organization restriction ("Sign in with your @company.com Google account"). Handle sign-in errors gracefully (wrong domain, OAuth failure).

**W4 — User Record Creation**
Create a `User` Weaviate collection to store user records. Properties: `email` (text, unique), `name` (text), `avatarUrl` (text), `role` (text — `"admin"`, `"contributor"`, `"viewer"`), `active` (boolean), `lastLoginAt` (date), `createdAt` (date), `updatedAt` (date). On first sign-in, auto-create a user record with `role: "contributor"` (default). On subsequent sign-ins, update `lastLoginAt`. The first user to sign in is auto-assigned `role: "admin"`. Create `lib/users.ts` with CRUD operations: `getOrCreateUser(email, name, avatarUrl)`, `listUsers()`, `updateUserRole(id, role)`, `deactivateUser(id)`.

## Phase 2 — Role-Based Access Control (W5–W7)

**W5 — Permission Model**
Define three roles with explicit permission sets:

| Permission | Admin | Contributor | Viewer |
|---|---|---|---|
| View knowledge objects, skills, narratives | Yes | Yes | Yes |
| Create/edit knowledge objects and skills | Yes | Yes (routed through review queue) | No |
| Upload documents (bulk upload) | Yes | Yes | No |
| Review and approve submissions | Yes | No | No |
| Manage connected systems and API keys | Yes | No | No |
| Manage users and roles | Yes | No | No |
| Access the Generate UI | Yes | Yes | No |
| View cost dashboard | Yes | Yes | Yes |
| Configure system settings | Yes | No | No |

Store the permission matrix in `lib/permissions.ts` as a typed constant. `requireRole()` checks the user's role against the required permission. The review queue remains the gatekeeper for all content changes — Contributors create submissions, Admins approve them.

**W6 — Admin User Management UI**
Build `/admin/users` page (accessible only to `admin` role). Features: list all users with name, email, role badge, last login date, and active/inactive status. Actions per user: change role (dropdown), activate/deactivate. Search by name or email. Build `GET /api/admin/users` and `PATCH /api/admin/users/[id]` routes protected by `requireRole("admin")`. Include a "Invite User" flow that sends an email with a sign-in link (or simply document that users self-register on first Google sign-in and an admin assigns their role).

**W7 — User Attribution on Actions**
Add `createdBy` and `updatedBy` fields to submissions, knowledge objects, and skills. When a user creates or edits content, record their email or user ID. Display the author in the review queue ("Submitted by drew@company.com"), knowledge detail pages ("Last edited by..."), and the submission detail page. This provides accountability and enables per-user activity tracking. Update `createSubmission()`, `createKnowledgeObject()`, `updateKnowledgeObject()`, `createSkill()`, and `updateSkill()` to accept an optional `userId` parameter.

## Phase 3 — Advanced Access Control (W8–W9)

**W8 — Permission Sets (Custom Roles)**
Extend the role system to support custom permission sets beyond the three fixed roles. Build `/admin/roles` page where admins can create named permission sets (e.g., "Content Manager" with review + generate but no admin access). Store permission sets in a `PermissionSet` Weaviate collection. Each user references a permission set instead of a fixed role string. The three built-in roles (`admin`, `contributor`, `viewer`) become default permission sets that cannot be deleted.

**W9 — Audit Log for Auth Events**
Log all authentication and authorization events: sign-in (success/failure), sign-out, role changes, user activation/deactivation, permission set changes. Store in a lightweight audit log (structured JSON logs via [Group V](./group-v.md), or a dedicated `AuditLog` Weaviate collection if queryable access is needed). Display a "Recent Activity" panel on the admin dashboard showing the last 50 auth events.

**Risks and Gaps:**

| Risk | Impact | Mitigation |
|---|---|---|
| Google OAuth requires a Google Cloud project and consent screen | Setup overhead; consent screen review may be required for external access | Use "Internal" consent screen type for Google Workspace organizations — no review needed; document setup steps |
| JWT sessions have no server-side revocation | Deactivating a user does not immediately invalidate their session | Set short JWT expiry (1 hour); check `active` flag on every request via `requireAuth()`; force re-auth on role changes |
| First-user-is-admin bootstrap | If the wrong person signs in first, they become admin | Document the bootstrap process; add an `ADMIN_EMAIL` environment variable that overrides the first-user rule |
| Migration: existing data has no user attribution | Historical objects and submissions show no author | Accept `null` for `createdBy`/`updatedBy` on existing records; only new actions are attributed |
| Performance: Weaviate user lookup on every request | Adds latency to every authenticated request | Cache user records in memory with a 5-minute TTL (same pattern as API key caching in `lib/api-auth.ts`) |
| Google Workspace domain restriction is too narrow | Contractors or partners with non-company email addresses cannot sign in | Add an `ALLOWED_DOMAINS` environment variable supporting multiple domains; or add individual email allowlisting in the admin UI |
