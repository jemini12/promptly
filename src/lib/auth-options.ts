import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin-allowlist";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    GoogleProvider({ clientId: process.env.AUTH_GOOGLE_ID ?? "google", clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "google" }),
  ],
  callbacks: {
    async signIn({ account, user }) {
      if (!account) {
        return false;
      }

      const providerUserId = account.providerAccountId;
      if (!providerUserId) {
        return false;
      }

      const allowlistedAdmin = isAdminEmail(user.email);
      await prisma.user.upsert({
        where: {
          provider_providerUserId: {
            provider: account.provider as "google",
            providerUserId,
          },
        },
        update: {
          email: user.email,
          name: user.name,
          avatarUrl: user.image,
          ...(allowlistedAdmin ? { role: "admin" as const } : {}),
        },
        create: {
          provider: account.provider as "google" | "github" | "discord",
          providerUserId,
          email: user.email,
          name: user.name,
          avatarUrl: user.image,
          role: allowlistedAdmin ? "admin" : "user",
        },
      });

      return true;
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        const providerUserId = account.providerAccountId;
        const dbUser = await prisma.user.findUnique({
          where: {
            provider_providerUserId: {
              provider: account.provider as "google",
              providerUserId,
            },
          },
          select: { id: true },
        });

        if (dbUser) {
          token.userId = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
};
