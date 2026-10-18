export const skillOptions = [
  "Python",
  "Machine Learning",
  "GIS",
  "Frontend",
  "UI/UX",
  "Business",
  "Hardware",
] as const
export const interestOptions = [
  "Earth observation",
  "Climate resilience",
  "Open data",
  "Space exploration",
  "Education",
] as const
export const roleOptions = [
  "Python / Machine Learning",
  "Frontend",
  "UI/UX",
  "GIS",
  "Business",
  "Hardware",
] as const
export const participationOptions = [
  "already_have_team",
  "want_to_join_team",
  "want_to_create_team",
  "working_individually",
] as const

export interface ParticipantProfile {
  id: string
  userId: string
  institution: string | null
  academicLevel: string | null
  desiredRole: string | null
  skills: string[]
  bio: string | null
  experience: string | null
  interests: string[]
  preferredChallenge: string | null
  teamStatus: (typeof participationOptions)[number]
  isPublic: boolean
  shareProjectsWithMentors: boolean
  hideFromSearch: boolean
  updatedAt: string
  user: {
    id: string
    name: string
    emailVerified: boolean
    phone?: string | null
  }
  team: { id: string; name: string; memberCount: number } | null
}

export interface ProfileDraft {
  name: string
  phone: string
  desiredRole: string
  skills: string[]
  bio: string
  experience: string
  interests: string[]
  preferredChallenge: string
  teamStatus: ParticipantProfile["teamStatus"]
  isPublic: boolean
  shareProjectsWithMentors: boolean
  hideFromSearch: boolean
}

export function profileDraft(profile: ParticipantProfile): ProfileDraft {
  return {
    name: profile.user.name,
    phone: profile.user.phone ?? "",
    desiredRole: profile.desiredRole ?? "",
    skills: profile.skills,
    bio: profile.bio ?? "",
    experience: profile.experience ?? "",
    interests: profile.interests,
    preferredChallenge: profile.preferredChallenge ?? "",
    teamStatus: profile.teamStatus,
    isPublic: profile.isPublic,
    shareProjectsWithMentors: profile.shareProjectsWithMentors,
    hideFromSearch: profile.hideFromSearch,
  }
}

export class ProfileRequestError extends Error {
  constructor(public status: number) {
    super(`Profile request failed (${status})`)
  }
}

// One bounded request per load/save. Browser session cookies are validated by
// the API guard; local role hints are never sent as authorization.
export async function requestProfile(
  signal: AbortSignal,
  draft?: ProfileDraft,
  version?: string
): Promise<ParticipantProfile> {
  const base = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
  ).replace(/\/$/, "")

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("hackathon_access_token") ||
        document.cookie.match(/(?:^|;\s*)(?:auth_token|better-auth\.session_token)=([^;]*)/)?.[1]
      : null

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(draft ? { "Content-Type": "application/json" } : {}),
  }

  const response = await fetch(`${base}/profiles/me`, {
    method: draft ? "PATCH" : "GET",
    credentials: "include",
    cache: "no-store",
    signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
    headers,
    ...(draft
      ? {
          body: JSON.stringify({ ...draft, expectedUpdatedAt: version }),
        }
      : {}),
  })
  if (!response.ok) throw new ProfileRequestError(response.status)
  return response.json()
}
