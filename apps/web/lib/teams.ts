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
  username?: string | null
  profile?: ApplicantProfile | null
}

export interface TeamUser {
  id: string
  name: string
  username?: string | null
  email?: string
  avatar?: string | null
  phone?: string | null
  profile?: {
    desiredRole: string | null
    skills: string[]
    bio: string | null
    interests: string[]
  } | null
}

export interface TeamMember {
  id: string
  userId: string
  role: "leader" | "member"
  assignedRole: string | null
  joinedAt?: string
  user?: (TeamContact & TeamUser) | TeamContact | TeamUser
}

export type TaskStatus = "not_started" | "in_progress" | "completed"

export interface TeamTask {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  assignedToId: string | null
  dueDate: string | null
  createdAt?: string
  updatedAt?: string
  assignedTo?: {
    id: string
    name: string
    avatar?: string | null
  } | null
}

export interface Team {
  id: string
  name: string
  description: string | null
  challenge: string | null
  challengeId?: string | null
  challengeNeedsReview?: boolean
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

export interface TeamInvitation {
  id: string
  teamId: string
  invitedUserId: string
  invitedByUserId: string
  status: "pending" | "accepted" | "rejected" | "canceled"
  createdAt: string
  invitedUser?: TeamUser
}

export interface TeamJoinRequest {
  id: string
  teamId: string
  userId: string
  status: "pending" | "accepted" | "rejected" | "canceled"
  message?: string | null
  createdAt: string
  user?: TeamUser
}

export interface TeamDetails {
  id: string
  name: string
  description: string | null
  challenge: string | null
  track: string | null
  createdById: string
  maxMembers: number
  submissionStatus: "not_started" | "draft" | "submitted"
  updatedAt: string
  membersCount: number
  members: TeamMember[]
  tasks: TeamTask[]
  invitations?: TeamInvitation[]
  joinRequests?: TeamJoinRequest[]
}

export interface TeamListItem {
  id: string
  name: string
  description: string | null
  challenge: string | null
  track: string | null
  createdById: string
  maxMembers: number
  submissionStatus: "not_started" | "draft" | "submitted"
  createdAt: string
  membersCount: number
  members?: Array<{
    id: string
    userId: string
    role: "leader" | "member"
    assignedRole: string | null
    user?: {
      id: string
      name: string
      avatar?: string | null
    }
  }>
}

export interface CreateTeamInput {
  name: string
  description?: string
  challenge?: string
  track?: string
  assignedRole?: string
}

export interface UpdateTeamInput {
  name?: string
  description?: string
  challenge?: string
  track?: string
  submissionStatus?: "not_started" | "draft" | "submitted"
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

export class TeamsRequestError extends Error {
  constructor(
    public status: number,
    message?: string
  ) {
    super(message || `Teams request failed (${status})`)
  }
}

export class TeamRequestError extends Error {
  constructor(
    public status: number,
    public code?: string
  ) {
    super(`Team request failed (${status})`)
  }
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

// Route browser requests through Next so the same session cookie is used everywhere.
function getApiBase(): string {
  return "/api"
}
function getAuthHeaders(hasBody = false): Record<string, string> {
  return hasBody ? { "Content-Type": "application/json" } : {}
}

export async function fetchMyTeam(
  signal?: AbortSignal
): Promise<{ team: TeamDetails | null }> {
  const base = getApiBase()
  const headers = getAuthHeaders()

  const response = await fetch(`${base}/teams/me`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
    headers,
  })

