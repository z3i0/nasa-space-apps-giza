"use client"

import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/routing"
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Heart,
  MessageCircle,
  Pin,
  Send,
  Trash2,
  Loader2,
  Sparkles,
  Tag,
  Reply,
  Edit3,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button, buttonVariants } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  fetchCommunityPost,
  createCommunityPostComment,
  deleteCommunityPostComment,
  deleteCommunityPost,
  type CommunityPost,
  type CommunityPostComment,
} from "@/lib/community"
import { useAuthUser } from "@/lib/auth"
import { useOptimisticLike } from "./use-optimistic-like"
import { EditPostModal } from "./edit-post-modal"
import { CommunityImageGallery } from "./community-image-gallery"

interface PostThreadProps {
  postId: string
  baseRoute?: string
  onBack?: () => void
  onPostDeleted?: () => void
  isRtl?: boolean
}

export function PostThread({
  postId,
  baseRoute,
  onBack,
  onPostDeleted,
  isRtl: customIsRtl,
}: PostThreadProps) {
  const t = useTranslations("Community")
  const locale = useLocale()
  const router = useRouter()
  const isRtl = customIsRtl ?? locale === "ar"
  const currentUser = useAuthUser()

  const [post, setPost] = useState<CommunityPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const { isLiked, likesCount, toggle: handleLike } = useOptimisticLike(
    post?.id || "",
    Boolean(post?.isLiked),
    post?.likesCount || 0
  )

  const [commentDraft, setCommentDraft] = useState("")
  const [submittingComment, setSubmittingComment] = useState(false)
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState("")
  const [submittingReply, setSubmittingReply] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    fetchCommunityPost(postId, controller.signal)
      .then((data) => {
        if (!mounted) return
        setPost(data)
        setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        if (err.name !== "AbortError") {
          setError(err instanceof Error ? err.message : t("error"))
          setLoading(false)
        }
      })

    return () => {
      mounted = false
      controller.abort()
    }
  }, [postId, t])

  const handleAddReply = async (parentId: string) => {
    if (!post || replyDraft.trim().length < 1 || submittingReply) return
    try {
      setSubmittingReply(true)
      const newReply = await createCommunityPostComment(
        post.id,
        replyDraft.trim(),
        parentId
      )
      setPost((prev) => {
        if (!prev) return prev
        const updatedComments = (prev.comments || []).map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), newReply],
            }
          }
          return c
        })
        return {
          ...prev,
          commentsCount: prev.commentsCount + 1,
          comments: updatedComments,
        }
      })
      setReplyDraft("")
      setReplyingCommentId(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("error"))
    } finally {
      setSubmittingReply(false)
    }
  }

  const handleDeleteReply = async (parentId: string, replyId: string) => {
    if (!post || !confirm(t("confirmDeleteReply"))) return
    try {
      setActionInProgress(replyId)
      await deleteCommunityPostComment(post.id, replyId)
      setPost((prev) => {
        if (!prev) return prev
        const updatedComments = (prev.comments || []).map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: (c.replies || []).filter((r) => r.id !== replyId),
            }
          }
          return c
        })
        return {
          ...prev,
          commentsCount: Math.max(0, prev.commentsCount - 1),
          comments: updatedComments,
        }
      })
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("error"))
    } finally {
      setActionInProgress(null)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!post || commentDraft.trim().length < 2 || submittingComment) return

    try {
      setSubmittingComment(true)
      const newComment = await createCommunityPostComment(post.id, commentDraft.trim())
      setPost((prev) => {
        if (!prev) return prev
        const existingComments = prev.comments || []
        return {
          ...prev,
          commentsCount: prev.commentsCount + 1,
          comments: [...existingComments, newComment],
        }
      })
      setCommentDraft("")
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("error"))
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!post || !confirm(t("confirmDeleteComment"))) return

    try {
      setActionInProgress(commentId)
      await deleteCommunityPostComment(post.id, commentId)
      setPost((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          commentsCount: Math.max(0, prev.commentsCount - 1),
          comments: (prev.comments || []).filter((c) => c.id !== commentId),
        }
      })
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("error"))
    } finally {
      setActionInProgress(null)
    }
  }

  const handleDeletePost = async () => {
    if (!post || !confirm(t("confirmDeletePost"))) return

    try {
      setActionInProgress("post")
      await deleteCommunityPost(post.id)
      if (onPostDeleted) {
        onPostDeleted()
      } else if (baseRoute) {
        router.push(baseRoute as `/${string}`)
      } else {
        router.back()
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("error"))
      setActionInProgress(null)
    }
  }

  const isCommunityModerator = Boolean(
    currentUser &&
      (currentUser.role === "organizer" ||
        currentUser.role === "admin" ||
        currentUser.role === "competition" ||
        currentUser.roles?.includes("organizer") ||
        currentUser.roles?.includes("competition") ||
        currentUser.roles?.includes("admin"))
  )

  const canManagePost = Boolean(
    post &&
      currentUser &&
      (currentUser.id === post.authorId || isCommunityModerator)
  )

  const canManageComment = (comment: CommunityPostComment) => {
    return Boolean(
      currentUser &&
        (currentUser.id === comment.authorId || isCommunityModerator)
    )
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  const getRoleBadge = (role?: string | null) => {
    switch (role) {
      case "organizer":
        return (
          <Badge variant="outline" className="text-[11px] border-amber-500/40 text-amber-500">
            {t("roleOrganizer")}
          </Badge>
        )
      case "competition":
        return (
          <Badge variant="outline" className="text-[11px] border-purple-500/40 text-purple-500">
            {t("roleCoordinator")}
          </Badge>
        )
      case "mentor":
        return (
          <Badge variant="outline" className="text-[11px] border-primary/40 text-primary">
            {t("roleMentor")}
          </Badge>
        )
      default:
        return null
    }
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

  if (error || !post) {
    return (
      <Card className="flex min-h-[300px] w-full flex-col items-center justify-center border-destructive/30 bg-destructive/5 p-8 text-center sm:p-12">
        <p className="text-base font-semibold text-destructive">
          {error || t("error")}
        </p>
        {baseRoute ? (
          <Link
            href={baseRoute as `/${string}`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}
          >
            <BackIcon className="h-4 w-4" />
            <span>{t("backToFeed")}</span>
          </Link>
        ) : (
          <Button onClick={onBack} variant="outline" size="sm" className="mt-4">
            <BackIcon className="h-4 w-4" />
            <span>{t("backToFeed")}</span>
          </Button>
        )}
      </Card>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Navigation */}
      <div className="flex w-full items-center justify-between">
        {baseRoute ? (
          <Link
            href={baseRoute as `/${string}`}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "gap-2 text-muted-foreground hover:text-foreground",
            })}
          >
            <BackIcon className="h-4 w-4" />
            <span>{t("backToFeed")}</span>
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
            <span>{t("backToFeed")}</span>
          </Button>
        )}

        {canManagePost && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="gap-1.5"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>{t("editPost")}</span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeletePost}
              disabled={actionInProgress === "post"}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              <span>{t("deletePost")}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Post Card using ShadCN Card */}
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-4 pb-2 sm:gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <Avatar className="h-11 w-11 sm:h-12 sm:w-12">
                <AvatarImage
                  src={post.author?.avatar || undefined}
                  alt={post.author?.name || "Author"}
                />
                <AvatarFallback className="text-sm font-bold">
                  {post.author?.name ? post.author.name.slice(0, 2).toUpperCase() : "NA"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold">
                    {post.author?.name || t("anonymousUser")}
                  </span>
                  {getRoleBadge(post.author?.role)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </div>
            </div>

            {post.isPinned && (
              <Badge
                variant="outline"
                className="gap-1.5 border-amber-500/40 text-amber-500 text-xs px-2.5 py-1 font-semibold"
              >
                <Pin className="h-3.5 w-3.5 fill-current" />
                <span>{t("pinned")}</span>
              </Badge>
            )}
          </div>

          <CardTitle className="text-xl font-bold leading-snug sm:text-2xl">
            {post.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <Separator />

          {/* Post Content */}
          <div className="whitespace-pre-line text-sm leading-relaxed sm:text-base">
            {post.content}
          </div>

          {/* Post Images */}
          <CommunityImageGallery images={post.images} />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 text-xs px-2.5 py-0.5"
                >
                  <Tag className="h-3 w-3 text-primary" />
                  <span>#{tag}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex w-full items-center justify-between border-t pt-4">
          <Button
            type="button"
            variant={isLiked ? "default" : "outline"}
            size="sm"
            onClick={handleLike}
            className={`gap-2 ${isLiked ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}`}
          >
            <Heart
              className={`h-4 w-4 ${isLiked ? "fill-white" : ""}`}
            />
            <span>
              {likesCount} {isLiked ? t("liked") : t("likes")}
            </span>
          </Button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MessageCircle className="h-4 w-4" />
            <span>
              {post.commentsCount} {t("comments")}
            </span>
          </div>
        </CardFooter>
      </Card>

      {/* Comments Section */}
      <div className="w-full space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          <span>{t("commentsTitle", { count: post.comments?.length || 0 })}</span>
        </h2>

        {/* Comment Composer inside ShadCN Card */}
        <Card className="w-full">
          <form onSubmit={handleAddComment} className="p-4 sm:p-5 space-y-3">
            <Textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              placeholder={t("commentPlaceholder")}
              rows={3}
              className="resize-none text-xs sm:text-sm"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={submittingComment || commentDraft.trim().length < 2}
              >
                {submittingComment ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    <span>{t("submittingComment")}</span>
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    <span>{t("submitComment")}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Comments List */}
        {post.comments && post.comments.length > 0 ? (
          <div className="w-full space-y-3">
            {post.comments.map((comment) => (
              <Card
                key={comment.id}
                className="w-full p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={comment.author?.avatar || undefined}
                        alt={comment.author?.name || "User"}
                      />
                      <AvatarFallback className="text-xs font-semibold">
                        {comment.author?.name
                          ? comment.author.name.slice(0, 2).toUpperCase()
                          : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold">
                          {comment.author?.name || t("anonymousUser")}
                        </span>
                        {getRoleBadge(comment.author?.role)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                  </div>

                  {canManageComment(comment) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={actionInProgress === comment.id}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      title={t("deleteComment")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <p className="mt-3 text-xs leading-relaxed whitespace-pre-line sm:text-sm pl-11 rtl:pl-0 rtl:pr-11">
                  {comment.content}
                </p>

                {/* Comment Actions: Reply Button */}
                <div className="mt-2.5 flex items-center gap-2 pl-11 rtl:pl-0 rtl:pr-11">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (replyingCommentId === comment.id) {
                        setReplyingCommentId(null)
                        setReplyDraft("")
                      } else {
                        setReplyingCommentId(comment.id)
                        setReplyDraft("")
                      }
                    }}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                  >
                    <Reply className="h-3.5 w-3.5" />
                    <span>{t("reply")}</span>
                  </Button>
                </div>

                {/* Inline Reply Form */}
                {replyingCommentId === comment.id && (
                  <div className="mt-3 pl-11 rtl:pl-0 rtl:pr-11 space-y-2">
                    <Textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder={t("writeReplyPlaceholder")}
                      rows={2}
                      className="resize-none text-xs"
                      autoFocus
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingCommentId(null)
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
                        onClick={() => handleAddReply(comment.id)}
                        disabled={submittingReply || replyDraft.trim().length < 1}
                        className="h-7 text-xs gap-1.5"
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

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 ms-6 sm:ms-10 space-y-2.5 border-s-2 border-border ps-3 sm:ps-4">
                    {comment.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={reply.author?.avatar || undefined}
                                alt={reply.author?.name || "User"}
                              />
                              <AvatarFallback className="text-[10px] font-bold">
                                {reply.author?.name
                                  ? reply.author.name.slice(0, 2).toUpperCase()
                                  : "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-[11px] sm:text-xs">
                              {reply.author?.name || t("anonymousUser")}
                            </span>
                            {getRoleBadge(reply.author?.role)}
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(reply.createdAt)}
                            </span>
                          </div>

                          {canManageComment(reply) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDeleteReply(comment.id, reply.id)
                              }
                              disabled={actionInProgress === reply.id}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              title={t("deleteReply")}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        <p className="leading-relaxed whitespace-pre-line text-foreground/90 pl-8 rtl:pl-0 rtl:pr-8">
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center border-dashed p-8 text-center text-xs text-muted-foreground">
            <Sparkles className="h-6 w-6 opacity-40 mb-2" />
            <p>{t("noCommentsYet")}</p>
          </Card>
        )}
      </div>

      {/* Edit Post Modal */}
      {post && (
        <EditPostModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          post={post}
          onPostUpdated={(updated) =>
            setPost((prev) => (prev ? { ...prev, ...updated } : prev))
          }
          canPin={isCommunityModerator}
        />
      )}
    </div>
  )
}
