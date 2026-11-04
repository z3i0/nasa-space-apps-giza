"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"
import {
  MessagesSquare,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  HelpCircle,
  X,
  RotateCcw,
  MessageSquare,
  Filter,
  LayoutGrid,
  List,
} from "lucide-react"
import { PageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { AskQuestionModal } from "./ask-question-modal"
import { PostCard } from "./post-card"
import { CreatePostModal } from "./create-post-modal"
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
  const [selectedQuestionSort, setSelectedQuestionSort] = useState<string>("newest")
  const [questionPage, setQuestionPage] = useState(1)
  const [questionTotalPages, setQuestionTotalPages] = useState(1)
  const [isAskModalOpen, setIsAskModalOpen] = useState(false)

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
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false)

  // View modes: default to "grid" for beautiful desktop layout
  const [feedViewMode, setFeedViewMode] = useState<"grid" | "list">("grid")
  const [qaViewMode, setQaViewMode] = useState<"grid" | "list">("grid")

  // Deep-linked Question ID (backward compatibility)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)

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
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, "", window.location.pathname)
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
    t,
  ])

  // Fetch Feed Posts
  useEffect(() => {
    if (activeTab !== "feed") return
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
    t,
  ])

  const handleQuestionCreated = (newQuestion: CommunityQuestion) => {
    router.push(`${basePath}/${newQuestion.id}` as `/${string}`)
  }

  const handlePostCreated = (newPost: CommunityPost) => {
    router.push(`${basePath}/posts/${newPost.id}` as `/${string}`)
  }

  // All distinct tags collected from loaded posts
  const availableTags = Array.from(
    new Set(posts.flatMap((p) => p.tags || []))
  ).slice(0, 8)

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

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        icon={MessagesSquare}
        actions={
          activeTab === "feed" ? (
            <Button
              onClick={() => router.push(`${basePath}/posts/new` as `/${string}`)}
              className="font-bold"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {t("createPost")}
            </Button>
          ) : (
            <Button
              onClick={() => router.push(`${basePath}/new` as `/${string}`)}
              className="font-bold"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {t("askQuestion")}
            </Button>
          )
        }
      />

      {/* If opened via deep-link questionId parameter */}
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
          {/* Main Navigation Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-4">
            <div className="flex rounded-lg bg-muted p-1">
              <Button
                type="button"
                variant={activeTab === "feed" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleTabChange("feed")}
                className="gap-2 text-xs sm:text-sm font-semibold"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{t("tabFeed")}</span>
              </Button>

              <Button
                type="button"
                variant={activeTab === "qa" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleTabChange("qa")}
                className="gap-2 text-xs sm:text-sm font-semibold"
              >
                <HelpCircle className="h-4 w-4" />
                <span>{t("tabQa")}</span>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              {activeTab === "feed" ? t("tabFeedDesc") : t("tabQaDesc")}
            </p>
          </div>

          {/* ============================================================= */}
          {/* TAB 1: COMMUNITY FEED                                         */}
          {/* ============================================================= */}
          {activeTab === "feed" && (
            <div className="w-full space-y-6">
              {/* Feed Search & Controls Bar using ShadCN Card */}
              <Card className="w-full p-4 sm:p-5 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3.5" />
                    <Input
                      type="text"
                      value={postSearch}
                      onChange={(e) => setPostSearch(e.target.value)}
                      placeholder={t("searchPostsPlaceholder")}
                      className="pl-10 pr-9 text-xs sm:text-sm rtl:pl-9 rtl:pr-10"
                    />
                    {postSearch && (
                      <button
                        onClick={() => setPostSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rtl:left-3 rtl:right-auto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sort Dropdown & View Mode Switcher */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {t("sortBy")}:
                    </span>
                    <Select
                      value={selectedPostSort}
                      onValueChange={(val) => {
                        if (val) {
                          setSelectedPostSort(val)
                          setPostPage(1)
                        }
                      }}
                    >
                      <SelectTrigger className="w-[140px] text-xs">
                        <SelectValue>
                          {(val) =>
                            postSortOptions.find((opt) => opt.id === val)?.label ??
                            val
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {postSortOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>

                    {/* View Mode Switcher (Grid / List) */}
                    <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
                      <button
                        type="button"
                        onClick={() => setFeedViewMode("grid")}
                        className={`rounded-md p-1.5 transition-colors ${
                          feedViewMode === "grid"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        title={t("gridView")}
                        aria-label={t("gridView")}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedViewMode("list")}
                        className={`rounded-md p-1.5 transition-colors ${
                          feedViewMode === "list"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        title={t("listView")}
                        aria-label={t("listView")}
                      >
                        <List className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Tags Filter Chips using ShadCN Badge */}
                {availableTags.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t">
                    <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1">
                      <Filter className="h-3 w-3" />
                      {t("filterByTag")}:
                    </span>
                    <Badge
                      variant={selectedTag === "all" ? "default" : "secondary"}
                      onClick={() => setSelectedTag("all")}
                      className="cursor-pointer px-2.5 py-1 text-xs font-semibold"
                    >
                      {t("allTags")}
                    </Badge>
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTag === tag ? "default" : "secondary"}
                        onClick={() => setSelectedTag(tag)}
                        className="cursor-pointer px-2.5 py-1 text-xs font-medium"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>

              {/* Feed Content: Loading, Error, Empty, or List */}
              {loadingPosts ? (
                feedViewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                    {[...Array(6)].map((_, i) => (
                      <Card
                        key={i}
                        className="p-5 space-y-3 h-[240px] flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-1.5">
                              <Skeleton className="h-3.5 w-28" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                        <Skeleton className="h-8 w-1/3" />
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="w-full space-y-4 max-w-4xl mx-auto">
                    {[...Array(4)].map((_, i) => (
                      <Card
                        key={i}
                        className="w-full p-5 space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-32" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-12 w-full" />
                      </Card>
                    ))}
                  </div>
                )
              ) : postError ? (
                <Card className="w-full border-destructive/30 bg-destructive/5 p-8 text-center">
                  <p className="text-sm font-semibold text-destructive">{postError}</p>
                  <Button
                    onClick={() => setPostPage(1)}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    {t("retry")}
                  </Button>
                </Card>
              ) : posts.length === 0 ? (
                <Card className="w-full border-dashed p-12 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-muted-foreground opacity-50 mb-3" />
                  <h3 className="text-base font-bold">
                    {t("emptyPostsTitle")}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                    {t("emptyPostsDesc")}
                  </p>
                  <Button
                    onClick={() => router.push(`${basePath}/posts/new` as `/${string}`)}
                    size="sm"
                    className="mt-5 font-bold"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t("createPost")}
                  </Button>
                </Card>
              ) : (
                <div
                  className={
                    feedViewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-stretch"
                      : "w-full space-y-4 max-w-4xl mx-auto"
                  }
                >
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      href={`${basePath}/posts/${post.id}`}
                    />
                  ))}
                </div>
              )}

              {/* Feed Pagination using ShadCN Button */}
              {postTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={postPage <= 1}
                    onClick={() => setPostPage((p) => Math.max(1, p - 1))}
                  >
                    {isRtl ? "التالي" : "Previous"}
                  </Button>
                  <span className="text-xs text-muted-foreground px-3">
                    {postPage} / {postTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={postPage >= postTotalPages}
                    onClick={() => setPostPage((p) => p + 1)}
                  >
                    {isRtl ? "السابق" : "Next"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 2: Q&A HUB                                                */}
          {/* ============================================================= */}
          {activeTab === "qa" && (
            <div className="w-full space-y-6">
              {/* Quick Stats Grid using ShadCN Card (Only visible to organizers) */}
              {isOrganizer && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">{t("totalQuestions")}</span>
                      <HelpCircle className="h-4 w-4 text-primary" />
                    </div>
                    <p className="mt-2 text-2xl font-bold">
                      {stats?.totalQuestions ?? "--"}
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">{t("resolvedQuestions")}</span>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-emerald-500">
                      {stats?.resolvedCount ?? "--"}
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">{t("unansweredQuestions")}</span>
                      <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-amber-500">
                      {stats?.unansweredCount ?? "--"}
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="text-xs font-medium">{t("totalAnswers")}</span>
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-primary">
                      {stats?.totalAnswers ?? "--"}
                    </p>
                  </Card>
                </div>
              )}

              {/* Filters and Search Bar using ShadCN Card */}
              <Card className="w-full p-4 sm:p-5">
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3.5" />
                    <Input
                      type="text"
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      placeholder={t("searchPlaceholder")}
                      className="pl-10 pr-9 text-xs sm:text-sm rtl:pl-9 rtl:pr-10"
                    />
                    {questionSearch && (
                      <button
                        onClick={() => setQuestionSearch("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rtl:left-3 rtl:right-auto"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills and Sort using ShadCN Select */}
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    {/* Category Tabs using ShadCN Badge */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {categories.map((cat) => (
                        <Badge
                          key={cat.id}
                          variant={selectedCategory === cat.id ? "default" : "secondary"}
                          onClick={() => {
                            setSelectedCategory(cat.id)
                            setQuestionPage(1)
                          }}
                          className="cursor-pointer px-3 py-1.5 text-xs font-semibold"
                        >
                          {cat.label}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Selector using ShadCN Select */}
                      <Select
                        value={selectedStatus}
                        onValueChange={(val) => {
                          if (val) {
                            setSelectedStatus(val)
                            setQuestionPage(1)
                          }
                        }}
                      >
                        <SelectTrigger className="w-[130px] text-xs">
                          <SelectValue>
                            {(val) =>
                              statuses.find((st) => st.id === val)?.label ?? val
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {statuses.map((st) => (
                              <SelectItem key={st.id} value={st.id}>
                                {st.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      {/* Sort Selector using ShadCN Select */}
                      <Select
                        value={selectedQuestionSort}
                        onValueChange={(val) => {
                          if (val) {
                            setSelectedQuestionSort(val)
                            setQuestionPage(1)
                          }
                        }}
                      >
                        <SelectTrigger className="w-[140px] text-xs">
                          <SelectValue>
                            {(val) =>
                              questionSortOptions.find((opt) => opt.id === val)
                                ?.label ?? val
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {questionSortOptions.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      {/* View Mode Switcher (Grid / List) */}
                      <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
                        <button
                          type="button"
                          onClick={() => setQaViewMode("grid")}
                          className={`rounded-md p-1.5 transition-colors ${
                            qaViewMode === "grid"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title={t("gridView")}
                          aria-label={t("gridView")}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setQaViewMode("list")}
                          className={`rounded-md p-1.5 transition-colors ${
                            qaViewMode === "list"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title={t("listView")}
                          aria-label={t("listView")}
                        >
                          <List className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Questions List */}
              {loadingQuestions ? (
                qaViewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                    {[...Array(6)].map((_, i) => (
                      <Card
                        key={i}
                        className="p-5 space-y-3 h-[220px] flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-3 w-16" />
                          </div>
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Skeleton className="h-6 w-24" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="w-full space-y-3 max-w-4xl mx-auto">
                    {[...Array(5)].map((_, i) => (
                      <Card
                        key={i}
                        className="w-full p-5 space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-10 w-full" />
                      </Card>
                    ))}
                  </div>
                )
              ) : questionError ? (
                <Card className="w-full border-destructive/30 bg-destructive/5 p-8 text-center">
                  <p className="text-sm font-semibold text-destructive">{questionError}</p>
                  <Button
                    onClick={() => setQuestionPage(1)}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    {t("retry")}
                  </Button>
                </Card>
              ) : questions.length === 0 ? (
                <Card className="w-full border-dashed p-12 text-center">
                  <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground opacity-50 mb-3" />
                  <h3 className="text-base font-bold">
                    {t("emptyTitle")}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                    {t("emptyDesc")}
                  </p>
                  <Button
                    onClick={() => router.push(`${basePath}/new` as `/${string}`)}
                    size="sm"
                    className="mt-5 font-semibold"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t("askQuestion")}
                  </Button>
                </Card>
              ) : (
                <div
                  className={
                    qaViewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-stretch"
                      : "w-full space-y-3 max-w-4xl mx-auto"
                  }
                >
                  {questions.map((q) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      href={`${basePath}/${q.id}`}
                    />
                  ))}
                </div>
              )}

              {/* Questions Pagination */}
              {questionTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={questionPage <= 1}
                    onClick={() => setQuestionPage((p) => Math.max(1, p - 1))}
                  >
                    {isRtl ? "التالي" : "Previous"}
                  </Button>
                  <span className="text-xs text-muted-foreground px-3">
                    {questionPage} / {questionTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={questionPage >= questionTotalPages}
                    onClick={() => setQuestionPage((p) => p + 1)}
                  >
                    {isRtl ? "السابق" : "Next"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: Ask Question */}
      <AskQuestionModal
        open={isAskModalOpen}
        onOpenChange={setIsAskModalOpen}
        onQuestionCreated={handleQuestionCreated}
      />

      {/* Modal: Create Post */}
      <CreatePostModal
        open={isCreatePostModalOpen}
        onOpenChange={setIsCreatePostModalOpen}
        onPostCreated={handlePostCreated}
        canPin={isOrganizer}
      />
    </div>
  )
}
