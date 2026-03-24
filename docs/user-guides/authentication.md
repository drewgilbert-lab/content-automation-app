# Authentication

> Last updated: March 24, 2026

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

Your current role is displayed as a badge next to your avatar in the application header.

### Permission Details

| Permission | Admin | Editor | Contributor | Viewer |
|---|---|---|---|---|
| View knowledge objects, skills, narratives | Yes | Yes | Yes | Yes |
| Create/edit knowledge objects and skills | Yes | Yes (direct) | Yes (via review queue) | No |
| Upload documents (bulk upload) | Yes | Yes | Yes | No |
| Review and approve submissions | Yes | Yes | No | No |
| AI Merge on submissions | Yes | Yes | No | No |
| Manage connected systems and API keys | Yes | No | No | No |
| Manage users and roles | Yes | No | No | No |

Contributors create content through the review queue — their changes must be approved by an Editor or Admin before being applied. Editors and Admins can create and edit content directly without going through the review queue.

---

## User Management (Admin Only)

Admins can manage users at **User Management** (accessible from the dashboard or at `/admin/users`). This page allows admins to:

- View all registered users with their name, email, role, last login, and active status
- Search for users by name or email
- Change a user's role using the role dropdown
- Activate or deactivate users

Users self-register on first Google sign-in. An admin then assigns the appropriate role. Admins cannot demote their own role (self-protection).

---

## Custom Permission Sets (Admin Only)

Admins can create custom permission sets at **Permission Sets** (accessible from the admin nav or at `/admin/roles`). Permission sets allow fine-grained access control beyond the four fixed roles.

### How Permission Sets Work

- Each permission set defines a list of specific permissions (e.g. "View knowledge", "Review submissions", "Manage users")
- When a permission set is assigned to a user, it **overrides** the default permissions from their role
- If no permission set is assigned, the user's role determines their permissions (the default behavior)

### Built-In Permission Sets

Four built-in permission sets are included by default, matching the permissions of the four standard roles:

| Set | Matches Role | Can Delete? |
|---|---|---|
| Admin | Admin | No |
| Editor | Editor | No |
| Contributor | Contributor | No |
| Viewer | Viewer | No |

Built-in sets cannot be deleted and their names cannot be changed, but their permissions can be customized.

### Creating a Custom Permission Set

1. Navigate to `/admin/roles` and click **New Permission Set**
2. Enter a name and description
3. Select the desired permissions from the checkbox grid
4. Click **Create**

### Assigning a Permission Set to a User

1. Navigate to `/admin/users`
2. Find the user and use the **Permission Set** dropdown to select a set
3. The change takes effect on the user's next request (within 5 minutes due to caching)

---

## Audit Log (Admin Only)

The Content Engine maintains an audit trail of authentication and authorization events. Admins can view this log at **Audit Log** (accessible from the admin nav or at `/admin/audit`).

### Tracked Events

| Event | When It's Logged |
|---|---|
| Sign In | User successfully signs in via Google OAuth |
| Sign Out | User signs out |
| Sign In Failed | Sign-in attempt denied (wrong domain, deactivated account) |
| Role Change | Admin changes a user's role |
| User Activated | Admin activates a previously deactivated user |
| User Deactivated | Admin deactivates a user |
| Permission Set Created | Admin creates a new permission set |
| Permission Set Updated | Admin modifies a permission set's permissions |
| Permission Set Deleted | Admin deletes a custom permission set |

### Using the Audit Log

- **Filter by event type** using the type dropdown to focus on specific events (e.g. only sign-in failures)
- **Filter by actor** to see all events performed by a specific user
- Events are displayed in reverse chronological order with color-coded badges
- Pagination controls at the bottom allow browsing through historical events

---

## User Attribution

All content changes are attributed to the user who made them:

- **Knowledge objects** display "Created By" and "Last Edited By" on the detail page sidebar
- **Skills** display "Last Edited By" on the detail page sidebar
- **Submissions** display the submitter and, once reviewed, "Reviewed By" on the review page

Attribution uses the user's email address from their Google session. Historical objects created before attribution was enabled will show no author information.

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
