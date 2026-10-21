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
    (user.roles?.includes("organizer")
      ? "organizer"
      : user.roles?.includes("judge")
        ? "judge"
        : user.roles?.includes("mentor")
          ? "mentor"
          : user.role && user.role !== "participant"
            ? user.role
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

