import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { upsertHost } from "@/lib/db/mutations/hosts"
import { env } from "@/lib/env"

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
    async signIn({ user }) {
      if (user.id && user.email && user.name) {
        await upsertHost({
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? null,
        })
      }
      return true
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
