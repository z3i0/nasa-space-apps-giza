"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { ArrowRight, Clock3, Plus, Trash2, X } from "lucide-react"
import { Link } from "@/i18n/routing"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { Mentor } from "@/lib/mentorship"
import type { MentorMutation } from "./mentor-request-card"
import styles from "./mentor-workspace.module.css"

type EditorProps = { mentor: Mentor; busy: boolean; mutate: MentorMutation }

function uniqueTopics(values: string[]) {
  const topics = new Map<string, string>()
  for (const value of values) {
    const topic = value.trim().replace(/\s+/g, " ")
    if (topic && !topics.has(topic.toLocaleLowerCase()))
      topics.set(topic.toLocaleLowerCase(), topic)
  }
  return [...topics.values()]
}

export function MentorProfileEditor({ mentor, busy, mutate }: EditorProps) {
  const t = useTranslations("Mentorship")
  const w = useTranslations("Mentorship.workspace")
  const e = useTranslations("Mentorship.editor")
  const [topics, setTopics] = useState(() =>
    uniqueTopics(
      mentor.mentorProfile?.expertise ?? mentor.profile?.skills ?? []
    )
  )
  const [draft, setDraft] = useState("")
  const [bio, setBio] = useState(
    mentor.mentorProfile?.bio || mentor.profile?.bio || ""
  )
  const suggestions = [
    e("suggestions.python"),
    e("suggestions.data"),
    e("suggestions.design"),
    e("suggestions.react"),
    e("suggestions.pitch"),
    e("suggestions.nasa"),
  ].filter(
    (topic) =>
      !topics.some(
        (selected) => selected.toLocaleLowerCase() === topic.toLocaleLowerCase()
      )
  )
  function addTopic() {
    setTopics((current) => uniqueTopics([...current, ...draft.split(/[,،]/)]))
    setDraft("")
  }
  return (
    <section className={`${styles.panel} max-w-4xl sm:p-7`}>
      <div className="flex items-center gap-4 border-b border-border pb-6">
        <Avatar className="size-14 border border-border">
          <AvatarImage src={mentor.avatar || undefined} alt="" />
          <AvatarFallback className="bg-success/10 text-lg font-semibold text-success">
            {mentor.name
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">
            {mentor.name}
          </h2>
          <p className={`mt-1 ${styles.muted}`}>{w("profileVisible")}</p>
        </div>
      </div>
      <form
        onSubmit={async (event) => {
          event.preventDefault()
          const expertise = uniqueTopics([...topics, ...draft.split(/[,،]/)])
          if (
            await mutate("/profile", "PUT", {
              expertise,
              bio: bio.trim(),
              availability: mentor.mentorProfile?.availability || "",
            })
          ) {
            setTopics(expertise)
            setDraft("")
          }
        }}
      >
        <fieldset
          disabled={busy}
          className="mt-6 min-w-0 space-y-7 disabled:opacity-70"
        >
          <div>
            <label
              htmlFor="mentor-topic-input"
              className="text-sm font-semibold"
            >
              {e("topics")}
            </label>
            <p id="mentor-topic-hint" className={`mt-1 ${styles.muted}`}>
              {e("topicsHint")}
            </p>
            <ul
              aria-label={e("selectedTopics")}
              className="mt-4 flex flex-wrap gap-2"
            >
              {topics.map((topic) => (
                <li
                  key={topic}
                  className="flex max-w-full items-center gap-1 rounded-lg border border-success/20 bg-success/8 py-1 ps-3 pe-1 text-sm text-success"
                >
                  <span className="[overflow-wrap:anywhere]">{topic}</span>
                  <button
                    type="button"
                    aria-label={e("removeTopic", { topic })}
                    onClick={() =>
                      setTopics((current) =>
                        current.filter((value) => value !== topic)
                      )
                    }
                    className="flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-success/15 disabled:opacity-50"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <input
                id="mentor-topic-input"
                aria-describedby="mentor-topic-hint"
                className={`${styles.field} mt-0`}
                placeholder={e("topicPlaceholder")}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    addTopic()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={!draft.trim()}
                className="h-auto px-3"
                onClick={addTopic}
              >
                <Plus aria-hidden="true" />
                {e("addTopic")}
              </Button>
            </div>
            {!!suggestions.length && (
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-xs text-muted-foreground">
                  {e("suggested")}
                </span>
                {suggestions.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() =>
                      setTopics((current) => uniqueTopics([...current, topic]))
                    }
                    className="rounded-md px-2 py-1.5 text-xs text-muted-foreground underline decoration-border underline-offset-4 hover:bg-secondary hover:text-foreground"
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="mentor-bio" className="text-sm font-semibold">
              {t("bio")}
            </label>
            <p id="mentor-bio-hint" className={`mt-1 ${styles.muted}`}>
              {e("bioHint")}
            </p>
            <textarea
              id="mentor-bio"
              aria-describedby="mentor-bio-hint"
              className={styles.field}
              rows={4}
              maxLength={1000}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
            <p className="mt-1 text-end text-xs text-muted-foreground tabular-nums">
              <bdi dir="ltr">{bio.length} / 1000</bdi>
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
            <Link
              href="/dashboard/mentor"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {w("backOverview")}
            </Link>
            <Button type="submit" disabled={busy} className="px-5">
              {t("save")}
              <ArrowRight className="rtl:rotate-180" aria-hidden="true" />
            </Button>
          </div>
        </fieldset>
      </form>
    </section>
  )
}

export function MentorOfficeHours({
  mentor,
  busy,
  mutate,
  now,
}: EditorProps & { now: number }) {
  const t = useTranslations("Mentorship")
  const w = useTranslations("Mentorship.workspace")
  const e = useTranslations("Mentorship.editor")
  const locale = useLocale()
  const [slot, setSlot] = useState({ date: "", start: "", end: "" })
  const [validation, setValidation] = useState("")
  const [availability, setAvailability] = useState(
    mentor.mentorProfile?.availability || ""
  )
  const language = locale === "ar" ? "ar-EG" : "en-EG"
  const date = (value: string) =>
    new Intl.DateTimeFormat(language, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "Africa/Cairo",
    }).format(new Date(value))
  const time = (value: string) =>
    new Intl.DateTimeFormat(language, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Africa/Cairo",
    }).format(new Date(value))
  const slots = [...mentor.mentorSlots]
    .filter((item) => Date.parse(item.startTime) > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)]">
      <section className={styles.panel}>
        <h2 className="text-base font-semibold">{e("newTime")}</h2>
        <p className={`mt-1 ${styles.muted}`}>{e("bookingHint")}</p>
        <form
          className="mt-5"
          onSubmit={async (event) => {
            event.preventDefault()
            const start = new Date(`${slot.date}T${slot.start}`)
            const end = new Date(`${slot.date}T${slot.end}`)
            if (
              !Number.isFinite(start.getTime()) ||
              !Number.isFinite(end.getTime()) ||
              start.getTime() <= Date.now() ||
              end <= start ||
              end.getTime() - start.getTime() > 4 * 3600000
            ) {
              setValidation(w("invalidSlot"))
              return
            }
            setValidation("")
            if (
              await mutate("/slots", "POST", {
                startTime: start.toISOString(),
                endTime: end.toISOString(),
              })
            )
              setSlot({ date: "", start: "", end: "" })
          }}
        >
          <fieldset
            disabled={busy}
            className="min-w-0 space-y-4 disabled:opacity-70"
          >
            <label className="block text-sm font-medium">
              {e("date")}
              <input
                required
                type="date"
                className={styles.field}
                value={slot.date}
                onChange={(event) => {
                  setSlot({ ...slot, date: event.target.value })
                  setValidation("")
                }}
              />
            </label>
            <div className="grid min-w-0 grid-cols-2 gap-3">
              <label className="min-w-0 text-sm font-medium">
                {e("from")}
                <input
                  required
                  type="time"
                  className={styles.field}
                  value={slot.start}
                  onChange={(event) => {
                    setSlot({ ...slot, start: event.target.value })
                    setValidation("")
                  }}
                />
              </label>
              <label className="min-w-0 text-sm font-medium">
                {e("until")}
                <input
                  required
                  type="time"
                  className={styles.field}
                  value={slot.end}
                  onChange={(event) => {
                    setSlot({ ...slot, end: event.target.value })
                    setValidation("")
                  }}
                />
              </label>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {w("inputTimeZone", {
                zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })}
            </p>
            {validation && (
              <p role="alert" className="text-sm text-destructive">
                {validation}
              </p>
            )}
            <Button type="submit" disabled={busy} className="w-full">
              <Plus aria-hidden="true" />
              {t("addSlot")}
            </Button>
          </fieldset>
        </form>
        <details className="mt-5 border-t border-border pt-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            {e("availabilityOptional")}
          </summary>
          <form
            className="mt-3"
            onSubmit={(event) => {
              event.preventDefault()
              void mutate("/profile", "PUT", {
                expertise:
                  mentor.mentorProfile?.expertise ??
                  mentor.profile?.skills ??
                  [],
                bio: mentor.mentorProfile?.bio || mentor.profile?.bio || "",
                availability,
              })
            }}
          >
            <label className="text-sm">
              {t("availability")}
              <input
                disabled={busy}
                className={styles.field}
                maxLength={240}
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
              />
            </label>
            <Button
              className="mt-3"
              type="submit"
              variant="outline"
              disabled={busy}
            >
              {w("saveAvailability")}
            </Button>
          </form>
        </details>
      </section>
      <section className={styles.panel}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">{w("openHours")}</h2>
          <span className="rounded-md bg-success/10 px-2 py-1 text-xs font-semibold text-success">
            {slots.length}
          </span>
        </div>
        <p className={`mt-1 ${styles.muted}`}>{w("cairoTime")}</p>
        <ul className="mt-3 divide-y divide-border">
          {slots.map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 items-center justify-between gap-3 py-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">{date(item.startTime)}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  <time dateTime={item.startTime}>{time(item.startTime)}</time>
                  <span>–</span>
                  <time dateTime={item.endTime}>
                    {date(item.startTime) !== date(item.endTime)
                      ? `${date(item.endTime)}, `
                      : ""}
                    {time(item.endTime)}
                  </time>
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                disabled={busy}
                aria-label={w("removeSlot", {
                  date: `${date(item.startTime)}, ${time(item.startTime)}`,
                })}
                onClick={() => void mutate(`/slots/${item.id}`, "DELETE")}
              >
                <Trash2
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
              </Button>
            </li>
          ))}
        </ul>
        {!slots.length && <p className={styles.empty}>{w("noHours")}</p>}
        <div className="mt-2 border-t border-border pt-4">
          <Link href="/dashboard/mentor/sessions" className={styles.link}>
            {w("viewBookedSessions")}
            <ArrowRight
              className="size-3.5 rtl:rotate-180"
              aria-hidden="true"
            />
          </Link>
        </div>
      </section>
    </div>
  )
}
