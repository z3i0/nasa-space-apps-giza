import type { UserSession } from "./auth"
export interface RoleApplication {
  id: string
  role: string
  status: "pending" | "approved" | "rejected"
  reason: string
  createdAt: string
  user?: { id: string; name: string; email: string }
}

export interface DirectoryTeamMember {
  userId: string
  role: string
  joinedAt?: string
  user: {
    id: string
    name: string
    email?: string
    avatar?: string
  }
}

export interface DirectoryTeamSubmission {
  title: string
  summary?: string
  status: string
  version: number
  projectUrl?: string
  repositoryUrl?: string
  demoUrl?: string
  submittedAt?: string
  updatedAt?: string
}

export interface DirectoryTeam {
  id: string
  name: string
  challenge: string | null
  maxMembers: number
  createdAt?: string
  members: DirectoryTeamMember[]
  submission?: DirectoryTeamSubmission | null
}

export interface DirectoryMentorSlot {
  id: string
  startTime: string
  endTime: string
  teamId?: string | null
}

export interface DirectoryMentor {
  id: string
  name: string
  email: string
  phone?: string | null
  role?: string
  avatar?: string | null
  isActive: boolean
  createdAt: string
  institution?: string | null
  skills: string[]
  bio: string
  availability: string
  slotsCount: number
  activeSlotsCount: number
  bookedSlotsCount: number
  requestsCount: number
  slots?: DirectoryMentorSlot[]
}

export interface DirectoryJudgeAssignedTeam {
  assignmentId: string
  teamId: string
  teamName: string
  challenge?: string | null
  completed: boolean
  rubricName?: string
}

export interface DirectoryJudge {
  id: string
  name: string
  email: string
  phone?: string | null
  role?: string
  avatar?: string | null
  isActive: boolean
  createdAt: string
  institution?: string | null
  skills: string[]
  bio: string
  assignmentsCount: number
  completedAssignmentsCount: number
  pendingAssignmentsCount: number
  assignedTeams: DirectoryJudgeAssignedTeam[]
}

export interface DirectoryParticipant {
  id: string
  name: string
  email: string
  phone?: string | null
  role?: string
  avatar?: string | null
  isActive: boolean
  createdAt?: string
  institution?: string | null
  skills: string[]
  bio?: string
  team?: {
    id: string
    name: string
    challenge?: string | null
    role?: string
  } | null
}

