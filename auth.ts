import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertHost } from "@/lib/db/mutations/hosts";
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
      console.log("signIn1", user);
      const hostId = getHostIdFromAccount({
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
      });

      if (!hostId || !user.email || !user.name) {
        console.error("Missing required host identity fields on sign in");
        return false;
      }

      console.log("signIn2", user);
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
      console.log("signIn3", user);
      return true;
    },
    jwt({ token, account, trigger }) {
      if (trigger !== "signIn") return token;
      const hostId = getHostIdFromAccount({
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
      });
      if (hostId) token.hostId = hostId;

      return token;
    },
    session({ session, token }) {
      if (typeof token.hostId === "string") {
        session.user.id = token.hostId;
      }
      return session;
    },
  },
});
