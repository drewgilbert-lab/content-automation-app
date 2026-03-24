import { auth } from "./auth";
import { getUserCached, getOrCreateUser } from "./users";
import type { UserRecord, UserRole } from "./user-types";
import { hasMinimumRole } from "./user-types";
import type { Permission } from "./permissions";
import { userHasPermission } from "./permissions";
import { logAuditEvent } from "./audit";

/**
 * Ensure a Weaviate user record exists for the current session.
 * Creates the record on first sign-in (first user gets admin role).
 * Logs a sign_in audit event on new user creation.
 */
async function ensureUser(
  email: string,
  name?: string | null,
  image?: string | null
): Promise<UserRecord> {
  const cached = await getUserCached(email);
  if (cached) return cached;

  const user = await getOrCreateUser(email, name ?? email, image ?? undefined);
  logAuditEvent({
    eventType: "sign_in",
    actorEmail: email,
    actorName: name ?? "",
  });
  return user;
}

/**
 * Verify the current request has a valid, active user session.
 * Returns the UserRecord on success, or a 401 Response on failure.
 * Use at the top of internal API route handlers for defense-in-depth
 * (middleware already redirects/rejects unauthenticated requests).
 */
export async function requireAuth(): Promise<UserRecord | Response> {
  const session = await auth();
  if (!session?.user?.email) {
    return Response.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const user = await ensureUser(
    session.user.email,
    session.user.name,
    session.user.image
  );
  if (!user || !user.active) {
    return Response.json(
      { error: "Account is inactive or not found" },
      { status: 401 }
    );
  }

  return user;
}

/**
 * Verify the current user has at least the specified role.
 * Returns the UserRecord on success, or a 401/403 Response on failure.
 */
export async function requireRole(
  minimumRole: UserRole
): Promise<UserRecord | Response> {
  const result = await requireAuth();
  if (result instanceof Response) return result;

  if (!hasMinimumRole(result.role, minimumRole)) {
    return Response.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return result;
}

/**
 * Verify the current user has a specific granular permission.
 * Resolves permissions from the user's linked PermissionSet, falling
 * back to the static ROLE_PERMISSIONS matrix.
 */
export async function requirePermission(
  permission: Permission
): Promise<UserRecord | Response> {
  const result = await requireAuth();
  if (result instanceof Response) return result;

  const allowed = await userHasPermission(result, permission);
  if (!allowed) {
    return Response.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  return result;
}

/**
 * Get the current user from the session, or null if not authenticated.
 * Creates the Weaviate user record on first access.
 */
export async function getCurrentUser(): Promise<UserRecord | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return ensureUser(session.user.email, session.user.name, session.user.image);
}
