import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  // Keep browser requests and session cookies on the web app's origin.
  // Next.js forwards this path to the configured API.
  basePath: "/api/auth",
  fetchOptions: {
    credentials: "include",
  },
})

export const { signIn, signOut, signUp, useSession, getSession } = authClient
