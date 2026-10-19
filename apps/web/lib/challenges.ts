export type Difficulty = "beginner" | "intermediate" | "advanced"
export interface ChallengeCard {
  id: string
  slug: string
  title: string
  titleAr: string | null
  summary: string
  summaryAr: string | null
  category: string
  difficulty: Difficulty
  year: number
  tags: string[]
  isPublished: boolean
  isArchived: boolean
  isDemo: boolean
  version: number
  saved: boolean
}
export interface Challenge extends ChallengeCard {
  description: string
  descriptionAr: string | null
  sourceUrl: string | null
  resources: { id?: string; label: string; url: string }[]
}
export interface ChallengeList {
  items: ChallengeCard[]
  total: number
  page: number
  totalPages: number
  categories: string[]
  years: number[]
}
export interface ChallengeSelection {
  team: {
    id: string
    name: string
    challengeId: string | null
    challenge: string | null
    canSelect: boolean
  } | null
}
export interface LegacyChoices {
  items: { id: string; name: string; challenge: string }[]
  total: number
  page: number
  totalPages: number
}
export interface ChallengeDraft {
  title: string
  titleAr: string
  summary: string
  summaryAr: string
  description: string
  descriptionAr: string
  category: string
  difficulty: Difficulty
  year: number
  tags: string[]
  sourceUrl?: string
  isPublished: boolean
  isArchived: boolean
  resources: { label: string; url: string }[]
  expectedVersion?: number
}
export class ChallengeApiError extends Error {
  constructor(
    public status: number,
    public code?: string
  ) {
    super(`Challenge request failed (${status})`)
  }
}
export async function challengesApi<T>(
  path = "",
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {}
): Promise<T> {
  const response = await fetch(`/api/challenges${path}`, {
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
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new ChallengeApiError(response.status, data?.code)
  }
  return response.json()
}
export function challengeError(error: unknown) {
  if (!(error instanceof ChallengeApiError)) return "error"
  if (error.code === "SUBMISSION_CLOSED") return "deadlinePassed"
  return (
    (
      {
        401: "sessionExpired",
        403: "forbidden",
        404: "unavailable",
        409: "conflict",
        400: "invalid",
      } as Record<number, string>
    )[error.status] || "error"
  )
}
export function localizedChallenge(record: ChallengeCard, locale: string) {
  return {
    title: locale === "ar" && record.titleAr ? record.titleAr : record.title,
    summary:
      locale === "ar" && record.summaryAr ? record.summaryAr : record.summary,
  }
}
