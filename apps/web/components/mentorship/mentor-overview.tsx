"use client"

import { useLocale, useTranslations } from "next-intl"
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Inbox,
  MessageCircle,
  Pencil,
  Users,
} from "lucide-react"
import { Link } from "@/i18n/routing"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type {
  Mentor,
  MentorshipMessage,
  MentorshipRequest,
} from "@/lib/mentorship"
import styles from "./mentor-workspace.module.css"

export type MentorMessagePreview = {
  request: MentorshipRequest
  message: MentorshipMessage
}

export function mentorRequestHref(request: MentorshipRequest) {
  const section =
    request.status === "pending"
      ? "requests"
      : request.status === "accepted"
        ? "sessions"
        : "history"
  return `/dashboard/mentor/${section}?conversation=${encodeURIComponent(request.id)}#mentorship-request-${request.id}`
}

export function MentorOverview({
  mentor,
  name,
  requests,
  messages,
  messagesLoading,
  messagesError,
  now,
}: {
  mentor?: Mentor
  name: string
  requests: MentorshipRequest[]
  messages: MentorMessagePreview[]
  messagesLoading: boolean
  messagesError: boolean
  now: number
}) {
  const t = useTranslations("Mentorship")
  const w = useTranslations("Mentorship.workspace")
  const locale = useLocale()
  const time = (value: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(new Date(value))
  const pending = requests.filter((request) => request.status === "pending")
  const active = requests.filter((request) => request.status === "accepted")
  const upcoming = active
    .filter((request) => request.slot && Date.parse(request.slot.endTime) > now)
    .sort((a, b) => a.slot!.startTime.localeCompare(b.slot!.startTime))
  const slots = (mentor?.mentorSlots ?? [])
    .filter((slot) => Date.parse(slot.startTime) > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  const topics = mentor?.mentorProfile?.expertise.length
    ? mentor.mentorProfile.expertise
    : (mentor?.profile?.skills ?? [])
  const bio = mentor?.mentorProfile?.bio || mentor?.profile?.bio
  const stats = [
    {
      label: w("pendingLabel"),
      count: pending.length,
      href: "requests",
      icon: Inbox,
      tone: styles.amber,
      color: "text-orange",
      hint: w("pendingHint"),
    },
    {
      label: t("activeCount"),
      count: new Set(active.map((request) => request.teamId)).size,
      href: "teams",
      icon: Users,
      tone: styles.mint,
      color: "text-success",
      hint: w("teamsHint"),
    },
    {
      label: t("upcomingCount"),
      count: upcoming.length,
      href: "sessions",
      icon: CalendarDays,
      tone: styles.violet,
      color: "text-primary",
      hint: w("sessionsHint"),
    },
  ]

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map(({ label, count, href, icon: Icon, tone, color, hint }) => (
          <Link
            key={href}
            href={`/dashboard/mentor/${href}`}
            className={`${styles.panel} ${styles.metric} ${tone} group transition-colors hover:border-primary`}
          >
            <div className="flex items-center justify-between gap-3">
              <Icon className={`size-5 ${color}`} aria-hidden="true" />
              <ArrowUpRight
                className="size-4 text-muted-foreground rtl:-scale-x-100"
                aria-hidden="true"
              />
            </div>
            <p
              className={`mt-3 text-2xl font-semibold tabular-nums sm:text-3xl ${color}`}
            >
              {count}
            </p>
            <p className="mt-1 text-xs font-semibold sm:text-sm">{label}</p>
            <p className={`mt-1 hidden sm:block ${styles.muted}`}>{hint}</p>
          </Link>
        ))}
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <div className="grid min-w-0 gap-5">
          <section
            aria-labelledby="mentor-profile-heading"
            className={`${styles.panel} ${styles.mint}`}
          >
            <div className={styles.heading}>
              <h2 id="mentor-profile-heading">{w("profileCard")}</h2>
              <Link href="/dashboard/mentor/profile" className={styles.link}>
                <Pencil className="size-3.5" aria-hidden="true" />
                {w("editProfile")}
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Avatar className="size-14 border border-success/30">
                <AvatarImage src={mentor?.avatar || undefined} alt="" />
                <AvatarFallback className="bg-success/15 text-lg font-semibold text-success">
                  {name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-lg font-semibold [overflow-wrap:anywhere]">
                  {name}
                </p>
                <p className="mt-1 text-xs text-success">
                  {t("directory.mentorLabel")}
                </p>
              </div>
            </div>
            <p className="mt-5 text-xs font-semibold text-muted-foreground">
              {t("directory.canHelpWith")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {topics.length ? (
                topics.slice(0, 6).map((topic, index) => (
                  <span
                    key={topic}
                    className={`max-w-full rounded-lg px-2.5 py-1.5 text-xs font-medium [overflow-wrap:anywhere] ${["bg-success/15 text-success", "bg-primary/15 text-primary", "bg-orange/15 text-orange"][index % 3]}`}
                  >
                    {topic}
                  </span>
                ))
              ) : (
                <p className={styles.muted}>{w("addTopics")}</p>
              )}
              {topics.length > 6 && (
                <Link className={styles.link} href="/dashboard/mentor/profile">
                  {w("moreTopics", { count: topics.length - 6 })}
                </Link>
              )}
            </div>
            <p className="mt-5 text-xs font-semibold text-muted-foreground">
              {t("bio")}
            </p>
            <p
              className={`mt-2 line-clamp-4 [overflow-wrap:anywhere] whitespace-pre-wrap ${styles.muted}`}
            >
              {bio || w("addBio")}
            </p>
          </section>
          <section
            aria-labelledby="mentor-hours-heading"
            className={styles.panel}
          >
            <div className={styles.heading}>
              <h2 id="mentor-hours-heading">
                <Clock3 className="size-4 text-success" aria-hidden="true" />
                {t("slots")}
              </h2>
              <Link
                href="/dashboard/mentor/office-hours"
                className={styles.link}
              >
                {w("manageHours")}
              </Link>
            </div>
            {mentor?.mentorProfile?.availability && (
              <p className={`mb-3 [overflow-wrap:anywhere] ${styles.muted}`}>
                {mentor.mentorProfile.availability}
              </p>
            )}
            <p className="mb-3 text-xs text-muted-foreground">
              {w("cairoTime")}
            </p>
            {slots.length ? (
              <ul className="space-y-2">
                {slots.slice(0, 2).map((slot) => (
                  <li
                    key={slot.id}
                    className={`${styles.row} flex flex-wrap items-center justify-between gap-2`}
                  >
                    <time dateTime={slot.startTime} className="text-sm">
                      {time(slot.startTime)}
                    </time>
                    <span className="text-xs font-medium text-success">
                      {w("available")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>{w("noHours")}</p>
            )}
          </section>
        </div>
        <div className="grid min-w-0 gap-5">
          <section
            aria-labelledby="mentor-attention-heading"
            className={`${styles.panel} ${styles.amber}`}
          >
            <div className={styles.heading}>
              <h2 id="mentor-attention-heading">
                <Inbox className="size-4 text-orange" aria-hidden="true" />
                {w("attention")}
              </h2>
              <Link href="/dashboard/mentor/requests" className={styles.link}>
                {w("viewRequests")}
              </Link>
            </div>
            {pending.length ? (
              <>
                <p className="mb-3 text-sm">
                  {w("waitingRequests", { count: pending.length })}
                </p>
                <ul className="space-y-2">
                  {pending.slice(0, 2).map((request) => (
                    <li key={request.id}>
                      <Link
                        href={mentorRequestHref(request)}
                        className={styles.row}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold">
                            {request.team.name}
                          </p>
                          <span className="text-xs font-medium text-orange">
                            {w("reviewRequest")}
                          </span>
                        </div>
                        <p className={`mt-1 line-clamp-2 ${styles.muted}`}>
                          {request.topic}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className={styles.empty}>{w("allCaughtUp")}</p>
            )}
          </section>
          <section
            aria-labelledby="mentor-upcoming-heading"
            className={`${styles.panel} ${styles.violet}`}
          >
            <div className={styles.heading}>
              <h2 id="mentor-upcoming-heading">
                <CalendarDays
                  className="size-4 text-primary"
                  aria-hidden="true"
                />
                {w("nextSessions")}
              </h2>
              <Link href="/dashboard/mentor/sessions" className={styles.link}>
                {w("viewSessions")}
              </Link>
            </div>
            {upcoming.length ? (
              <ul className="space-y-2">
                {upcoming.slice(0, 2).map((request) => (
                  <li key={request.id}>
                    <Link
                      href={mentorRequestHref(request)}
                      className={styles.row}
                    >
                      <p className="text-sm font-semibold">
                        {request.team.name}
                      </p>
                      <p className="mt-1 text-sm text-primary">
                        {time(request.slot!.startTime)}
                      </p>
                      <p className={`mt-1 line-clamp-1 ${styles.muted}`}>
                        {request.topic}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>{w("noUpcoming")}</p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              {w("cairoTime")}
            </p>
          </section>
          <section
            aria-labelledby="mentor-messages-heading"
            className={`${styles.panel} ${styles.rose}`}
          >
            <div className={styles.heading}>
              <h2 id="mentor-messages-heading">
                <MessageCircle
                  className="size-4 text-chart-5"
                  aria-hidden="true"
                />
                {w("teamMessages")}
              </h2>
              <Link href="/dashboard/mentor/sessions" className={styles.link}>
                {w("openConversations")}
              </Link>
            </div>
            {messagesLoading ? (
              <p role="status" className={styles.empty}>
                {w("loadingMessages")}
              </p>
            ) : (
              <>
                {messagesError && (
                  <p className={`mb-3 ${styles.muted}`}>{w("messagesError")}</p>
                )}
                {messages.length ? (
                  <ul className="space-y-2">
                    {messages.slice(0, 3).map(({ request, message }) => (
                      <li key={request.id}>
                        <Link
                          href={mentorRequestHref(request)}
                          className={styles.row}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold">
                              {request.team.name}
                            </p>
                            <span className="text-xs font-medium text-chart-5">
                              {w("replyNeeded")}
                            </span>
                          </div>
                          <p className={`mt-1 line-clamp-2 ${styles.muted}`}>
                            {message.content}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {message.sender.name} · {time(message.createdAt)}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  !messagesError && (
                    <p className={styles.empty}>{w("noMessages")}</p>
                  )
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
