/**
 * EDGE-SAFE — This file is imported by middleware.ts which runs in the
 * Edge runtime. It MUST NOT import any module that depends on Node.js
 * APIs (Weaviate, audit, users, permissions, etc.).
 *
 * Server-only auth helpers live in lib/auth-server.ts.
 */
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

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
