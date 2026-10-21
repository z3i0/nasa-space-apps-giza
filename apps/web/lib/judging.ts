export interface Rubric {
  id: string
  name: string
  criteria: { name: string; weight: number }[]
}
export interface Assignment {
  id: string
  judgeId: string
  teamId: string
  rubricId: string
  submissionVersion: number
  snapshot: {
    teamName: string
    title: string
    summary: string
    challenge: string
    projectUrl: string
    repositoryUrl: string
    demoUrl: string
  }
  rubric: Rubric
  scores: Record<string, number>
  feedback: string
  completed: boolean
  version: number
  judge?: { name: string }
}
export interface Ranking {
  teamId: string
  teamName: string
  score: number
  rank: number
  evaluations: number
  assigned: number
}
export interface Publication {
  results: Ranking[]
  publishedAt: string
}
export interface Management {
  rubrics: Rubric[]
  judges: { id: string; name: string }[]
  teams: {
    id: string
    name: string
    submission: { title: string; version: number }
  }[]
  assignments: Assignment[]
  rankings: Ranking[]
  publication: Publication | null
}
export async function judgingApi<T>(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(`/api/judging${path}`, {
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
    const data = await response.json().catch(() => null)
    throw new Error(
      typeof data?.message === "string"
        ? data.message
        : `Request failed (${response.status})`
    )
  }
  const text = await response.text()
  // Older API instances return an empty 200 when results are unpublished.
  if (!text.trim() && path === "/results" && method === "GET") return null as T
  if (!text.trim())
    throw new Error(
      "The judging API returned an empty response. Please try again."
    )
  return JSON.parse(text) as T
}
export function evaluationScore(assignment: Assignment) {
  return assignment.rubric.criteria.reduce(
    (sum, c, i) => sum + ((assignment.scores[String(i)] || 0) * c.weight) / 10,
    0
  )
}
