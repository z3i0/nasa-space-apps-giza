"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { GraduationCap, Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/dashboard/page-header"
import { accountApi } from "@/lib/account"
import {
  ContactEmail,
  DirectoryPagination,
  DirectoryDetails,
  directoryCard,
  directoryField,
  directoryGrid,
  directoryItem,
  directoryTags,
  normalizeDirectoryText as normalize,
} from "./admin-directory-ui"

interface Row {
  id: string
  name: string
  email?: string
  isActive?: boolean
  institution?: string | null
  skills?: string[]
  team?: { id: string; name: string } | null
  challenge?: string | null
  maxMembers?: number
  members?: { userId: string; role: string; user: { name: string } }[]
  submission?: { title: string; status: string; version: number } | null
}
interface Result {
  items: Row[]
  total: number
  page: number
  totalPages: number
}

function DirectoryRecordCard({
  row,
  participant,
}: {
  row: Row
  participant: boolean
}) {
  const t = useTranslations("Operations")
  const d = useTranslations("Operations.directory")
  return (
    <article aria-label={row.name} className={`${directoryItem} min-h-80`}>
      <div className="flex min-h-[4.25rem] items-start gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${participant ? "bg-primary/10 text-primary" : "bg-chart-4/10 text-chart-4"}`}
        >
          {participant ? (
            row.name
              .split(/\s+/)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
          ) : (
            <Users className="size-5" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            title={row.name}
            className="line-clamp-2 text-base font-semibold [overflow-wrap:anywhere]"
          >
            {row.name}
          </h2>
          <p
            className={`mt-1 text-xs ${participant ? (row.isActive ? "text-success" : "text-muted-foreground") : row.submission?.status === "submitted" ? "text-success" : "text-orange"}`}
          >
            {participant
              ? t(row.isActive ? "active" : "inactive")
              : d(row.submission?.status ?? "not_started")}
          </p>
        </div>
      </div>
      {participant ? (
        <>
          <ContactEmail email={row.email} compact />
          <div className="mt-4 space-y-3">
            {row.institution && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <GraduationCap
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span className="line-clamp-1 [overflow-wrap:anywhere]">
                  {row.institution}
                </span>
              </p>
            )}
            <p className="flex items-start gap-2 text-sm">
              <Users
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="line-clamp-1 [overflow-wrap:anywhere]">
                {row.team?.name || t("noTeam")}
              </span>
            </p>
            <div className={directoryTags}>
              {row.skills?.length ? (
                row.skills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="max-w-full truncate rounded-md bg-primary/10 px-2 py-1 text-xs text-primary"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">{t("noSkills")}</p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">{t("challenge")}</p>
            <p className="mt-1 line-clamp-2 text-sm [overflow-wrap:anywhere]">
              {row.challenge || d("noChallenge")}
            </p>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              {t("members")}{" "}
              <bdi className="ms-1 font-semibold text-foreground">
                {row.members?.length ?? 0} / {row.maxMembers}
              </bdi>
            </span>
            <span className="rounded-md bg-chart-4/10 px-2 py-1 text-chart-4">
              {d(
                (row.members?.length ?? 0) < (row.maxMembers ?? 0)
                  ? "open"
                  : "full"
              )}
            </span>
          </div>
          {row.submission && (
            <p className="mt-3 line-clamp-2 text-sm [overflow-wrap:anywhere] text-muted-foreground">
              {row.submission.title} · <bdi>v{row.submission.version}</bdi>
            </p>
          )}
        </>
      )}
      <div className="mt-auto pt-4" data-card-footer>
        <DirectoryDetails
          title={row.name}
          description={d(participant ? "participantDetails" : "teamDetails")}
          trigger={t(participant ? "admin.viewProfile" : "viewMembers")}
        >
          {participant ? (
            <>
              <ContactEmail email={row.email} />
              <dl className="grid gap-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {d("institution")}
                  </dt>
                  <dd className="mt-1 [overflow-wrap:anywhere]">
                    {row.institution || t("notSet")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("team")}</dt>
                  <dd className="mt-1 [overflow-wrap:anywhere]">
                    {row.team?.name || t("noTeam")}
                  </dd>
                </div>
              </dl>
              <section>
                <h3 className="mb-2 text-sm font-semibold">{d("skill")}</h3>
                <div className="flex flex-wrap gap-2">
                  {row.skills?.length ? (
                    row.skills.map((skill) => (
                      <span
                        key={skill}
                        className="max-w-full rounded-md bg-primary/10 px-2 py-1 text-xs [overflow-wrap:anywhere] text-primary"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("noSkills")}
                    </p>
                  )}
                </div>
              </section>
            </>
          ) : (
            <>
              <section>
                <h3 className="mb-1 text-sm font-semibold">{t("challenge")}</h3>
                <p className="text-sm [overflow-wrap:anywhere] text-muted-foreground">
                  {row.challenge || d("noChallenge")}
                </p>
              </section>
              {row.submission && (
                <section>
                  <h3 className="mb-1 text-sm font-semibold">
                    {d(row.submission.status)}
                  </h3>
                  <p className="text-sm [overflow-wrap:anywhere] text-muted-foreground">
                    {row.submission.title} ·{" "}
                    <bdi>v{row.submission.version}</bdi>
                  </p>
                </section>
              )}
              <section>
                <h3 className="mb-2 text-sm font-semibold">{t("members")}</h3>
                {row.members?.length ? (
                  <ul className="divide-y divide-border text-sm">
                    {row.members.map((member) => (
                      <li
                        key={member.userId}
                        className="py-2 [overflow-wrap:anywhere]"
                      >
                        {member.user.name} · {t(member.role)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {d("noMembers")}
                  </p>
                )}
              </section>
            </>
          )}
        </DirectoryDetails>
      </div>
    </article>
  )
}

export function OrganizerDirectory({
  kind,
}: {
  kind: "participants" | "teams"
}) {
  const t = useTranslations("Operations")
  const d = useTranslations("Operations.directory")
  const locale = useLocale()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")
  const [membership, setMembership] = useState("")
  const [topic, setTopic] = useState("")
  const [page, setPage] = useState(1)
  const resultsRef = useRef<HTMLParagraphElement>(null)
  const participant = kind === "participants"

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        // Existing API pages are combined so filters cover the entire directory.
        const getPage = (page: number) =>
          accountApi<Result>(
            `/directory?kind=${kind}&page=${page}&limit=50`,
            undefined,
            controller.signal
          )
        const first = await getPage(1)
        const items = [...first.items]
        for (let page = 2; page <= first.totalPages; page += 3) {
          const batch = await Promise.all(
            Array.from(
              { length: Math.min(3, first.totalPages - page + 1) },
              (_, offset) => getPage(page + offset)
            )
          )
          for (const result of batch) items.push(...result.items)
        }
        if (!controller.signal.aborted) {
          setRows([...new Map(items.map((item) => [item.id, item])).values()])
          setError(false)
        }
      } catch {
        if (!controller.signal.aborted) setError(true)
      }
    }
    void load()
    return () => controller.abort()
  }, [kind, attempt])

  const options = new Map<string, string>()
  for (const row of rows ?? []) {
    for (const value of participant
      ? (row.skills ?? [])
      : row.challenge
        ? [row.challenge]
        : []) {
      const key = normalize(value)
      if (key && !options.has(key)) options.set(key, value.trim())
    }
  }
  const terms = normalize(search).split(/\s+/).filter(Boolean)
  const filtered = (rows ?? [])
    .filter((row) => {
      const haystack = normalize(
        [
          row.name,
          row.email,
          row.institution,
          row.team?.name,
          row.challenge,
          row.submission?.title,
          ...(row.skills ?? []),
          ...(row.members ?? []).map((member) => member.user.name),
        ].join(" ")
      )
      if (!terms.every((term) => haystack.includes(term))) return false
      if (participant)
        return (
          (!status || (status === "active") === !!row.isActive) &&
          (!membership || (membership === "with") === !!row.team) &&
          (!topic || row.skills?.some((skill) => normalize(skill) === topic))
        )
      const full = (row.members?.length ?? 0) >= (row.maxMembers ?? 0)
      return (
        (!status || (row.submission?.status ?? "not_started") === status) &&
        (!membership || (membership === "full") === full) &&
        (!topic ||
          (topic === "__none"
            ? !row.challenge
            : normalize(row.challenge ?? "") === topic))
      )
    })
    .sort((a, b) => a.name.localeCompare(b.name, locale))
  const pages = Math.max(1, Math.ceil(filtered.length / 6))
  const currentPage = Math.min(page, pages)
  const visible = filtered.slice((currentPage - 1) * 6, currentPage * 6)
  const hasFilters = !!(search || status || membership || topic)
  function clear() {
    setSearch("")
    setStatus("")
    setMembership("")
    setTopic("")
    setPage(1)
  }
  function changePage(next: number) {
    setPage(next)
    resultsRef.current?.focus()
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-5">
      <PageHeader title={t(kind)} subtitle={d(`${kind}Hint`)} />
      <section
        aria-label={t("admin.filters")}
        className="grid gap-3 rounded-xl border border-border bg-card p-4"
      >
        <label className="text-xs font-medium">
          {t("search")}
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-3 top-[18px] size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              className={`${directoryField} ps-9`}
              value={search}
              placeholder={d(`${kind}Search`)}
              maxLength={150}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="min-w-0 text-xs font-medium">
            {d(participant ? "accountStatus" : "submissionStatus")}
            <select
              className={directoryField}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                setPage(1)
              }}
            >
              <option value="">{d("allStatuses")}</option>
              {(participant
                ? ["active", "inactive"]
                : ["submitted", "draft", "not_started"]
              ).map((value) => (
                <option key={value} value={value}>
                  {participant ? t(value) : d(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium">
            {d(participant ? "teamMembership" : "capacity")}
            <select
              className={directoryField}
              value={membership}
              onChange={(event) => {
                setMembership(event.target.value)
                setPage(1)
              }}
            >
              <option value="">
                {d(participant ? "allParticipants" : "allTeams")}
              </option>
              {(participant ? ["with", "without"] : ["open", "full"]).map(
                (value) => (
                  <option key={value} value={value}>
                    {d(value)}
                  </option>
                )
              )}
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium">
            {d(participant ? "skill" : "challenge")}
            <select
              className={directoryField}
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value)
                setPage(1)
              }}
            >
              <option value="">
                {d(participant ? "allSkills" : "allChallenges")}
              </option>
              {!participant && (
                <option value="__none">{d("noChallenge")}</option>
              )}
              {[...options]
                .sort(([, a], [, b]) => a.localeCompare(b, locale))
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {hasFilters && (
          <button
            className="w-fit py-1 text-xs font-medium text-primary hover:underline"
            onClick={clear}
          >
            {t("admin.clearFilters")}
          </button>
        )}
      </section>
      {error ? (
        <div role="alert" className={directoryCard}>
          {t("error")}{" "}
          <Button
            variant="outline"
            onClick={() => setAttempt((value) => value + 1)}
          >
            {t("retry")}
          </Button>
        </div>
      ) : !rows ? (
        <p role="status" className="py-4 text-sm text-muted-foreground">
          {t("loading")}
        </p>
      ) : (
        <>
          <p
            ref={resultsRef}
            tabIndex={-1}
            role="status"
            className="text-xs text-muted-foreground"
          >
            {t("admin.showing", {
              start: filtered.length ? (currentPage - 1) * 6 + 1 : 0,
              end: Math.min(currentPage * 6, filtered.length),
              total: filtered.length,
            })}
          </p>
          {visible.length ? (
            <div className={directoryGrid}>
              {visible.map((row) => (
                <DirectoryRecordCard
                  key={row.id}
                  row={row}
                  participant={participant}
                />
              ))}
            </div>
          ) : (
            <div className={`${directoryCard} py-8 text-center`}>
              <h2 className="font-semibold">{t("empty")}</h2>
              {hasFilters && (
                <Button className="mt-3" variant="outline" onClick={clear}>
                  {t("admin.clearFilters")}
                </Button>
              )}
            </div>
          )}
          <DirectoryPagination
            page={currentPage}
            pages={pages}
            onChange={changePage}
          />
        </>
      )}
    </div>
  )
}
