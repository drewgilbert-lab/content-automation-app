# Authentication

> Last updated: March 23, 2026

The Content Engine uses Google OAuth for sign-in. All pages and internal API routes require authentication. External API routes (`/api/v1/*`) are unaffected and continue using API key authentication.

---

## Signing In

1. Navigate to any page in the Content Engine. If you are not signed in, you will be redirected to the sign-in page.
2. Click **Sign in with Google**.
3. Select your Google account. Only accounts from allowed domains or explicitly allowed email addresses can sign in.
4. After successful authentication, you are redirected to the page you originally requested.

Your Google profile picture and name are displayed in the top-right corner of the application. Click the avatar to see a dropdown menu with a **Sign Out** option.

---

## Domain Restriction

The Content Engine restricts sign-in to specific Google Workspace domains and/or individual email addresses. If your Google account's domain is not in the allowed list, sign-in will be denied with an error message.

- **Allowed domains** are configured via the `ALLOWED_DOMAINS` environment variable (comma-separated, e.g. `company.com,partner.com`).
- **Individual emails** can be allowed via the `ALLOWED_EMAILS` environment variable (comma-separated), useful for contractors or partners with non-company email addresses.

If you see an "Access Denied" error during sign-in, contact your admin to verify your domain or email is in the allowed list.

---

## User Roles

Every user is assigned one of four roles:

| Role | Description |
|---|---|
| **Admin** | Full platform access including user management, system configuration, and all Editor permissions |
| **Editor** | Content governance: review/approve/reject submissions, AI merge, direct create/edit without review queue |
| **Contributor** | Content submission: create/edit via review queue, bulk upload, view all content |
| **Viewer** | Read-only: browse knowledge, skills, narratives, and dashboards |

In Phase 1, roles are stored but not yet enforced at the permission level. All authenticated users have full access. Phase 2 (W5–W7) will add role-based permission enforcement.

---

## First User Bootstrap

The first user to sign in to a fresh Content Engine instance is automatically assigned the **Admin** role. All subsequent users receive the **Contributor** role by default.

To override this behavior, set the `ADMIN_EMAIL` environment variable to the email address that should become admin, regardless of sign-in order.

---

## Session Duration

Sessions use JWT tokens with a 1-hour maximum age. After 1 hour, you will be prompted to sign in again. The session is stored in a secure, HTTP-only cookie and validated on every request.

If an admin deactivates your account, you will be denied access on your next request even if your session token is still valid — the server checks the active flag on every authenticated request.

---

## Environment Variables

The following environment variables are required for authentication:

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes | OAuth 2.0 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth 2.0 client secret from Google Cloud Console |
| `NEXTAUTH_URL` | Yes | Application base URL (e.g. `http://localhost:3000` for development) |
| `NEXTAUTH_SECRET` | Yes | Random secret for JWT signing — generate with `openssl rand -base64 32` |
| `ALLOWED_DOMAINS` | No | Comma-separated Google Workspace domains allowed to sign in |
| `ALLOWED_EMAILS` | No | Comma-separated individual email addresses allowed to sign in |
| `ADMIN_EMAIL` | No | Email address to auto-assign admin role (overrides first-user-is-admin) |

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Navigate to **APIs & Services > Credentials**.
4. Click **Create Credentials > OAuth client ID**.
5. Select **Web application** as the application type.
6. Add your application URL to **Authorized JavaScript origins** (e.g. `http://localhost:3000`).
7. Add `{your-url}/api/auth/callback/google` to **Authorized redirect URIs**.
8. Copy the Client ID and Client Secret to your `.env.local` file.

For Google Workspace organizations, set the OAuth consent screen to **Internal** — this skips the Google review process and restricts access to your organization's users.
