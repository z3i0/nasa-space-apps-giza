"use client"

import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import {
  MessageSquare,
  Eye,
  CheckCircle2,
  Clock,
  ImageIcon,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { CommunityQuestion } from "@/lib/community"

export function QuestionCard({
  question,
  href,
  compact = false,
}: {
  question: CommunityQuestion
  href: string
  compact?: boolean
}) {
  const t = useTranslations("Community")
  const locale = useLocale()
  const solved = question.status === "resolved"
  const answered = question.status === "answered"
  const StatusIcon = solved ? CheckCircle2 : answered ? MessageSquare : Clock
  const author = question.author?.name || t("anonymousUser")
  const initials = author
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
  const role = question.author?.role
  const roleLabel =
    role === "organizer" || role === "admin"
      ? t("roleOrganizer")
      : role === "competition"
        ? t("roleCoordinator")
        : role === "mentor"
          ? t("roleMentor")
          : role === "judge"
            ? t("roleJudge")
            : null

  return (
    <Link
      href={href as `/${string}`}
      className="group block h-full min-w-0 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Card
        data-community-question
        className={`h-full gap-3 border border-transparent p-4 shadow-none transition-colors hover:border-primary/30 hover:bg-muted/20 ${compact ? "sm:flex-row sm:items-start sm:gap-5" : ""}`}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-question-status={question.status}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${solved ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : answered ? "border-primary/30 bg-primary/10 text-primary" : "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-400"}`}
            >
              <StatusIcon className="size-3.5" aria-hidden="true" />
              {t(
                solved
                  ? "statusResolved"
                  : answered
                    ? "statusAnswered"
                    : "statusUnanswered"
              )}
            </span>
            <Badge
              variant="secondary"
              className="max-w-full rounded-md px-2 py-0.5 text-xs font-normal"
            >
              {t(question.category)}
            </Badge>
          </div>
          <h2
            dir="auto"
            className="line-clamp-2 text-base leading-snug font-semibold break-words group-hover:text-primary"
          >
            {question.title}
          </h2>
          <p
            dir="auto"
            className={`${compact ? "line-clamp-1" : "line-clamp-2"} text-sm leading-relaxed break-words text-muted-foreground`}
          >
            {question.content}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted-foreground">
            <Avatar className="size-5">
              <AvatarImage src={question.author?.avatar || undefined} alt="" />
              <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
            </Avatar>
            <bdi className="max-w-44 truncate">{author}</bdi>
            {roleLabel && <span className="text-primary">{roleLabel}</span>}
            <span aria-hidden>&middot;</span>
            <time dateTime={question.createdAt}>
              {new Date(question.createdAt).toLocaleDateString(locale, {
                month: "short",
                day: "numeric",
              })}
            </time>
            {!!question.images?.length && (
              <span
                className="inline-flex items-center gap-1"
                aria-label={t("attachImages")}
              >
                <ImageIcon className="size-3.5" />
                {question.images.length}
              </span>
            )}
          </div>
        </div>
        <div
          className={`flex shrink-0 flex-wrap items-center gap-3 text-xs ${compact ? "sm:w-36 sm:flex-col sm:items-end sm:gap-2 sm:pt-1" : "border-t pt-3"}`}
        >
          <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
            <MessageSquare className="size-3.5" />
            {t("answerCount", { count: question.answersCount })}
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Eye className="size-3.5" />
            {question.viewsCount} {t("views")}
          </span>
        </div>
      </Card>
    </Link>
  )
}
