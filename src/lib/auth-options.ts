import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  providers: [
    GoogleProvider({ clientId: process.env.AUTH_GOOGLE_ID ?? "google", clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "google" }),
    GitHubProvider({ clientId: process.env.AUTH_GITHUB_ID ?? "github", clientSecret: process.env.AUTH_GITHUB_SECRET ?? "github" }),
    DiscordProvider({ clientId: process.env.AUTH_DISCORD_ID ?? "discord", clientSecret: process.env.AUTH_DISCORD_SECRET ?? "discord" }),
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

      await prisma.user.upsert({
        where: {
          provider_providerUserId: {
            provider: account.provider as "google" | "github" | "discord",
            providerUserId,
          },
        },
        update: {
          email: user.email,
          name: user.name,
          avatarUrl: user.image,
        },
        create: {
          provider: account.provider as "google" | "github" | "discord",
          providerUserId,
          email: user.email,
          name: user.name,
          avatarUrl: user.image,
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
              provider: account.provider as "google" | "github" | "discord",
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
