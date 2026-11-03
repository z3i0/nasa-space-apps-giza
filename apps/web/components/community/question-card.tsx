"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import {
  MessageSquare,
  Eye,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { CommunityQuestion } from "@/lib/community"
import { CommunityImageGallery } from "./community-image-gallery"

interface QuestionCardProps {
  question: CommunityQuestion
  href?: string
  onClick?: () => void
}

export function QuestionCard({ question, href, onClick }: QuestionCardProps) {
  const t = useTranslations("Community")

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

  const getStatusBadge = (status: string) => {
    if (status === "resolved") {
      return (
        <Badge
          variant="default"
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] sm:text-xs font-semibold px-2 py-0.5"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>{t("statusResolved")}</span>
        </Badge>
      )
    }
    if (status === "answered") {
      return (
        <Badge
          variant="outline"
          className="gap-1.5 text-primary border-primary/40 text-[10px] sm:text-xs font-semibold px-2 py-0.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t("statusAnswered")}</span>
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="gap-1.5 text-amber-500 border-amber-500/40 text-[10px] sm:text-xs font-semibold px-2 py-0.5"
      >
        <Clock className="h-3.5 w-3.5" />
        <span>{t("statusUnanswered")}</span>
      </Badge>
    )
  }

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString)
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return ""
    }
  }

  const authorInitials = (question.author?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const cardContent = (
    <Card className="group relative flex h-full w-full flex-col justify-between overflow-hidden border-border/70 p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 bg-card">
      <div className="flex flex-col flex-1">
        <CardHeader className="p-0 pb-3">
          {/* Top meta tags */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="secondary"
                className="text-[10px] sm:text-xs font-medium px-2 py-0.5"
              >
                {getCategoryLabel(question.category)}
              </Badge>
              {getStatusBadge(question.status)}
            </div>
            <span className="text-[11px] sm:text-xs text-muted-foreground">
              {formatDate(question.createdAt)}
            </span>
          </div>

          {/* Question Title */}
          <CardTitle className="mt-2.5 line-clamp-2 text-sm sm:text-base font-bold transition-colors group-hover:text-primary leading-snug">
            {question.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 p-0 mt-1">
          {/* Question Content Preview */}
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground flex-1">
            {question.content}
          </p>

          {/* Question Images */}
          <CommunityImageGallery images={question.images} compact />
        </CardContent>
      </div>

      <CardFooter className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t p-0 pt-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-7 w-7 ring-1 ring-border">
            <AvatarImage
              src={question.author?.avatar || undefined}
              alt={question.author?.name || ""}
            />
            <AvatarFallback className="text-[11px] font-bold bg-muted">
              {authorInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium group-hover:text-primary transition-colors">
              {question.author?.name || t("anonymousUser")}
            </span>
            {question.author?.role && question.author.role !== "participant" && (
              <Badge
                variant="outline"
                className="px-1.5 py-0 text-[10px] font-semibold text-primary border-primary/30"
              >
                {question.author.role.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1" title={`${question.viewsCount} ${t("views")}`}>
            <Eye className="h-3.5 w-3.5 opacity-70" />
            <span>{question.viewsCount}</span>
          </span>
          <span
            className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-xs transition-colors ${
              question.status === "resolved"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : question.answersCount > 0
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
            title={`${question.answersCount} ${t("answers")}`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{question.answersCount}</span>
          </span>
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

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
      className="block h-full w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring rounded-xl"
    >
      {cardContent}
    </div>
  )
}
