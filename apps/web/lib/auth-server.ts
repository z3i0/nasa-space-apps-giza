import { cookies } from "next/headers"
import { UserSession } from "./auth"

export async function getServerAuthUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get("auth_user")?.value
    if (!raw) return null
    return JSON.parse(decodeURIComponent(raw)) as UserSession
  } catch {
    return null
  }
}
