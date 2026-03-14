import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertHost } from "@/lib/db/mutations/hosts";
import { isHostAdmin } from "@/lib/db/queries/admin-users";
import { env } from "@/lib/env";

function getHostIdFromAccount(input: {
  provider?: string;
  providerAccountId?: string;
}): string | null {
  if (input.provider && input.providerAccountId) {
    return `${input.provider}:${input.providerAccountId}`;
  }
  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      const hostId = getHostIdFromAccount({
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
      });

      if (!hostId || !user.email || !user.name) {
        console.error("Missing required host identity fields on sign in");
        return false;
      }

      try {
        await upsertHost({
          id: hostId,
          email: user.email,
          name: user.name,
          image: user.image ?? null,
        });
      } catch (error) {
        console.error("Error upserting host", error);
      }
      return true;
    },
    async jwt({ token, account, trigger }) {
      if (trigger === "signIn") {
        const hostId = getHostIdFromAccount({
          provider: account?.provider,
          providerAccountId: account?.providerAccountId,
        });
        if (hostId) token.hostId = hostId;
      }
      if (typeof token.hostId === "string") {
        token.isAdmin = await isHostAdmin(token.hostId);
      } else {
        token.isAdmin = false;
      }

      return token;
    },
    async session({ session, token }) {
      if (typeof token.hostId === "string") {
        session.user.id = token.hostId;
        session.user.isAdmin = await isHostAdmin(token.hostId);
      } else {
        session.user.isAdmin = false;
      }
      return session;
    },
  },
});
