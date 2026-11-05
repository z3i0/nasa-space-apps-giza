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

export function normalizePhone(value: string): string {
  return value
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/[\s()-]/g, "")
}

export const phonePattern = /^\+?[0-9]{7,15}$/

export class ProfileRequestError extends Error {
  public details?: string[] | string
  public raw?: unknown

  constructor(
    public status: number,
    details?: string[] | string,
    raw?: unknown
  ) {
    const message = Array.isArray(details)
      ? details.join(". ")
      : typeof details === "string"
        ? details
        : `Profile request failed (${status})`
    super(message)
    this.name = "ProfileRequestError"
    this.details = details
    this.raw = raw
  }
}

// One bounded request per load/save. Browser session cookies are validated by
// the API guard; local role hints are never sent as authorization.
export async function requestProfile(
  signal: AbortSignal,
  draft?: ProfileDraft,
  version?: string
): Promise<ParticipantProfile> {
  const payload = draft
    ? {
        ...draft,
        phone:
          draft.phone && draft.phone.trim()
            ? normalizePhone(draft.phone)
            : undefined,
        expectedUpdatedAt: version,
      }
    : undefined

  const timeout =
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(15_000)
      : undefined

  const requestSignal =
    signal && timeout && typeof AbortSignal.any === "function"
      ? AbortSignal.any([signal, timeout])
      : signal || timeout

  const response = await fetch(`/api/profiles/me`, {
    method: draft ? "PATCH" : "GET",
    credentials: "include",
    cache: "no-store",
    signal: requestSignal,
    ...(payload
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      : {}),
  })

  if (!response.ok) {
    let errorData: any = null
    try {
      errorData = await response.json()
    } catch {
      // response might be empty or non-JSON
    }

    const message = errorData?.message || errorData?.error
    console.error("[Profile Request Error]", {
      url: "/api/profiles/me",
      method: draft ? "PATCH" : "GET",
      status: response.status,
      statusText: response.statusText,
      errorData,
      payload,
    })

    throw new ProfileRequestError(response.status, message, errorData)
  }

  return response.json()
}
