export interface MentorSlot {
  id: string
  startTime: string
  endTime: string
}
export interface Mentor {
  id: string
  name: string
  avatar: string | null
  mentorProfile: {
    expertise: string[]
    availability: string
    bio: string
  } | null
  profile: { bio: string | null; skills: string[] } | null
  mentorSlots: MentorSlot[]
}
export interface MentorshipRequest {
  id: string
  teamId: string
  mentorId: string
  topic: string
  sessionNotes: string | null
  status: "pending" | "accepted" | "declined" | "canceled" | "completed"
  createdAt: string
  updatedAt: string
  team: { id: string; name: string }
  mentor: Mentor
  slot: MentorSlot | null
  _count: { messages: number }
}
export interface MentorshipMessage {
  id: string
  senderId: string
  content: string
  createdAt: string
  sender: { name: string; avatar: string | null }
}
export class MentorshipApiError extends Error {
  constructor(public status: number) {
    super(`Mentorship request failed (${status})`)
  }
}
export async function mentorshipApi<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<T> {
  const response = await fetch(`/api/mentorship${path}`, {
    method: options.method || "GET",
    credentials: "include",
    cache: "no-store",
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
    ...(options.body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options.body),
        }),
  })
  if (!response.ok) throw new MentorshipApiError(response.status)
  return response.json()
}