  if (!response.ok) {
    throw new TeamsRequestError(response.status)
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
}

export async function fetchTeams(
  params: {
    search?: string
    track?: string
    challenge?: string
    hasAvailableSlots?: boolean
    page?: number
    limit?: number
  } = {},
  signal?: AbortSignal
): Promise<{
  teams: TeamListItem[]
  items: TeamListItem[]
  total: number
  page: number
  limit: number
}> {
  const base = getApiBase()
  const query = new URLSearchParams()
  if (params.search) query.set("search", params.search)
  if (params.track && params.track !== "all") {
    const trackMapping: Record<string, string> = {
      earthScience: "Earth Science",
      spaceDebris: "Space Debris",
      astrophysics: "Astrophysics",
      solarPhysics: "Solar Physics",
      openData: "Open Data",
    }
    query.set("track", trackMapping[params.track] || params.track)
  }
  if (params.challenge) query.set("challenge", params.challenge)
  if (params.hasAvailableSlots) query.set("hasAvailableSlots", "true")
  if (params.page) query.set("page", params.page.toString())
  if (params.limit) query.set("limit", params.limit.toString())

  const response = await fetch(`${base}/teams?${query.toString()}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new TeamsRequestError(response.status)
  }

  const data = await response.json()
  const items: TeamListItem[] = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.teams)
      ? data.teams
      : Array.isArray(data)
        ? data
        : []

  return {
    teams: items,
    items,
    total: typeof data.total === "number" ? data.total : items.length,
    page: typeof data.page === "number" ? data.page : 1,
    limit: typeof data.limit === "number" ? data.limit : 20,
  }
}

export async function fetchTeamById(
  teamId: string,
  signal?: AbortSignal
): Promise<TeamDetails> {
  const base = getApiBase()
  const response = await fetch(`${base}/teams/${encodeURIComponent(teamId)}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new TeamsRequestError(response.status)
  }

  return response.json()
}

export async function createTeam(input: CreateTeamInput): Promise<TeamDetails> {
  const base = getApiBase()
  const response = await fetch(`${base}/teams`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(true),
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new TeamsRequestError(
      response.status,
      errorData.message || `Failed to create team (${response.status})`
    )
  }

  return response.json()
}

export async function updateTeam(
  teamId: string,
  input: UpdateTeamInput
): Promise<TeamDetails> {
  const base = getApiBase()
  const response = await fetch(`${base}/teams/${encodeURIComponent(teamId)}`, {
    method: "PUT",
    credentials: "include",
    headers: getAuthHeaders(true),
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new TeamsRequestError(
      response.status,
      errorData.message || `Failed to update team (${response.status})`
    )
  }

  return response.json()
}

export async function requestToJoinTeam(
  teamId: string,
  message?: string
): Promise<{ success: boolean }> {
  const base = getApiBase()
  const response = await fetch(`${base}/teams/${teamId}/join-requests`, {
    method: "POST",
    credentials: "include",
    headers: getAuthHeaders(true),
    body: JSON.stringify({ message: message || "" }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new TeamsRequestError(
      response.status,
      errorData.message || `Failed to request join (${response.status})`
    )
  }

  return response.json()
}

export async function leaveTeam(
  teamId: string,
  userId: string
): Promise<{ success: boolean }> {
  const base = getApiBase()
  const response = await fetch(`${base}/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
    credentials: "include",
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new TeamsRequestError(
      response.status,
      errorData.message || `Failed to leave team (${response.status})`
    )
  }

  return response.json()
}

export async function removeTeamMember(
  teamId: string,
  userId: string
): Promise<{ success: boolean }> {
  return leaveTeam(teamId, userId)
}

export async function transferLeadership(
  teamId: string,
  userId: string
): Promise<{ success: boolean }> {
  const base = getApiBase()
  const response = await fetch(
    `${base}/teams/${encodeURIComponent(teamId)}/members/${userId}/transfer-leadership`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new TeamsRequestError(
      response.status,
      errorData.message || `Failed to transfer leadership (${response.status})`
    )
  }

  return response.json()
}

export async function inviteMember(
  teamId: string,
  username: string,
  role?: string
): Promise<{ success: boolean }> {
  const base = getApiBase()
  const response = await fetch(
    `${base}/teams/${encodeURIComponent(teamId)}/invitations`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(true),
      body: JSON.stringify({ username: username.trim(), role }),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new TeamsRequestError(
      response.status,
      errorData.message || `Failed to invite member (${response.status})`
    )
  }

  return response.json()
}

export interface MyTeamInvitation {
  id: string
  teamId: string
  status: "pending" | "accepted" | "rejected" | "canceled"
  createdAt: string
  team: { id: string; name: string; track: string | null }
  invitedByUser: { id: string; name: string; username: string | null }
}

export async function fetchMyInvitations(
  signal?: AbortSignal
): Promise<{ invitations: MyTeamInvitation[] }> {
  const base = getApiBase()
  const response = await fetch(`${base}/teams/invitations/me`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new TeamsRequestError(response.status)
  }

  return response.json()
}

export async function respondToInvitation(
  invitationId: string,
  accept: boolean
): Promise<{ success: boolean }> {
  const base = getApiBase()
  const response = await fetch(
    `${base}/teams/invitations/${invitationId}/respond`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(true),
      body: JSON.stringify({ accept }),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new TeamsRequestError(
      response.status,
      errorData.message ||
        `Failed to respond to invitation (${response.status})`
    )
  }

  return response.json()
}

export async function respondToJoinRequest(
  requestId: string,
  accept: boolean
): Promise<{ success: boolean }> {
  const base = getApiBase()
  const response = await fetch(
    `${base}/teams/join-requests/${requestId}/respond`,
    {
      method: "POST",
      credentials: "include",
      headers: getAuthHeaders(true),
      body: JSON.stringify({ accept }),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new TeamsRequestError(
      response.status,
      errorData.message || `Failed to respond to request (${response.status})`
    )
  }

  return response.json()
}