export interface DirectoryResponse<T> {
  items: T[]
  total: number
  page: number
  totalPages: number
}
export interface AccountOverview {
  skills: string[]
  challenge: string | null
  challengeAr?: string | null
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
  bodyOrOptions?: unknown,
  signal?: AbortSignal
): Promise<T> {
  let method = "GET"
  let body: unknown = undefined

  if (bodyOrOptions !== undefined) {
    if (
      typeof bodyOrOptions === "object" &&
      bodyOrOptions !== null &&
      "method" in bodyOrOptions &&
      typeof (bodyOrOptions as { method: string }).method === "string"
    ) {
      const opts = bodyOrOptions as { method: string; body?: unknown }
      method = opts.method.toUpperCase()
      body = opts.body
    } else {
      method = "POST"
      body = bodyOrOptions
    }
  }

  const response = await fetch(`/api/account${path}`, {
    method,
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
        : Array.isArray(result?.message)
          ? result.message.join(", ")
          : `Request failed (${response.status})`
    )
  }
  return response.json()
}
export async function selectAccountRole(
  roleOrEmail?: string,
  expectedEmail?: string
): Promise<UserSession> {
  const role = expectedEmail !== undefined ? roleOrEmail : undefined
  const email =
    (expectedEmail !== undefined ? expectedEmail : roleOrEmail) || ""
  const response = await fetch("/api/auth/me", {
    credentials: "include",
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error("Unable to verify your signed-in account.")
  const user: UserSession = await response.json()
  if (email && user.email.toLowerCase() !== email.trim().toLowerCase())
    throw new Error(
      "The signed-in account does not match this email. Please sign in again."
    )
  const targetRole =
    role ||
    (user.role &&
    (user.roles?.includes(user.role) ||
      ["organizer", "competition", "mentor", "judge", "participant"].includes(
        user.role
      ))
      ? user.role
      : user.roles?.includes("organizer")
        ? "organizer"
        : user.roles?.includes("competition")
          ? "competition"
          : user.roles?.includes("mentor")
            ? "mentor"
            : user.roles?.includes("judge")
              ? "judge"
              : user.roles?.[0] || "participant")
  const selection = await accountApi<{
    role: string
    roles: string[]
    status: string
  }>("/role-selection", { role: targetRole })
  return { ...user, role: selection.role, roles: selection.roles }
}

export interface UnifiedRequestItem {
  id: string
  type: "mentorship" | "team_join" | "team_invitation" | "role_application"
  status: "pending" | "accepted" | "rejected" | "canceled" | "completed"
  rawStatus: string
  requester: {
    id: string
    name: string
    email?: string
    teamName?: string
    role?: string
  }
  responder: {
    id?: string
    name: string
    email?: string
    teamName?: string
    role?: string
  } | null
  title: string
  summary: string
  notes?: string | null
  createdAt: string
  respondedAt: string | null
  durationMinutes: number | null
  messagesCount?: number
}

export interface RequestsTrackingStats {
  totalRequests: number
  pendingCount: number
  acceptedCount: number
  rejectedCount: number
  completedCount: number
  canceledCount: number
  avgResponseTimeMinutes: number
  breakdown: {
    mentorship: number
    team_join: number
    team_invitation: number
    role_application: number
  }
}

export interface RequestsTrackingResponse {
  items: UnifiedRequestItem[]
  total: number
  page: number
  limit: number
  totalPages: number
  stats: RequestsTrackingStats
}

export interface NotificationItem {
  id: string
  userId: string
  title: string
  titleAr?: string | null
  message: string
  messageAr?: string | null
  type: string
  link?: string | null
  isRead: boolean
  createdAt: string
}

export interface NotificationsResponse {
  notifications: NotificationItem[]
  unreadCount: number
}

export interface CompetitionAnalyticsResponse {
  activeUsers: {
    currentCount: number
    breakdownByRole: {
      participants: number
      mentors: number
      judges: number
      organizers: number
    }
    hourlyTrend: {
      hour: string
      total: number
      participants: number
      mentors: number
      judges: number
    }[]
  }
  challenges: {
    totalTeams: number
    assignedTeams: number
    unassignedTeams: number
    distribution: {
      id: string
      slug: string
      title: string
      titleAr: string
      category: string
      difficulty: string
      teamsCount: number
      participantsCount: number
      percentage: number
    }[]
  }
  community: {
    totalQuestions: number
    answeredCount: number
    unansweredCount: number
    answerRate: number
    categoryBreakdown: {
      category: string
      total: number
      answered: number
      unanswered: number
    }[]
    topContributors: {
      id: string
      name: string
      avatar: string | null
      role: string
      questionsCount: number
      answersCount: number
      score: number
    }[]
  }
  mentors: {
    totalRequests: number
    acceptedCount: number
    completedCount: number
    rejectedCount: number
    pendingCount: number
    bookedSlotsCount: number
    acceptanceRate: number
    rejectionRate: number
    avgSatisfaction: number
    topMentors: {
      id: string
      name: string
      avatar: string | null
      expertise: string[]
      sessionsCount: number
      totalRequests: number
      acceptanceRate: number
      rating: number
      topics: string[]
    }[]
  }
  judges: {
    totalAssignments: number
    completedCount: number
    pendingCount: number
    completionRate: number
    averageScoreOverall: number | null
    scoreBuckets: Record<string, number>
    judgePerformance: {
      id: string
      name: string
      email: string
      avatar: string | null
      assignedCount: number
      completedCount: number
      pendingCount: number
      completionRate: number
      averageScore: number | null
    }[]
  }
}

