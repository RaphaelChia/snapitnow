import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { upsertHost } from "@/lib/db/mutations/hosts";
import { env } from "@/lib/env";

function resolveHostId(input: {
  provider?: string;
  providerAccountId?: string;
  email?: string | null;
}): string | null {
  if (input.provider && input.providerAccountId) {
    return `${input.provider}:${input.providerAccountId}`;
  }

  if (input.email) {
    return `email:${input.email.toLowerCase()}`;
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
      const hostId = resolveHostId({
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
        email: user.email,
      });

      if (hostId && user.email && user.name) {
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
      }
      console.log("signIn3", user);
      return true;
    },
    jwt({ token, account }) {
      const hostId = resolveHostId({
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
        email: token.email,
      });

      if (hostId) {
        token.hostId = hostId;
      }

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
