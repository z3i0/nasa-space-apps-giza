export interface ApplicantProfile {
  bio: string | null
  skills: string[]
  interests: string[]
  experience: string | null
  desiredRole: string | null
  institution: string | null
  academicLevel: string | null
  preferredChallenge: string | null
  githubUrl: string | null
  linkedinUrl: string | null
  portfolioUrl: string | null
}

export interface TeamContact {
  id?: string
  name: string
  avatar?: string | null
  phone?: string | null
  profile?: ApplicantProfile | null
}

export interface TeamMember {
  id: string
  userId: string
  role: "leader" | "member"
  assignedRole: string | null
  user?: TeamContact & { id: string; avatar: string | null }
}

export interface Team {
  id: string
  name: string
  description: string | null
  challenge: string | null
  track: string | null
  maxMembers: number
  membersCount: number
  myRole?: "leader" | "member"
  members: TeamMember[]
  tasks?: TeamTask[]
  invitations?: { id: string; invitedUser?: { name: string } }[]
  joinRequests?: {
    id: string
    message: string | null
    user?: TeamContact
  }[]
}

export type TaskStatus = "not_started" | "in_progress" | "completed"
export interface TeamTask {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  assignedToId: string | null
  dueDate: string | null
}

export interface SubmissionDraft {
  title: string
  summary: string
  challenge: string
  projectUrl: string
  repositoryUrl: string
  demoUrl: string
}
export interface SubmissionState {
  submission:
    | (SubmissionDraft & {
        status: "draft" | "submitted"
        version: number
        submittedAt: string | null
        updatedAt: string
      })
    | null
  deadline: string | null
  canEdit: boolean
}

export interface TeamDraft {
  name: string
  description: string
  challenge: string
  track: string
}

export interface TeamInbox {
  invitations: { id: string; teamId: string; team: { name: string } }[]
  joinRequests: { id: string; teamId: string; team: { name: string } }[]
}

export interface TeamSearch {
  items: Team[]
  total: number
  page: number
  totalPages: number
}

export class TeamRequestError extends Error {
  constructor(
    public status: number,
    public code?: string
  ) {
    super(`Team request failed (${status})`)
  }
}

export async function requestTeams<T>(
  path = "",
  options: {
    method?: string
    body?: unknown
    signal?: AbortSignal
  } = {}
): Promise<T> {
  const timeout = AbortSignal.timeout(15_000)
  const response = await fetch(`/api/teams${path}`, {
    method: options.method || "GET",
    credentials: "include",
    cache: "no-store",
    signal: options.signal
      ? AbortSignal.any([options.signal, timeout])
      : timeout,
    ...(options.body !== undefined
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options.body),
        }
      : {}),
  })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new TeamRequestError(response.status, error?.code)
  }
  return response.json()
}

export function teamErrorKey(error: unknown) {
  if (!(error instanceof TeamRequestError)) return "requestError"
  if (error.code === "CONTACT_REQUIRED") return "contactRequired"
  if (error.code === "APPLICANT_CONTACT_REQUIRED")
    return "applicantContactRequired"
  switch (error.status) {
    case 401:
      return "sessionExpired"
    case 403:
      return "forbidden"
    case 409:
      return "conflict"
    case 400:
      return "validationError"
    case 404:
      return "notFound"
    default:
      return "requestError"
  }
}
