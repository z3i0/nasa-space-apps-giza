import type { UserSession } from "./auth"
export interface RoleApplication {
  id: string
  role: string
  status: "pending" | "approved" | "rejected"
  reason: string
  createdAt: string
  user?: { id: string; name: string; email: string }
}
export interface AccountOverview {
  skills: string[]
  challenge: string | null
  profileComplete: boolean
  mentorshipCount: number
  submitted: boolean
  team: {
    id: string
    name: string
    maxMembers: number
    members: { id: string; name: string }[]
  } | null
  applications: RoleApplication[]
}
export async function accountApi<T>(
  path: string,
  body?: unknown,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(`/api/account${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
  })
  if (!response.ok) {
    const result = await response.json().catch(() => null)
    throw new Error(
      typeof result?.message === "string"
        ? result.message
        : `Request failed (${response.status})`
    )
  }
  return response.json()
}
export async function selectAccountRole(
  role: string,
  expectedEmail: string
): Promise<UserSession> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error("Unable to verify your signed-in account.")
  const user: UserSession = await response.json()
  if (user.email.toLowerCase() !== expectedEmail.trim().toLowerCase())
    throw new Error(
      "The signed-in account does not match this email. Please sign in again."
    )
  const selection = await accountApi<{
    role: string
    roles: string[]
    status: string
  }>("/role-selection", { role })
  return { ...user, role: selection.role, roles: selection.roles }
}
