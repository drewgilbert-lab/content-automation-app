import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import { logAuditEvent } from "./audit";

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
      const email = profile?.email?.toLowerCase();

      if (allowedDomains.length === 0 && allowedEmails.length === 0) {
        if (email) {
          logAuditEvent({
            eventType: "sign_in",
            actorEmail: email,
            actorName: profile?.name ?? "",
          });
        }
        return true;
      }

      if (!email) {
        logAuditEvent({
          eventType: "sign_in_failed",
          actorEmail: "unknown",
          details: { reason: "no_email_in_profile" },
        });
        return false;
      }

      if (allowedEmails.includes(email)) {
        logAuditEvent({
          eventType: "sign_in",
          actorEmail: email,
          actorName: profile?.name ?? "",
        });
        return true;
      }

      const hd = (profile as { hd?: string })?.hd?.toLowerCase();
      if (hd && allowedDomains.includes(hd)) {
        logAuditEvent({
          eventType: "sign_in",
          actorEmail: email,
          actorName: profile?.name ?? "",
        });
        return true;
      }

      logAuditEvent({
        eventType: "sign_in_failed",
        actorEmail: email,
        details: { reason: "domain_not_allowed", hd: hd ?? "none" },
      });
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

  events: {
    signOut(message) {
      const token = "token" in message ? message.token : null;
      const email = (token?.email as string) ?? "unknown";
      logAuditEvent({
        eventType: "sign_out",
        actorEmail: email,
      });
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
