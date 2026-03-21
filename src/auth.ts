import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { verifyPassword } from "@/lib/passwords";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function getExpectedDemoCredentials() {
  return {
    email:
      process.env.AUTH_DEMO_EMAIL ??
      (process.env.NODE_ENV === "production" ? "" : "demo@shiftstats.local"),
    password:
      process.env.AUTH_DEMO_PASSWORD ??
      (process.env.NODE_ENV === "production" ? "" : "shiftstats-demo"),
  };
}

function getAuthSecret() {
  const configuredSecret =
    process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (configuredSecret) {
    return configuredSecret;
  }

  // Local development should remain bootable even before `.env` is configured.
  if (process.env.NODE_ENV !== "production") {
    return "shiftstats-dev-secret-change-me";
  }

  return undefined;
}

function getTrustHost() {
  const configured = process.env.AUTH_TRUST_HOST;

  if (configured !== undefined) {
    return configured === "true";
  }

  // Default to trusted host unless explicitly disabled.
  return true;
}

function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: getAuthSecret(),
  trustHost: getTrustHost(),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }
        const submittedEmail = parsed.data.email.toLowerCase();

        if (hasDatabaseUrl()) {
          const { getPrismaClient } = await import("@/lib/prisma");
          const prisma = getPrismaClient();
          const existingUser = await prisma.user.findUnique({
            where: { email: submittedEmail },
          });

          if (existingUser?.passwordHash) {
            const validPassword = verifyPassword(
              parsed.data.password,
              existingUser.passwordHash,
            );

            if (!validPassword) {
              return null;
            }

            return {
              id: existingUser.id,
              email: existingUser.email,
              name: existingUser.name ?? "Shiftstats User",
            };
          }
        }

        const expected = getExpectedDemoCredentials();

        if (
          !expected.email ||
          !expected.password ||
          submittedEmail !== expected.email.toLowerCase() ||
          parsed.data.password !== expected.password
        ) {
          return null;
        }

        let id = submittedEmail;
        const name = "Shiftstats Demo";

        if (hasDatabaseUrl()) {
          const { getPrismaClient } = await import("@/lib/prisma");
          const prisma = getPrismaClient();
          const user = await prisma.user.upsert({
            where: { email: submittedEmail },
            update: {
              name,
            },
            create: {
              email: submittedEmail,
              name,
              userSettings: {
                create: {
                  currencyCode: "USD",
                  timezone: "America/Chicago",
                  trackBasePay: true,
                  splitTipsByType: true,
                },
              },
            },
          });
          id = user.id;
        }

        return {
          id,
          email: submittedEmail,
          name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (typeof token.email === "string") {
          session.user.email = token.email;
        }

        if (typeof token.name === "string") {
          session.user.name = token.name;
        }
      }

      return session;
    },
  },
});
