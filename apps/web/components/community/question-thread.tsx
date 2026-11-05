"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/routing"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  Check,
  Send,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Reply,
  Edit3,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button, buttonVariants } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  fetchCommunityQuestion,
  createCommunityAnswer,
  acceptCommunityAnswer,
  deleteCommunityAnswer,
  deleteCommunityQuestion,
  createCommunityAnswerComment,
  deleteCommunityAnswerComment,
  type CommunityQuestion,
  type CommunityAnswer,
} from "@/lib/community"
import { useAuthUser } from "@/lib/auth"
import { EditQuestionModal } from "./edit-question-modal"
import { CommunityImageGallery } from "./community-image-gallery"

interface QuestionThreadProps {
  questionId: string
  baseRoute?: string
  onBack?: () => void
  onQuestionDeleted?: () => void
  isRtl?: boolean
}

export function QuestionThread({
  questionId,
  baseRoute,
  onBack,
  onQuestionDeleted,
  isRtl: customIsRtl,
}: QuestionThreadProps) {
  const t = useTranslations("Community")
  const locale = useLocale()
  const router = useRouter()
  const isRtl = customIsRtl ?? locale === "ar"
  const currentUser = useAuthUser()
  const [question, setQuestion] = useState<CommunityQuestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [answerDraft, setAnswerDraft] = useState("")
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [replyingAnswerId, setReplyingAnswerId] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState("")
  const [submittingReply, setSubmittingReply] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    const abortController = new AbortController()

    fetchCommunityQuestion(questionId, abortController.signal)
      .then((data) => {
        if (!ignore) {
          setQuestion(data)
          setError("")
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore && !abortController.signal.aborted) {
          setError(err?.message || t("error"))
          setLoading(false)
        }
      })

    return () => {
      ignore = true
      abortController.abort()
    }
  }, [questionId, t])

  const handlePostAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!answerDraft.trim() || submittingAnswer || !question) return

    try {
      setSubmittingAnswer(true)
      const newAnswer = await createCommunityAnswer(
        question.id,
        answerDraft.trim()
      )
      setQuestion((prev) => {
        if (!prev) return prev
        const existingAnswers = prev.answers || []
        const nextStatus =
          prev.status === "unanswered" ? "answered" : prev.status
        return {
          ...prev,
          answersCount: prev.answersCount + 1,
          status: nextStatus,
          answers: [...existingAnswers, newAnswer],
        }
      })
      setAnswerDraft("")
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("error"))
    } finally {
      setSubmittingAnswer(false)
    }
  }

  const handleAddAnswerComment = async (answerId: string) => {
    if (!question || replyDraft.trim().length < 1 || submittingReply) return
    try {
      setSubmittingReply(true)
      const newComment = await createCommunityAnswerComment(
        question.id,
        answerId,
        replyDraft.trim()
      )
      setQuestion((prev) => {
        if (!prev) return prev
        const updatedAnswers = (prev.answers || []).map((ans) => {
          if (ans.id === answerId) {
            return {
              ...ans,
              comments: [...(ans.comments || []), newComment],
            }
          }
          return ans
        })
        return {
          ...prev,
          answers: updatedAnswers,
        }
      })
      setReplyDraft("")
      setReplyingAnswerId(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("error"))
    } finally {
      setSubmittingReply(false)
    }
  }

  const handleDeleteAnswerComment = async (
    answerId: string,
    commentId: string
  ) => {
    if (!question || !confirm(t("confirmDeleteReply"))) return
    try {
      setActionInProgress(commentId)
      await deleteCommunityAnswerComment(question.id, answerId, commentId)
      setQuestion((prev) => {
        if (!prev) return prev
        const updatedAnswers = (prev.answers || []).map((ans) => {
          if (ans.id === answerId) {
            return {
              ...ans,
              comments: (ans.comments || []).filter((c) => c.id !== commentId),
            }
          }
          return ans
        })
        return {
          ...prev,
          answers: updatedAnswers,
        }
      })
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("error"))
    } finally {
      setActionInProgress(null)
    }
  }

  const handleAcceptAnswer = async (answerId: string) => {
    if (!question || actionInProgress) return

    try {
      setActionInProgress(answerId)
      const res = await acceptCommunityAnswer(question.id, answerId)
      setQuestion((prev) => {
        if (!prev) return prev
        const updatedAnswers = (prev.answers || []).map((ans) => {
          if (ans.id === answerId) {
            return { ...ans, isAccepted: res.isAccepted }
          }
          return ans
        })
        const hasAccepted = updatedAnswers.some((a) => a.isAccepted)
        return {
          ...prev,
          status: hasAccepted ? "resolved" : "answered",
          answers: updatedAnswers,
        }
      })
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("error"))
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDeleteAnswer = async (answerId: string) => {
    if (!question || actionInProgress) return
    if (!confirm(t("confirmDeleteAnswer"))) return

    try {
      setActionInProgress(answerId)
      await deleteCommunityAnswer(question.id, answerId)
      setQuestion((prev) => {
        if (!prev) return prev
        const updatedAnswers = (prev.answers || []).filter(
          (ans) => ans.id !== answerId
        )
        const hasAccepted = updatedAnswers.some((a) => a.isAccepted)
        const nextStatus =
          updatedAnswers.length === 0
            ? "unanswered"
            : hasAccepted
              ? "resolved"
              : "answered"

        return {
          ...prev,
          answersCount: Math.max(0, prev.answersCount - 1),
          status: nextStatus,
          answers: updatedAnswers,
        }
      })
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("error"))
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDeleteQuestion = async () => {
    if (!question) return
    if (!confirm(t("confirmDeleteQuestion"))) return

    try {
      await deleteCommunityQuestion(question.id)
      if (onQuestionDeleted) {
        onQuestionDeleted()
      } else if (baseRoute) {
        router.push(baseRoute as `/${string}`)
      } else {
        router.back()
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("error"))
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category?.toLowerCase()?.trim()) {
      case "technical":
        return t("technical")
      case "challenge":
        return t("challenge")
      case "platform":
        return t("platform")
      case "general":
        return t("general")
      default:
        return category || t("general")
    }
  }

  const roleLabel = (role: string) => {
    if (role === "organizer" || role === "admin") return t("roleOrganizer")
    if (role === "competition") return t("roleCoordinator")
    if (role === "mentor") return t("roleMentor")
    if (role === "judge") return t("roleJudge")
    return t("roleParticipant")
  }

  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  if (loading) {
    return (
      <Card className="flex min-h-[300px] w-full flex-col items-center justify-center p-8 text-center sm:p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">{t("loading")}</p>
      </Card>
    )
  }

  if (error || !question) {
    return (
      <Card className="flex min-h-[300px] w-full flex-col items-center justify-center border-destructive/30 bg-destructive/5 p-8 text-center sm:p-12">
        <p className="text-base font-semibold text-destructive">
          {error || t("error")}
        </p>
        {baseRoute ? (
          <Link
            href={`${baseRoute}?tab=qa` as `/${string}`}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "mt-4",
            })}
          >
            <BackIcon className="h-4 w-4" />
            <span>{t("backToQuestions")}</span>
          </Link>
        ) : (
          <Button onClick={onBack} variant="outline" size="sm" className="mt-4">
            <BackIcon className="h-4 w-4" />
            <span>{t("backToQuestions")}</span>
          </Button>
        )}
      </Card>
    )
  }

  const isQuestionAuthor = currentUser?.id === question.authorId
  const isOrganizer = Boolean(
    currentUser &&
    (currentUser.role === "organizer" ||
      currentUser.role === "admin" ||
      currentUser.role === "competition" ||
      currentUser.roles?.includes("organizer") ||
      currentUser.roles?.includes("competition") ||
      currentUser.roles?.includes("admin"))
  )

  const authorInitials = (question.author?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const answers = [...(question.answers || [])].sort(
    (a, b) => Number(b.isAccepted) - Number(a.isAccepted)
  )

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      {/* Back button */}
      <div className="flex w-full items-center justify-between">
        {baseRoute ? (
          <Link
            href={`${baseRoute}?tab=qa` as `/${string}`}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "gap-2 text-muted-foreground hover:text-foreground",
            })}
          >
            <BackIcon className="h-4 w-4" />
            <span>{t("backToQuestions")}</span>
          </Link>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <BackIcon className="h-4 w-4" />
            <span>{t("backToQuestions")}</span>
          </Button>
        )}
      </div>

      {/* Main Question Card using ShadCN Card */}
      <Card className="w-full gap-3 [--card-spacing:--spacing(4)]">
        <CardHeader className="flex flex-col gap-3 pb-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {getCategoryLabel(question.category)}
              </Badge>

              {question.status === "resolved" ? (
                <Badge
                  variant="default"
                  className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{t("statusResolved")}</span>
                </Badge>
              ) : question.status === "answered" ? (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-primary/40 text-primary"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t("statusAnswered")}</span>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="gap-1.5 border-amber-500/40 text-amber-500"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("statusUnanswered")}</span>
                </Badge>
              )}
            </div>

            {(isQuestionAuthor || isOrganizer) && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  className="gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{t("editQuestion")}</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteQuestion}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  <span>{t("deleteQuestion")}</span>
                </Button>
              </div>
            )}
          </div>

          <CardTitle
            dir="auto"
            className="text-xl leading-snug font-bold sm:text-2xl"
          >
            {question.title}
          </CardTitle>

          {/* Author meta row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={question.author?.avatar || undefined}
                alt={question.author?.name || ""}
              />
              <AvatarFallback className="text-xs font-semibold">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {question.author?.name || t("anonymousUser")}
                </span>
                {question.author?.role &&
                  question.author.role !== "participant" && (
                    <Badge variant="outline" className="text-[10px]">
                      {roleLabel(question.author.role)}
                    </Badge>
                  )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("askedBy")} •{" "}
                {new Date(question.createdAt).toLocaleDateString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-2">
          <Separator />
          <div
            dir="auto"
            className="text-sm leading-7 break-words whitespace-pre-wrap"
          >
            {question.content}
          </div>
          {/* Question Attached Images */}
          <CommunityImageGallery images={question.images} />
        </CardContent>
      </Card>

      {/* Answers Section */}
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">
              {t("answersTitle", { count: answers.length })}
            </h2>
            {answers.some((answer) => answer.isAccepted) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("acceptedFirst")}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("answer-draft")?.focus()}
          >
            <MessageSquare className="size-3.5" />
            {t("jumpToAnswer")}
          </Button>
        </div>

        {answers.length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-dashed p-8 text-center text-xs text-muted-foreground sm:text-sm">
            <MessageSquare className="mb-2 h-7 w-7 opacity-40" />
            <p>{t("noAnswersYet")}</p>
          </Card>
        ) : (
          <div className="w-full space-y-4">
            {answers.map((answer: CommunityAnswer) => {
              const isAnswerAuthor = currentUser?.id === answer.authorId
              const canAccept = isQuestionAuthor || isOrganizer
              const canDelete = isAnswerAuthor || isOrganizer

              const answerInitials = (answer.author?.name || "U")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()

              return (
                <Card
                  key={answer.id}
                  data-community-answer
                  className={`relative w-full gap-0 p-4 transition-all ${
                    answer.isAccepted
                      ? "border-emerald-500/50 bg-emerald-500/5 shadow-xs"
                      : ""
                  }`}
                >
                  {/* Accepted Solution Badge */}
                  {answer.isAccepted && (
                    <Badge
                      variant="default"
                      className="mb-3 w-fit gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>{t("acceptedSolution")}</span>
                    </Badge>
                  )}

                  {/* Answer Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={answer.author?.avatar || undefined}
                          alt={answer.author?.name || ""}
                        />
                        <AvatarFallback className="text-xs font-semibold">
                          {answerInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold">
                            {answer.author?.name || t("anonymousUser")}
                          </span>
                          {answer.author?.role &&
                            answer.author.role !== "participant" && (
                              <Badge variant="outline" className="text-[10px]">
                                {roleLabel(answer.author.role)}
                              </Badge>
                            )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(answer.createdAt).toLocaleDateString(
                            locale,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Accept as Solution & Delete */}
                    <div className="flex items-center gap-2">
                      {canAccept && (
                        <Button
                          size="sm"
                          variant={answer.isAccepted ? "default" : "outline"}
                          onClick={() => handleAcceptAnswer(answer.id)}
                          disabled={actionInProgress === answer.id}
                          className={
                            answer.isAccepted
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : ""
                          }
                        >
                          {actionInProgress === answer.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : answer.isAccepted ? (
                            <>
                              <Check className="mr-1.5 h-3.5 w-3.5" />
                              <span>{t("unacceptAnswer")}</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              <span>{t("acceptAnswer")}</span>
                            </>
                          )}
                        </Button>
                      )}

                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={t("deleteAnswer")}
                          onClick={() => handleDeleteAnswer(answer.id)}
                          disabled={actionInProgress === answer.id}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Answer Text Content */}
                  <div
                    dir="auto"
                    className="mt-3 text-sm leading-7 break-words whitespace-pre-wrap"
                  >
                    {answer.content}
                  </div>

                  {/* Reply Button on Answer */}
                  <div className="mt-3 flex items-center gap-2 border-t pt-2.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (replyingAnswerId === answer.id) {
                          setReplyingAnswerId(null)
                          setReplyDraft("")
                        } else {
                          setReplyingAnswerId(answer.id)
                          setReplyDraft("")
                        }
                      }}
                      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Reply className="h-3.5 w-3.5" />
                      <span>{t("reply")}</span>
                      {answer.comments && answer.comments.length > 0 && (
                        <span className="py-0.2 rounded-full bg-muted px-1.5 text-[10px] font-semibold">
                          {answer.comments.length}
                        </span>
                      )}
                    </Button>
                  </div>

                  {/* Inline Reply Form */}
                  {replyingAnswerId === answer.id && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <Textarea
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        placeholder={t("writeReplyPlaceholder")}
                        rows={2}
                        className="resize-none text-xs"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyingAnswerId(null)
                            setReplyDraft("")
                          }}
                          disabled={submittingReply}
                          className="h-7 text-xs"
                        >
                          {t("cancel")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddAnswerComment(answer.id)}
                          disabled={
                            submittingReply || replyDraft.trim().length < 1
                          }
                          className="h-7 gap-1.5 text-xs"
                        >
                          {submittingReply ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          <span>{t("sendReply")}</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Nested Comments on Answer */}
                  {answer.comments && answer.comments.length > 0 && (
                    <div className="ms-4 mt-3 space-y-2 border-s-2 border-border ps-3 sm:ms-8 sm:ps-4">
                      {answer.comments.map((comment) => {
                        const canDeleteComment =
                          currentUser?.id === comment.authorId || isOrganizer
                        const commentInitials = (comment.author?.name || "U")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()

                        return (
                          <div
                            key={comment.id}
                            className="space-y-1.5 rounded-lg bg-muted/40 p-3 text-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage
                                    src={comment.author?.avatar || undefined}
                                    alt={comment.author?.name || "User"}
                                  />
                                  <AvatarFallback className="text-[10px] font-bold">
                                    {commentInitials}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[11px] font-bold sm:text-xs">
                                  {comment.author?.name || t("anonymousUser")}
                                </span>
                                {comment.author?.role &&
                                  comment.author.role !== "participant" && (
                                    <Badge
                                      variant="outline"
                                      className="px-1 py-0 text-[9px]"
                                    >
                                      {comment.author.role.toUpperCase()}
                                    </Badge>
                                  )}
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(
                                    comment.createdAt
                                  ).toLocaleDateString(locale, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>

                              {canDeleteComment && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteAnswerComment(
                                      answer.id,
                                      comment.id
                                    )
                                  }
                                  disabled={actionInProgress === comment.id}
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                  title={t("deleteReply")}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>

                            <p className="pl-8 leading-relaxed whitespace-pre-line text-foreground/90 rtl:pr-8 rtl:pl-0">
                              {comment.content}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Post Your Answer Card using ShadCN Card */}
      <Card id="write-answer" className="w-full scroll-mt-6 gap-1 p-4">
        <h3 id="answer-label" className="text-sm font-semibold sm:text-base">
          {t("postAnswer")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("activityNotice")}
        </p>

        <form onSubmit={handlePostAnswer} className="mt-3 space-y-3">
          <Textarea
            id="answer-draft"
            aria-labelledby="answer-label"
            value={answerDraft}
            onChange={(e) => setAnswerDraft(e.target.value)}
            placeholder={t("answerPlaceholder")}
            rows={4}
            className="text-xs sm:text-sm"
            required
            disabled={submittingAnswer}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={submittingAnswer || answerDraft.trim().length < 3}
            >
              {submittingAnswer ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  <span>{t("submittingAnswer")}</span>
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  <span>{t("submitAnswer")}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* Edit Question Modal */}
      {question && (
        <EditQuestionModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          question={question}
          onQuestionUpdated={(updated) =>
            setQuestion((prev) => (prev ? { ...prev, ...updated } : prev))
          }
        />
      )}
    </div>
  )
}
