import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import { getUserCached } from "./users";
import type { UserRecord, UserRole } from "./user-types";
import { hasMinimumRole } from "./user-types";

const allowedDomains = process.env.ALLOWED_DOMAINS
  ? process.env.ALLOWED_DOMAINS.split(",").map((d) => d.trim().toLowerCase())
  : [];

const allowedEmails = process.env.ALLOWED_EMAILS
  ? process.env.ALLOWED_EMAILS.split(",").map((e) => e.trim().toLowerCase())
  : [];

const config: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 3600,
  },

  pages: {
    signIn: "/auth/signin",
  },

  callbacks: {
    signIn({ profile }) {
      if (allowedDomains.length === 0 && allowedEmails.length === 0) {
        return true;
      }

      const email = profile?.email?.toLowerCase();
      if (!email) return false;

      if (allowedEmails.includes(email)) return true;

      const hd = (profile as { hd?: string })?.hd?.toLowerCase();
      if (hd && allowedDomains.includes(hd)) return true;

      return false;
    },

    jwt({ token, profile, user }) {
      if (profile) {
        token.email = profile.email;
        token.name = profile.name;
        token.picture = profile.picture as string | undefined;
      } else if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);

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

  const user = await getUserCached(session.user.email);
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
 */
export async function getCurrentUser(): Promise<UserRecord | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  return getUserCached(session.user.email);
}
