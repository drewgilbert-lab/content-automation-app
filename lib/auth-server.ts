import { auth } from "./auth";
import { getUserCached, getOrCreateUser } from "./users";
import type { UserRecord, UserRole } from "./user-types";
import { hasMinimumRole } from "./user-types";

/**
 * Ensure a Weaviate user record exists for the current session.
 * Creates the record on first sign-in (first user gets admin role).
 */
async function ensureUser(
  email: string,
  name?: string | null,
  image?: string | null
): Promise<UserRecord> {
  const cached = await getUserCached(email);
  if (cached) return cached;
  return getOrCreateUser(email, name ?? email, image ?? undefined);
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
 * Get the current user from the session, or null if not authenticated.
 * Creates the Weaviate user record on first access.
 */
export async function getCurrentUser(): Promise<UserRecord | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return ensureUser(session.user.email, session.user.name, session.user.image);
}
