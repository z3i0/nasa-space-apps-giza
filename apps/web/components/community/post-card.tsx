"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import type { CommunityPost } from "@/lib/community"
import {
  Heart,
  MessageCircle,
  Pin,
  Clock,
  Sparkles,
  Tag,
} from "lucide-react"
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
  const { isLiked, likesCount, toggle: handleLike } = useOptimisticLike(
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
            className="text-[10px] sm:text-[11px] border-amber-500/40 text-amber-500 px-1.5 py-0"
          >
            {t("roleOrganizer")}
          </Badge>
        )
      case "competition":
        return (
          <Badge
            variant="outline"
            className="text-[10px] sm:text-[11px] border-purple-500/40 text-purple-500 px-1.5 py-0"
          >
            {t("roleCoordinator")}
          </Badge>
        )
      case "mentor":
        return (
          <Badge
            variant="outline"
            className="text-[10px] sm:text-[11px] border-primary/40 text-primary px-1.5 py-0"
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
      className={`group relative flex h-full w-full flex-col justify-between overflow-hidden border-border/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${post.isPinned
          ? "border-amber-500/50 bg-gradient-to-br from-amber-500/[0.04] to-transparent shadow-sm"
          : "bg-card hover:border-primary/40"
        }`}
    >
      <div className="flex flex-col flex-1">
        <CardHeader className="p-4 sm:p-5 pb-2.5">
          {/* Top Header: Author + Meta + Pin Badge */}
          <div className="flex flex-wrap items-start justify-between gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-1 ring-border">
                <AvatarImage
                  src={post.author?.avatar || undefined}
                  alt={post.author?.name || "Author"}
                />
                <AvatarFallback className="text-xs font-bold bg-muted">
                  {post.author?.name ? post.author.name.slice(0, 2).toUpperCase() : "NA"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-semibold group-hover:text-primary transition-colors">
                    {post.author?.name || t("anonymousUser")}
                  </span>
                  {getRoleBadge(post.author?.role)}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </div>
            </div>

            {post.isPinned && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5"
              >
                <Pin className="h-3 w-3 fill-current" />
                <span>{t("pinned")}</span>
              </Badge>
            )}
          </div>

          {/* Post Title */}
          <CardTitle className="mt-3 text-sm sm:text-base font-bold line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {post.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 p-4 sm:p-5 pt-0">
          {/* Post Snippet Content */}
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-line flex-1">
            {post.content}
          </p>

          {/* Post Images */}
          <CommunityImageGallery images={post.images} compact />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 px-2 py-0.5 text-[11px] font-normal hover:bg-muted"
                >
                  <Tag className="h-2.5 w-2.5 text-primary" />
                  <span>#{tag}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </div>

      <CardFooter className="flex w-full items-center justify-between border-t bg-muted/20 p-3 sm:p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            type="button"
            variant={isLiked ? "default" : "outline"}
            size="sm"
            onClick={handleLike}
            className={`h-7 sm:h-8 gap-1.5 px-2 sm:px-2.5 text-xs font-medium ${isLiked ? "bg-rose-600 hover:bg-rose-700 text-white border-rose-600" : ""
              }`}
            title={isLiked ? t("liked") : t("likes")}
          >
            <Heart
              className={`h-3.5 w-3.5 transition-transform duration-200 active:scale-125 ${isLiked ? "fill-white" : ""
                }`}
            />
            <span>{likesCount}</span>
          </Button>

          <div className="flex items-center gap-1.5 text-xs">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{post.commentsCount} {t("comments")}</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  )

  if (href) {
    return (
      <Link href={href as `/${string}`} className="block h-full w-full focus:outline-none focus:ring-2 focus:ring-ring rounded-xl">
        {cardContent}
      </Link>
    )
  }

  return cardContent
}
