"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import type { CommunityPost } from "@/lib/community"
import { Heart, MessageCircle, Pin, Clock } from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useOptimisticLike } from "./use-optimistic-like"
import { CommunityImageGallery } from "./community-image-gallery"

interface PostCardProps {
  post: CommunityPost
  href?: string
  onLikeToggled?: (postId: string, liked: boolean, count: number) => void
}

export function PostCard({ post, href, onLikeToggled }: PostCardProps) {
  const t = useTranslations("Community")
  const {
    isLiked,
    likesCount,
    toggle: handleLike,
  } = useOptimisticLike(
    post.id,
    Boolean(post.isLiked),
    post.likesCount,
    (liked, count) => onLikeToggled?.(post.id, liked, count)
  )

  const getRoleBadge = (role?: string | null) => {
    switch (role) {
      case "organizer":
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 px-1.5 py-0 text-[10px] text-amber-500 sm:text-[11px]"
          >
            {t("roleOrganizer")}
          </Badge>
        )
      case "competition":
        return (
          <Badge
            variant="outline"
            className="border-purple-500/40 px-1.5 py-0 text-[10px] text-purple-500 sm:text-[11px]"
          >
            {t("roleCoordinator")}
          </Badge>
        )
      case "mentor":
        return (
          <Badge
            variant="outline"
            className="border-primary/40 px-1.5 py-0 text-[10px] text-primary sm:text-[11px]"
          >
            {t("roleMentor")}
          </Badge>
        )
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  const cardContent = (
    <Card
      className={`group relative flex h-full w-full flex-col justify-between gap-0 overflow-hidden border-border/70 py-0 transition-all duration-200 hover:shadow-sm ${
        post.isPinned
          ? "border-amber-500/50 bg-gradient-to-br from-amber-500/[0.04] to-transparent shadow-sm"
          : "bg-card hover:border-primary/40"
      }`}
    >
      <div className="flex flex-1 flex-col">
        <CardHeader className="p-4 pb-2.5">
          {/* Top Header: Author + Meta + Pin Badge */}
          <div className="flex flex-wrap items-start justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Avatar className="h-8 w-8 ring-1 ring-border">
                <AvatarImage
                  src={post.author?.avatar || undefined}
                  alt={post.author?.name || "Author"}
                />
                <AvatarFallback className="bg-muted text-xs font-bold">
                  {post.author?.name
                    ? post.author.name.slice(0, 2).toUpperCase()
                    : "NA"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-xs font-semibold transition-colors group-hover:text-primary sm:text-sm">
                    {post.author?.name || t("anonymousUser")}
                  </span>
                  {getRoleBadge(post.author?.role)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground sm:text-xs">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </div>
            </div>

            {post.isPinned && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 sm:px-2.5 sm:text-xs dark:text-amber-400"
              >
                <Pin className="h-3 w-3 fill-current" />
                <span>{t("pinned")}</span>
              </Badge>
            )}
          </div>

          {/* Post Title */}
          <CardTitle className="mt-2 line-clamp-2 text-sm leading-snug font-bold sm:text-base">
            {post.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col p-4 pt-0">
          {/* Post Snippet Content */}
          <p className="line-clamp-3 flex-1 text-xs leading-relaxed whitespace-pre-line text-muted-foreground sm:text-sm">
            {post.content}
          </p>

          {/* Post Images */}
          {!!post.images?.length && (
            <div className="relative z-20">
              <CommunityImageGallery images={post.images} compact />
            </div>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="max-w-full rounded-md px-2 py-0.5 text-xs font-normal"
                >
                  <span className="truncate">#{tag}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </div>

      <CardFooter className="flex w-full items-center justify-between border-t bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            type="button"
            variant={isLiked ? "default" : "outline"}
            size="sm"
            onClick={handleLike}
            className={`relative z-20 h-7 gap-1.5 px-2 text-xs font-medium sm:h-8 sm:px-2.5 ${
              isLiked
                ? "border-rose-600 bg-rose-600 text-white hover:bg-rose-700"
                : ""
            }`}
            title={isLiked ? t("liked") : t("likes")}
            aria-label={`${likesCount} ${t("likes")}`}
            aria-pressed={isLiked}
          >
            <Heart
              className={`h-3.5 w-3.5 transition-transform duration-200 active:scale-125 ${
                isLiked ? "fill-white" : ""
              }`}
            />
            <span>{likesCount}</span>
          </Button>

          <div className="flex items-center gap-1.5 text-xs">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>
              {post.commentsCount} {t("comments")}
            </span>
          </div>
        </div>
      </CardFooter>
      {href && (
        <Link
          href={href as `/${string}`}
          aria-label={post.title}
          className="absolute inset-0 z-10 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
        />
      )}
    </Card>
  )

  return cardContent
}
