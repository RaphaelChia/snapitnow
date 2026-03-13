import "next-auth"
import "@auth/core/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      isAdmin: boolean
    } & Session["user"]
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    hostId?: string
    isAdmin?: boolean
  }
}
