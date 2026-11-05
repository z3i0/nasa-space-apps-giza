"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"
import {
  MessagesSquare,
  Plus,
  CheckCircle2,
  Clock,
  HelpCircle,
  RotateCcw,
  MessageSquare,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import {
  CommunitySearch,
  CommunitySelect,
  CommunityViewToggle,
} from "./community-controls"
import {
  fetchCommunityQuestions,
  fetchCommunityStats,
  fetchCommunityPosts,
  type CommunityQuestion,
  type CommunityStats,
  type CommunityPost,
} from "@/lib/community"
import { QuestionCard } from "./question-card"
import { QuestionThread } from "./question-thread"
import { PostCard } from "./post-card"
import { useAuthUser } from "@/lib/auth"

export function CommunityHub({
  basePath = "/dashboard/participant/community",
}: {
  basePath?: string
} = {}) {
  const t = useTranslations("Community")
  const locale = useLocale()
  const router = useRouter()
  const isRtl = locale === "ar"
  const currentUser = useAuthUser()

  const isOrganizer = Boolean(
    basePath.includes("/dashboard/organizer") ||
    (currentUser &&
      (currentUser.role === "organizer" ||
        currentUser.role === "admin" ||
        currentUser.role === "competition" ||
        currentUser.roles?.includes("organizer") ||
        currentUser.roles?.includes("competition") ||
        currentUser.roles?.includes("admin")))
  )

  // Top-Level Active Tab: "feed" or "qa" (initialized to "feed" for SSR consistency)
  const [activeTab, setActiveTab] = useState<"feed" | "qa">("feed")

  // Q&A States
  const [questions, setQuestions] = useState<CommunityQuestion[]>([])
  const [stats, setStats] = useState<CommunityStats | null>(null)
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [questionError, setQuestionError] = useState("")
  const [questionSearch, setQuestionSearch] = useState("")
  const [debouncedQuestionSearch, setDebouncedQuestionSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedQuestionSort, setSelectedQuestionSort] =
    useState<string>("newest")
  const [questionPage, setQuestionPage] = useState(1)
  const [questionTotalPages, setQuestionTotalPages] = useState(1)
  const [questionTotal, setQuestionTotal] = useState(0)
  const [questionRetry, setQuestionRetry] = useState(0)

  // Feed / Posts States
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [postError, setPostError] = useState("")
  const [postSearch, setPostSearch] = useState("")
  const [debouncedPostSearch, setDebouncedPostSearch] = useState("")
  const [selectedTag, setSelectedTag] = useState<string>("all")
  const [selectedPostSort, setSelectedPostSort] = useState<string>("newest")
  const [postPage, setPostPage] = useState(1)
  const [postTotalPages, setPostTotalPages] = useState(1)
  const [postTotal, setPostTotal] = useState(0)
  const [postRetry, setPostRetry] = useState(0)
  const [knownTags, setKnownTags] = useState<string[]>([])

  // Both feeds start in grid view; users can switch to a list.
  const [feedViewMode, setFeedViewMode] = useState<"grid" | "list">("grid")
  const [qaViewMode, setQaViewMode] = useState<"grid" | "list">("grid")

  // Deep-linked Question ID (backward compatibility)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null
  )

  // Synchronize tab and questionId from URL on client mount (prevents SSR hydration error)
  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get("tab")
    if (tabParam === "feed" || tabParam === "qa") {
      setActiveTab(tabParam)
    }
    const qIdParam = params.get("questionId")
    if (qIdParam) {
      setSelectedQuestionId(qIdParam)
    }
  }, [])

  const handleBackFromThread = () => {
    setSelectedQuestionId(null)
    setActiveTab("qa")
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, "", `${window.location.pathname}?tab=qa`)
    }
  }

  // Switch tab and sync with URL query
  const handleTabChange = (tab: "feed" | "qa") => {
    setActiveTab(tab)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", tab)
      window.history.replaceState({}, "", url.toString())
    }
  }

  // Debounce Q&A Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuestionSearch(questionSearch)
      setQuestionPage(1)
    }, 350)
    return () => clearTimeout(handler)
  }, [questionSearch])

  // Debounce Post Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPostSearch(postSearch)
      setPostPage(1)
    }, 350)
    return () => clearTimeout(handler)
  }, [postSearch])

  // Fetch Q&A Questions
  useEffect(() => {
    if (activeTab !== "qa") return
    setLoadingQuestions(true)
    setQuestionError("")
    let ignore = false
    const abortController = new AbortController()

    Promise.all([
      fetchCommunityQuestions({
        category: selectedCategory,
        status: selectedStatus,
        q: debouncedQuestionSearch,
        sort: selectedQuestionSort,
        page: questionPage,
        limit: 12,
        signal: abortController.signal,
      }),
      isOrganizer
        ? fetchCommunityStats(abortController.signal).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([listRes, statsRes]) => {
        if (!ignore) {
          setQuestions(listRes.items || [])
          setQuestionTotalPages(listRes.totalPages || 1)
          setQuestionTotal(listRes.total || 0)
          if (statsRes) setStats(statsRes)
          setQuestionError("")
          setLoadingQuestions(false)
        }
      })
      .catch(() => {
        if (!ignore && !abortController.signal.aborted) {
          setQuestionError(t("error"))
          setLoadingQuestions(false)
        }
      })

    return () => {
      ignore = true
      abortController.abort()
    }
  }, [
    activeTab,
    selectedCategory,
    selectedStatus,
    debouncedQuestionSearch,
    selectedQuestionSort,
    questionPage,
    questionRetry,
    isOrganizer,
    t,
  ])

  // Fetch Feed Posts
  useEffect(() => {
    if (activeTab !== "feed") return
    setLoadingPosts(true)
    setPostError("")
    let ignore = false
    const abortController = new AbortController()

    fetchCommunityPosts({
      tag: selectedTag,
      q: debouncedPostSearch,
      sort: selectedPostSort,
      page: postPage,
      limit: 12,
      signal: abortController.signal,
    })
      .then((res) => {
        if (!ignore) {
          setPosts(res.items || [])
          setPostTotalPages(res.totalPages || 1)
          setPostTotal(res.total || 0)
          setKnownTags((previous) =>
            Array.from(
              new Set([
                ...previous,
                ...res.items.flatMap((post) => post.tags || []),
              ])
            ).sort()
          )
          setPostError("")
          setLoadingPosts(false)
        }
      })
      .catch(() => {
        if (!ignore && !abortController.signal.aborted) {
          setPostError(t("error"))
          setLoadingPosts(false)
        }
      })

    return () => {
      ignore = true
      abortController.abort()
    }
  }, [
    activeTab,
    selectedTag,
    debouncedPostSearch,
    selectedPostSort,
    postPage,
    postRetry,
    t,
  ])

  const categories = [
    { id: "all", label: t("allCategories") },
    { id: "technical", label: t("technical") },
    { id: "platform", label: t("platform") },
    { id: "challenge", label: t("challenge") },
    { id: "general", label: t("general") },
  ]

  const statuses = [
    { id: "all", label: t("allStatuses") },
    { id: "unanswered", label: t("statusUnanswered") },
    { id: "answered", label: t("statusAnswered") },
    { id: "resolved", label: t("statusResolved") },
  ]

  const questionSortOptions = [
    { id: "newest", label: t("newest") },
    { id: "most_answers", label: t("mostAnswers") },
    { id: "most_views", label: t("mostViews") },
    { id: "oldest", label: t("oldest") },
  ]

  const postSortOptions = [
    { id: "newest", label: t("newest") },
    { id: "most_likes", label: t("mostLikes") },
    { id: "most_comments", label: t("mostComments") },
    { id: "oldest", label: t("oldest") },
  ]

  const isQa = activeTab === "qa"
  const loading = isQa ? loadingQuestions : loadingPosts
  const error = isQa ? questionError : postError
  const total = isQa ? questionTotal : postTotal
  const page = isQa ? questionPage : postPage
  const totalPages = isQa ? questionTotalPages : postTotalPages
  const view = isQa ? qaViewMode : feedViewMode
  const hasFilters = isQa
    ? Boolean(
        questionSearch ||
        selectedCategory !== "all" ||
        selectedStatus !== "all" ||
        selectedQuestionSort !== "newest"
      )
    : Boolean(
        postSearch || selectedTag !== "all" || selectedPostSort !== "newest"
      )
  const resetFilters = () => {
    if (isQa) {
      setQuestionSearch("")
      setDebouncedQuestionSearch("")
      setSelectedCategory("all")
      setSelectedStatus("all")
      setSelectedQuestionSort("newest")
      setQuestionPage(1)
    } else {
      setPostSearch("")
      setDebouncedPostSearch("")
      setSelectedTag("all")
      setSelectedPostSort("newest")
      setPostPage(1)
    }
  }
  const createContent = () =>
    router.push(`${basePath}/${isQa ? "new" : "posts/new"}` as `/${string}`)
  const layout =
    view === "grid"
      ? isQa
        ? "grid grid-cols-1 gap-3 md:grid-cols-2"
        : "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
      : "flex flex-col gap-3"

  return (
    <div className="w-full min-w-0 space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        icon={MessagesSquare}
        actions={
          <Button onClick={createContent} size="sm">
            <Plus className="size-4" />
            {t(isQa ? "askQuestion" : "createPost")}
          </Button>
        }
      />
      {selectedQuestionId ? (
        <QuestionThread
          questionId={selectedQuestionId}
          baseRoute={basePath}
          onBack={handleBackFromThread}
          onQuestionDeleted={handleBackFromThread}
          isRtl={isRtl}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
            <div
              role="group"
              aria-label={t("browseCommunity")}
              className="inline-flex gap-1 rounded-lg bg-muted p-1"
            >
              {(["feed", "qa"] as const).map((tab) => {
                const Icon = tab === "feed" ? MessageSquare : HelpCircle
                return (
                  <Button
                    key={tab}
                    size="sm"
                    variant="ghost"
                    aria-pressed={activeTab === tab}
                    onClick={() => handleTabChange(tab)}
                    className={
                      activeTab === tab
                        ? "bg-background text-primary shadow-sm"
                        : "text-muted-foreground"
                    }
                  >
                    <Icon className="size-4" />
                    {t(tab === "feed" ? "tabFeed" : "tabQa")}
                  </Button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {t(isQa ? "tabQaDesc" : "tabFeedDesc")}
            </p>
          </div>

          {isQa && isOrganizer && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                {
                  label: t("totalQuestions"),
                  value: stats?.totalQuestions,
                  Icon: HelpCircle,
                  color: "text-primary",
                },
                {
                  label: t("resolvedQuestions"),
                  value: stats?.resolvedCount,
                  Icon: CheckCircle2,
                  color: "text-emerald-600 dark:text-emerald-400",
                },
                {
                  label: t("unansweredQuestions"),
                  value: stats?.unansweredCount,
                  Icon: Clock,
                  color: "text-amber-600 dark:text-amber-400",
                },
                {
                  label: t("totalAnswers"),
                  value: stats?.totalAnswers,
                  Icon: MessageSquare,
                  color: "text-primary",
                },
              ].map(({ label, value, Icon, color }) => (
                <Card
                  key={label}
                  className="flex-row items-center gap-3 p-3 shadow-none"
                >
                  <Icon className={`size-4 shrink-0 ${color}`} />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {value ?? "--"}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Card className="gap-3 p-3 shadow-none sm:p-4">
            <div className="flex items-center gap-2">
              <CommunitySearch
                value={isQa ? questionSearch : postSearch}
                onChange={isQa ? setQuestionSearch : setPostSearch}
                placeholder={t(
                  isQa ? "searchPlaceholder" : "searchPostsPlaceholder"
                )}
              />
              <CommunityViewToggle
                value={view}
                onChange={isQa ? setQaViewMode : setFeedViewMode}
              />
            </div>
            <div
              className={`grid items-end gap-3 ${isQa ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}
            >
              {isQa ? (
                <>
                  <CommunitySelect
                    label={t("fieldCategory")}
                    value={selectedCategory}
                    options={categories}
                    onChange={(value) => {
                      setSelectedCategory(value)
                      setQuestionPage(1)
                    }}
                  />
                  <CommunitySelect
                    label={t("answerStatus")}
                    value={selectedStatus}
                    options={statuses}
                    onChange={(value) => {
                      setSelectedStatus(value)
                      setQuestionPage(1)
                    }}
                  />
                </>
              ) : (
                <CommunitySelect
                  label={t("filterByTag")}
                  value={selectedTag}
                  options={[
                    { id: "all", label: t("allTags") },
                    ...Array.from(
                      new Set([
                        ...knownTags,
                        ...(selectedTag === "all" ? [] : [selectedTag]),
                      ])
                    ).map((tag) => ({ id: tag, label: `#${tag}` })),
                  ]}
                  onChange={(value) => {
                    setSelectedTag(value)
                    setPostPage(1)
                  }}
                />
              )}
              <CommunitySelect
                label={t("sortBy")}
                value={isQa ? selectedQuestionSort : selectedPostSort}
                options={isQa ? questionSortOptions : postSortOptions}
                onChange={(value) => {
                  if (isQa) {
                    setSelectedQuestionSort(value)
                    setQuestionPage(1)
                  } else {
                    setSelectedPostSort(value)
                    setPostPage(1)
                  }
                }}
              />
            </div>
            {isQa && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("statusGuide")}
              </p>
            )}
          </Card>

          <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
            <p
              role="status"
              aria-live="polite"
              className="text-xs text-muted-foreground"
            >
              {loading
                ? t("loading")
                : error
                  ? t("resultsUnavailable")
                  : t(isQa ? "questionResults" : "postResults", {
                      count: total,
                    })}
            </p>
            {hasFilters && (
              <Button
                size="sm"
                variant="ghost"
                onClick={resetFilters}
                className="h-8 text-xs"
              >
                <X className="size-3.5" />
                {t("clearFilters")}
              </Button>
            )}
          </div>

          <div aria-busy={loading}>
            {loading ? (
              <div className={layout}>
                {Array.from({ length: 4 }, (_, index) => (
                  <Card key={index} className="gap-3 p-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </Card>
                ))}
              </div>
            ) : error ? (
              <Card className="items-center gap-3 p-8 text-center">
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    isQa
                      ? setQuestionRetry((value) => value + 1)
                      : setPostRetry((value) => value + 1)
                  }
                >
                  <RotateCcw className="size-4" />
                  {t("retry")}
                </Button>
              </Card>
            ) : total === 0 ? (
              <Card className="items-center gap-2 border border-dashed p-8 text-center shadow-none">
                <HelpCircle className="mb-1 size-6 text-muted-foreground" />
                <h2 className="font-semibold">
                  {t(isQa ? "emptyTitle" : "emptyPostsTitle")}
                </h2>
                <p className="max-w-md text-sm text-muted-foreground">
                  {t(
                    hasFilters
                      ? "emptyFiltered"
                      : isQa
                        ? "emptyDesc"
                        : "emptyPostsDesc"
                  )}
                </p>
                <Button
                  size="sm"
                  variant={hasFilters ? "outline" : "default"}
                  onClick={hasFilters ? resetFilters : createContent}
                  className="mt-2"
                >
                  {t(
                    hasFilters
                      ? "clearFilters"
                      : isQa
                        ? "askQuestion"
                        : "createPost"
                  )}
                </Button>
              </Card>
            ) : (
              <div className={layout}>
                {isQa
                  ? questions.map((question) => (
                      <QuestionCard
                        key={question.id}
                        question={question}
                        href={`${basePath}/${question.id}`}
                        compact={view === "list"}
                      />
                    ))
                  : posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        href={`${basePath}/posts/${post.id}`}
                      />
                    ))}
              </div>
            )}
          </div>

          {totalPages > 1 && !error && (
            <nav
              aria-label={t("pagination")}
              className="flex items-center justify-center gap-3 pt-2"
            >
              <Button
                variant="outline"
                size="sm"
                disabled={loading || page <= 1}
                onClick={() =>
                  isQa ? setQuestionPage(page - 1) : setPostPage(page - 1)
                }
              >
                {t("previous")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {t("pageOf", { page, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || page >= totalPages}
                onClick={() =>
                  isQa ? setQuestionPage(page + 1) : setPostPage(page + 1)
                }
              >
                {t("next")}
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
