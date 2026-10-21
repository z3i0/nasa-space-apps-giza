import { cookies } from "next/headers"
import type { TeamDetails } from "./teams"

export async function getServerMyTeam(): Promise<{ team: TeamDetails | null }> {
  // Read request cookies outside the network-error handler so Next can mark
  // this route dynamic during prerendering.
  const cookieStore = await cookies()
  try {
    const token =
      cookieStore.get("auth_token")?.value ||
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("__Secure-better-auth.session_token")?.value

    if (!token) {
      return { team: null }
    }

    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
    ).replace(/\/$/, "")

    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ")

    const response = await fetch(`${base}/teams/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return { team: null }
    }

    const data = await response.json()
    if (!data) return { team: null }
    if ("team" in data) {
      return { team: data.team }
    }
    if (data.id) {
      return { team: data as TeamDetails }
    }
    return { team: null }
  } catch (err) {
    console.error("Failed to load team on server:", err)
    return { team: null }
  }
}

export async function getServerTeamById(
  teamId: string
): Promise<TeamDetails | null> {
  const cookieStore = await cookies()
  try {
    const token =
      cookieStore.get("auth_token")?.value ||
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("__Secure-better-auth.session_token")?.value

    const base = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
    ).replace(/\/$/, "")

    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ")

    const response = await fetch(
      `${base}/teams/${encodeURIComponent(teamId)}`,
      {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (err) {
    console.error("Failed to load team by id on server:", err)
    return null
  }
}
