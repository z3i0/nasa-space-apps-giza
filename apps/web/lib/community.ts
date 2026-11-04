export interface CommunityUser {
  id: string
  name: string
  username?: string | null
  avatar?: string | null
  role?: string | null
}

export interface CommunityAnswerComment {
  id: string
  answerId: string
  authorId: string
  content: string
  createdAt: string
  updatedAt: string
  author: CommunityUser
}

export interface CommunityAnswer {
  id: string
  questionId: string
  authorId: string
  content: string
  isAccepted: boolean
  createdAt: string
  updatedAt: string
  author: CommunityUser
  comments?: CommunityAnswerComment[]
}

export type CommunityCategory =
  | "all"
  | "technical"
  | "platform"
  | "challenge"
  | "general"

export type CommunityStatus =
  | "all"
  | "unanswered"
  | "answered"
  | "resolved"

export interface CommunityQuestion {
  id: string
  title: string
  content: string
  category: "technical" | "platform" | "challenge" | "general"
  status: "unanswered" | "answered" | "resolved"
  images?: string[]
  authorId: string
  answersCount: number
  viewsCount: number
  createdAt: string
  updatedAt: string
  author: CommunityUser
  answers?: CommunityAnswer[]
}

export interface CommunityListResponse {
  items: CommunityQuestion[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CommunityStats {
  totalQuestions: number
  answeredCount: number
  unansweredCount: number
  resolvedCount: number
  totalAnswers: number
  categoryBreakdown: {
    category: string
    count: number
  }[]
}

export class CommunityApiError extends Error {
  constructor(public status: number, message?: string) {
    super(message || `Community request failed (${status})`)
  }
}

export async function communityApi<T>(
  path: string,
  options: {
    method?: string
    body?: unknown
    signal?: AbortSignal
  } = {}
): Promise<T> {
  const response = await fetch(`/api/community${path}`, {
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
    let errorMsg = `Community request failed (${response.status})`
    try {
      const errJson = await response.json()
      if (errJson?.message) {
        errorMsg = Array.isArray(errJson.message)
          ? errJson.message.join(", ")
          : errJson.message
      }
    } catch {
      // ignore json parse error
    }
    throw new CommunityApiError(response.status, errorMsg)
  }

  return response.json()
}

export async function fetchCommunityQuestions(params: {
  category?: string
  status?: string
  q?: string
  page?: number
  limit?: number
  sort?: string
  signal?: AbortSignal
}): Promise<CommunityListResponse> {
  const query = new URLSearchParams()
  if (params.category && params.category !== "all") query.set("category", params.category)
  if (params.status && params.status !== "all") query.set("status", params.status)
  if (params.q) query.set("q", params.q)
  if (params.page) query.set("page", String(params.page))
  if (params.limit) query.set("limit", String(params.limit))
  if (params.sort) query.set("sort", params.sort)

  const queryString = query.toString() ? `?${query.toString()}` : ""
  return communityApi<CommunityListResponse>(`/questions${queryString}`, {
    signal: params.signal,
  })
}

export async function fetchCommunityQuestion(
  id: string,
  signal?: AbortSignal
): Promise<CommunityQuestion> {
  return communityApi<CommunityQuestion>(`/questions/${id}`, { signal })
}

export async function createCommunityQuestion(data: {
  title: string
  content: string
  category?: string
  images?: string[]
}): Promise<CommunityQuestion> {
  return communityApi<CommunityQuestion>("/questions", {
    method: "POST",
    body: data,
  })
}

export async function deleteCommunityQuestion(id: string): Promise<void> {
  return communityApi<void>(`/questions/${id}`, {
    method: "DELETE",
  })
}

export async function updateCommunityQuestion(
  id: string,
  data: {
    title?: string
    content?: string
    category?: string
    images?: string[]
  }
): Promise<CommunityQuestion> {
  return communityApi<CommunityQuestion>(`/questions/${id}`, {
    method: "PATCH",
    body: data,
  })
}

export async function createCommunityAnswer(
  questionId: string,
  content: string
): Promise<CommunityAnswer> {
  return communityApi<CommunityAnswer>(`/questions/${questionId}/answers`, {
    method: "POST",
    body: { content },
  })
}

export async function acceptCommunityAnswer(
  questionId: string,
  answerId: string
): Promise<{ success: boolean; isAccepted: boolean }> {
  return communityApi<{ success: boolean; isAccepted: boolean }>(
    `/questions/${questionId}/answers/${answerId}/accept`,
    {
      method: "PATCH",
    }
  )
}

export async function deleteCommunityAnswer(
  questionId: string,
  answerId: string
): Promise<{ success: boolean }> {
  return communityApi<{ success: boolean }>(
    `/questions/${questionId}/answers/${answerId}`,
    {
      method: "DELETE",
    }
  )
}

export async function fetchCommunityStats(
  signal?: AbortSignal
): Promise<CommunityStats> {
  return communityApi<CommunityStats>("/stats", { signal })
}

// -----------------------------------------------------------------------------
// Feed Posts Types & Client Functions
// -----------------------------------------------------------------------------

export interface CommunityPostComment {
  id: string
  postId: string
  authorId: string
  content: string
  parentId?: string | null
  createdAt: string
  updatedAt: string
  author: CommunityUser
  replies?: CommunityPostComment[]
}

export interface CommunityPost {
  id: string
  title: string
  content: string
  tags: string[]
  images?: string[]
  isPinned: boolean
  authorId: string
  likesCount: number
  commentsCount: number
  isLiked?: boolean
  createdAt: string
  updatedAt: string
  author: CommunityUser
  comments?: CommunityPostComment[]
}

export interface CommunityPostListResponse {
  items: CommunityPost[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function fetchCommunityPosts(params: {
  tag?: string
  q?: string
  sort?: string
  page?: number
  limit?: number
  signal?: AbortSignal
}): Promise<CommunityPostListResponse> {
  const query = new URLSearchParams()
  if (params.tag && params.tag !== "all") query.set("tag", params.tag)
  if (params.q) query.set("q", params.q)
  if (params.sort) query.set("sort", params.sort)
  if (params.page) query.set("page", String(params.page))
  if (params.limit) query.set("limit", String(params.limit))

  const queryString = query.toString() ? `?${query.toString()}` : ""
  return communityApi<CommunityPostListResponse>(`/posts${queryString}`, {
    signal: params.signal,
  })
}

export async function fetchCommunityPost(
  id: string,
  signal?: AbortSignal
): Promise<CommunityPost> {
  return communityApi<CommunityPost>(`/posts/${id}`, { signal })
}

export async function createCommunityPost(data: {
  title: string
  content: string
  tags?: string[]
  images?: string[]
  isPinned?: boolean
}): Promise<CommunityPost> {
  return communityApi<CommunityPost>("/posts", {
    method: "POST",
    body: data,
  })
}

export async function deleteCommunityPost(id: string): Promise<void> {
  return communityApi<void>(`/posts/${id}`, {
    method: "DELETE",
  })
}

export async function updateCommunityPost(
  id: string,
  data: {
    title?: string
    content?: string
    tags?: string[]
    images?: string[]
    isPinned?: boolean
  }
): Promise<CommunityPost> {
  return communityApi<CommunityPost>(`/posts/${id}`, {
    method: "PATCH",
    body: data,
  })
}

export async function createCommunityAnswerComment(
  questionId: string,
  answerId: string,
  content: string
): Promise<CommunityAnswerComment> {
  return communityApi<CommunityAnswerComment>(
    `/questions/${questionId}/answers/${answerId}/comments`,
    {
      method: "POST",
      body: { content },
    }
  )
}

export async function deleteCommunityAnswerComment(
  questionId: string,
  answerId: string,
  commentId: string
): Promise<{ success: boolean }> {
  return communityApi<{ success: boolean }>(
    `/questions/${questionId}/answers/${answerId}/comments/${commentId}`,
    {
      method: "DELETE",
    }
  )
}

export async function toggleLikeCommunityPost(
  id: string,
  targetLiked?: boolean
): Promise<{ isLiked: boolean; likesCount: number }> {
  return communityApi<{ isLiked: boolean; likesCount: number }>(
    `/posts/${id}/like`,
    {
      method: "POST",
      body: targetLiked !== undefined ? { liked: targetLiked } : undefined,
    }
  )
}

export async function createCommunityPostComment(
  postId: string,
  content: string,
  parentId?: string
): Promise<CommunityPostComment> {
  return communityApi<CommunityPostComment>(`/posts/${postId}/comments`, {
    method: "POST",
    body: { content, parentId },
  })
}

export async function deleteCommunityPostComment(
  postId: string,
  commentId: string
): Promise<{ success: boolean }> {
  return communityApi<{ success: boolean }>(`/posts/${postId}/comments/${commentId}`, {
    method: "DELETE",
  })
}

export async function uploadCommunityImages(files: File[]): Promise<string[]> {
  if (!files || files.length === 0) return []
  if (files.length > 4) {
    throw new Error("Maximum 4 images allowed")
  }
  const formData = new FormData()
  for (const file of files) {
    formData.append("files", file)
  }

  const response = await fetch("/api/community/upload-images", {
    method: "POST",
    credentials: "include",
    body: formData,
  })

  if (!response.ok) {
    let errorMsg = `Upload failed (${response.status})`
    try {
      const err = await response.json()
      if (err?.message) {
        errorMsg = Array.isArray(err.message) ? err.message.join(", ") : err.message
      }
    } catch {}
    throw new Error(errorMsg)
  }

  const result = (await response.json()) as { urls: string[] }
  return result.urls || []
}
