"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { useTranslations } from "next-intl"
import { Users, Search, Orbit, UserPlus } from "lucide-react"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import { getAuthUser } from "@/lib/auth"
import {
  requestTeams,
  teamErrorKey,
  type Team,
  type TeamDraft,
  type TeamInbox,
  type TeamSearch,
} from "@/lib/teams"
import { TeamEditor } from "./team-editor"
import { ApplicantRequest } from "./applicant-request"
import { ContactNumber, LeaderContact } from "./participant-details"
import styles from "./team-workspace.module.css"

function fetchWorkspace(signal?: AbortSignal) {
  return Promise.all([
    requestTeams<Team | { team: null }>("/me", { signal }),
    requestTeams<TeamInbox>("/requests/me", { signal }),
  ])
}

export function TeamWorkspace({ discover = false }: { discover?: boolean }) {
  const t = useTranslations("Teams")
  const [team, setTeam] = useState<Team | null>(null)
  const [inbox, setInbox] = useState<TeamInbox>({
    invitations: [],
    joinRequests: [],
  })
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [editing, setEditing] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [revision, setRevision] = useState(0)
  const [search, setSearch] = useState("")
  const [query, setQuery] = useState({ search: "", page: 1 })
  const [searchState, setSearchState] = useState<{
    key: string
    results: TeamSearch | null
    error: string
  } | null>(null)
  const searchKey = JSON.stringify([query, revision])
  const searchLoading = searchState?.key !== searchKey
  const results = searchLoading ? null : searchState?.results
  const searchError = searchLoading ? "" : searchState?.error
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const actionLock = useRef(false)
  const activeRequest = useRef<AbortController | null>(null)
  const workspaceSnapshot = useRef("")

  const applyWorkspace = useCallback(
    ([mine, requests]: Awaited<ReturnType<typeof fetchWorkspace>>) => {
      workspaceSnapshot.current = JSON.stringify([mine, requests])
      setTeam("id" in mine ? mine : null)
      setInbox(requests)
      setReady(true)
    },
    []
  )

  useEffect(() => {
    const controller = new AbortController()
    activeRequest.current = controller
    fetchWorkspace(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) applyWorkspace(data)
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(teamErrorKey(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => {
      controller.abort()
      activeRequest.current?.abort()
    }
  }, [applyWorkspace])

  // Refresh quietly while idle; never interrupt a form or overlap a mutation.
  useEffect(() => {
    if (!ready || loading || busy || editing || selected || inviteEmail) return
    let controller: AbortController | null = null
    const update = async () => {
      if (
        document.visibilityState !== "visible" ||
        actionLock.current ||
        controller
      )
        return
      controller = new AbortController()
      const signal = controller.signal
      try {
        const data = await fetchWorkspace(signal)
        if (
          !signal.aborted &&
          !actionLock.current &&
          JSON.stringify(data) !== workspaceSnapshot.current
        ) {
          applyWorkspace(data)
          setNotice("workspaceUpdated")
          setRevision((value) => value + 1)
        }
      } catch {
        // Keep the current workspace on a background failure; the next tick retries.
      } finally {
        controller = null
      }
    }
    const timer = window.setInterval(() => void update(), 30_000)
    const onVisible = () => {
      if (document.visibilityState === "visible") void update()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
      controller?.abort()
    }
  }, [ready, loading, busy, editing, selected, inviteEmail, applyWorkspace])

  useEffect(() => {
    if (!discover) return
    const controller = new AbortController()
    const params = new URLSearchParams({
      search: query.search,
      page: String(query.page),
      limit: "9",
    })
    requestTeams<TeamSearch>(`?${params}`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setSearchState({ key: searchKey, results: data, error: "" })
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setSearchState({
            key: searchKey,
            results: null,
            error: teamErrorKey(e),
          })
      })
    return () => controller.abort()
  }, [discover, query, searchKey])

  async function reload() {
    if (actionLock.current) return
    const controller = new AbortController()
    activeRequest.current?.abort()
    activeRequest.current = controller
    setLoading(true)
    setError("")
    try {
      const data = await fetchWorkspace(controller.signal)
      if (controller.signal.aborted) return
      applyWorkspace(data)
      setRevision((v) => v + 1)
    } catch (e) {
      if (!controller.signal.aborted) setError(teamErrorKey(e))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  async function mutate(
    path: string,
    method: string,
    body: unknown,
    success: string
  ) {
    if (actionLock.current) return false
    actionLock.current = true
    setBusy(true)
    setError("")
    setNotice("")
    const controller = new AbortController()
    activeRequest.current = controller
    try {
      await requestTeams(path, { method, body, signal: controller.signal })
      const data = await fetchWorkspace(controller.signal)
      if (controller.signal.aborted) return false
      applyWorkspace(data)
      setNotice(success)
      setRevision((v) => v + 1)
      return true
    } catch (e) {
      if (!controller.signal.aborted) setError(teamErrorKey(e))
      return false
    } finally {
      actionLock.current = false
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  async function saveTeam(draft: TeamDraft) {
    const ok = await mutate(
      team ? `/${team.id}` : "",
      team ? "PUT" : "POST",
      draft,
      team ? "saved" : "created"
    )
    if (ok) setEditing(false)
    return ok
  }

  async function invite(event: FormEvent) {
    event.preventDefault()
    if (
      team &&
      (await mutate(
        `/${team.id}/invitations`,
        "POST",
        { email: inviteEmail.trim() },
        "invited"
      ))
    )
      setInviteEmail("")
  }

  const leader = team?.myRole === "leader"
  const full = !!team && team.membersCount >= team.maxMembers
  const myId = getAuthUser()?.id

  return (
    <div className={styles.workspace} data-team-workspace aria-busy={busy}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{t("eyebrow")}</p>
          <h1>{t(discover ? "findTitle" : "title")}</h1>
          <p>{t(discover ? "findSubtitle" : "subtitle")}</p>
        </div>
        <Link
          className={styles.linkButton}
          href={
            discover
              ? "/dashboard/participant/team"
              : "/dashboard/participant/find-team"
          }
        >
          {discover ? <Users size={18} /> : <Search size={18} />}
          {t(discover ? "title" : "findTitle")}
        </Link>
      </header>

      {error && (
        <div role="alert" className={styles.error}>
          <p>{t(error)}</p>
          {error === "sessionExpired" ? (
            <Link href="/login">{t("signIn")}</Link>
          ) : error === "contactRequired" ? (
            <Link href="/dashboard/participant/profile">
              {t("editProfile")}
            </Link>
          ) : (
            <Button variant="secondary" disabled={busy} onClick={reload}>
              {t("refresh")}
            </Button>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {t(notice)}
        </p>
      )}
      {loading ? (
        <p role="status" className={styles.card}>
          {t("loading")}
        </p>
      ) : (
        ready && (
          <>
            {!discover && !team && (
              <div className={styles.columns}>
                <section className={styles.card}>
                  <Orbit className={styles.accentIcon} size={32} />
                  <h2>{t("noTeam")}</h2>
                  <p className={styles.muted}>{t("noTeamDescription")}</p>
                  <p className={styles.muted}>
                    {t("teamContactHint")}{" "}
                    <Link
                      className={styles.profileLink}
                      href="/dashboard/participant/profile"
                    >
                      {t("editProfile")}
                    </Link>
                  </p>
                  <TeamEditor busy={busy} onSave={saveTeam} />
                </section>
                <aside className={styles.stack}>
                  <section className={styles.card}>
                    <UserPlus className={styles.accentIcon} size={28} />
                    <h2>{t("findYourCrew")}</h2>
                    <p className={styles.muted}>{t("findCrewDescription")}</p>
                    <Link
                      className={styles.linkButton}
                      href="/dashboard/participant/find-team"
                    >
                      {t("browseTeams")}
                    </Link>
                  </section>
                  <section className={styles.card}>
                    <h2>{t("teamRules")}</h2>
                    <p className={styles.muted}>{t("teamRulesDescription")}</p>
                  </section>
                </aside>
              </div>
            )}

            {!discover && team && (
              <div className={styles.columns}>
                <div className={styles.stack}>
                  <section className={styles.card}>
                    <div className={styles.row}>
                      <span className={styles.badge}>
                        {t(leader ? "leader" : "member")}
                      </span>
                      <span className={styles.capacity}>
                        {t("capacity", {
                          count: team.membersCount,
                          max: team.maxMembers,
                        })}
                      </span>
                    </div>
                    <h2 className={styles.teamName}>{team.name}</h2>
                    <p className={styles.muted}>
                      {team.description || t("noDescription")}
                    </p>
                    <div className={styles.tags}>
                      <span>{team.challenge || t("noChallenge")}</span>
                      {team.track && <span>{team.track}</span>}
                    </div>
                    <Link
                      href={
                        team.challengeId
                          ? `/dashboard/participant/challenges/${team.challengeId}`
                          : "/dashboard/participant/challenges"
                      }
                      className="text-sm text-cyan-200 underline underline-offset-4"
                    >
                      {t("browseChallenges")}
                    </Link>
                    {leader && (
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setEditing(!editing)}
                      >
                        {t(editing ? "cancel" : "edit")}
                      </Button>
                    )}
                    {editing && leader && (
                      <TeamEditor
                        key={team.id}
                        initial={{
                          name: team.name,
                          description: team.description || "",
                          challenge: team.challenge || "",
                          track: team.track || "",
                        }}
                        busy={busy}
                        onSave={saveTeam}
                        onCancel={() => setEditing(false)}
                      />
                    )}
                  </section>
                  <section className={styles.card}>
                    <h2>{t("roster")}</h2>
                    <ul className={styles.list}>
                      {team.members.map((member) => (
                        <li key={member.id} className={styles.member}>
                          <div className={styles.identity}>
                            <span className={styles.avatar} aria-hidden="true">
                              {(member.user?.name || "?").slice(0, 1)}
                            </span>
                            <div>
                              <strong>
                                {member.user?.name || t("participant")}
                              </strong>
                              <p className={styles.muted}>
                                {t(member.role)}
                                {member.assignedRole &&
                                  ` · ${member.assignedRole}`}
                              </p>
                              <ContactNumber phone={member.user?.phone} />
                            </div>
                          </div>
                          {leader && member.role !== "leader" && (
                            <div className={styles.actions}>
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      t("transferConfirm", {
                                        name:
                                          member.user?.name || t("participant"),
                                      })
                                    )
                                  )
                                    void mutate(
                                      `/${team.id}/leadership`,
                                      "POST",
                                      { userId: member.userId },
                                      "transferred"
                                    )
                                }}
                              >
                                {t("makeLeader")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      t("removeConfirm", {
                                        name:
                                          member.user?.name || t("participant"),
                                      })
                                    )
                                  )
                                    void mutate(
                                      `/${team.id}/members/${member.userId}`,
                                      "DELETE",
                                      undefined,
                                      "removed"
                                    )
                                }}
                              >
                                {t("remove")}
                              </Button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                    {leader && team.membersCount > 1 ? (
                      <p className={styles.muted}>{t("leaderLeaveHint")}</p>
                    ) : (
                      <Button
                        variant="outline"
                        disabled={busy || !myId}
                        onClick={() => {
                          if (
                            window.confirm(
                              t(leader ? "deleteConfirm" : "leaveConfirm")
                            )
                          )
                            void mutate(
                              `/${team.id}/members/${myId}`,
                              "DELETE",
                              undefined,
                              "left"
                            )
                        }}
                      >
                        {t(leader ? "deleteTeam" : "leaveTeam")}
                      </Button>
                    )}
                  </section>
                </div>
                <aside className={styles.stack}>
                  {leader ? (
                    <>
                      <section className={styles.card}>
                        <h2>{t("inviteTitle")}</h2>
                        <p className={styles.muted}>
                          {t(full ? "teamFull" : "inviteDescription")}
                        </p>
                        <form onSubmit={invite} className={styles.stack}>
                          <label className={styles.field}>
                            {t("email")}
                            <input
                              className={styles.control}
                              type="email"
                              required
                              value={inviteEmail}
                              disabled={busy || full}
                              onChange={(e) => setInviteEmail(e.target.value)}
                            />
                          </label>
                          <Button type="submit" disabled={busy || full}>
                            {t("sendInvite")}
                          </Button>
                        </form>
                        {!!team.invitations?.length && (
                          <>
                            <h3>{t("pendingInvites")}</h3>
                            <ul className={styles.list}>
                              {team.invitations.map((invitation) => (
                                <li key={invitation.id}>
                                  {invitation.invitedUser?.name ||
                                    t("participant")}{" "}
                                  <span className={styles.muted}>
                                    · {t("pending")}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </section>
                      <section className={styles.card}>
                        <h2>{t("joinRequests")}</h2>
                        {!team.joinRequests?.length ? (
                          <p className={styles.muted}>{t("noJoinRequests")}</p>
                        ) : (
                          <ul className={styles.list}>
                            {team.joinRequests.map((request) => (
                              <li key={request.id} className={styles.request}>
                                <ApplicantRequest
                                  user={request.user}
                                  message={request.message}
                                >
                                  <div className={styles.actions}>
                                    <Button
                                      size="sm"
                                      disabled={busy || full}
                                      onClick={() =>
                                        void mutate(
                                          `/join-requests/${request.id}/respond`,
                                          "POST",
                                          { accept: true },
                                          "approved"
                                        )
                                      }
                                    >
                                      {t("approve")}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      disabled={busy}
                                      onClick={() =>
                                        void mutate(
                                          `/join-requests/${request.id}/respond`,
                                          "POST",
                                          { accept: false },
                                          "declined"
                                        )
                                      }
                                    >
                                      {t("decline")}
                                    </Button>
                                  </div>
                                </ApplicantRequest>
                              </li>
                            ))}
                          </ul>
                        )}
                        {full && (
                          <p className={styles.muted}>{t("teamFull")}</p>
                        )}
                      </section>
                    </>
                  ) : (
                    <section className={styles.card}>
                      <h2>{t("teamRules")}</h2>
                      <p className={styles.muted}>{t("memberHint")}</p>
                    </section>
                  )}
                </aside>
              </div>
            )}

            {!team &&
              (inbox.invitations.length > 0 ||
                inbox.joinRequests.length > 0) && (
                <section className={styles.card}>
                  <h2>{t("yourRequests")}</h2>
                  <ul className={styles.list}>
                    {inbox.invitations.map((invitation) => (
                      <li className={styles.member} key={invitation.id}>
                        <div>
                          <strong>{invitation.team.name}</strong>
                          <p className={styles.muted}>
                            {t("invitationReceived")}
                          </p>
                          <LeaderContact teamId={invitation.teamId} />
                        </div>
                        <div className={styles.actions}>
                          <Button
                            disabled={busy}
                            onClick={() =>
                              void mutate(
                                `/invitations/${invitation.id}/respond`,
                                "POST",
                                { accept: true },
                                "joined"
                              )
                            }
                          >
                            {t("accept")}
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                              void mutate(
                                `/invitations/${invitation.id}/respond`,
                                "POST",
                                { accept: false },
                                "declined"
                              )
                            }
                          >
                            {t("decline")}
                          </Button>
                        </div>
                      </li>
                    ))}
                    {inbox.joinRequests.map((request) => (
                      <li className={styles.member} key={request.id}>
                        <strong>{request.team.name}</strong>
                        <span className={styles.badge}>
                          {t("requestPending")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

            {discover && (
              <>
                {team && (
                  <p className={styles.notice}>
                    {t("alreadyInTeam", { name: team.name })}
                  </p>
                )}
                <form
                  className={styles.search}
                  onSubmit={(e) => {
                    e.preventDefault()
                    setQuery({ search: search.trim(), page: 1 })
                    setSelected(null)
                  }}
                >
                  <label className={styles.field}>
                    {t("searchLabel")}
                    <input
                      type="search"
                      className={styles.control}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("searchPlaceholder")}
                    />
                  </label>
                  <Button type="submit" disabled={searchLoading}>
                    <Search size={16} />
                    {t("search")}
                  </Button>
                </form>
                {searchLoading ? (
                  <p role="status">{t("loading")}</p>
                ) : searchError ? (
                  <div role="alert" className={styles.error}>
                    <p>{t(searchError)}</p>
                    <Button onClick={() => setRevision((v) => v + 1)}>
                      {t("refresh")}
                    </Button>
                  </div>
                ) : (
                  results && (
                    <>
                      <p className={styles.muted} role="status">
                        {t("results", { count: results.total })}
                      </p>
                      {!results.items.length && (
                        <section className={styles.card}>
                          <h2>{t("noResults")}</h2>
                          <p className={styles.muted}>
                            {t("noResultsDescription")}
                          </p>
                        </section>
                      )}
                      <div className={styles.grid}>
                        {results.items.map((item) => {
                          const isFull = item.membersCount >= item.maxMembers
                          const pending = inbox.joinRequests.some(
                            (request) => request.teamId === item.id
                          )
                          return (
                            <article className={styles.card} key={item.id}>
                              <div className={styles.row}>
                                <Users
                                  className={styles.accentIcon}
                                  size={22}
                                />
                                <span className={styles.capacity}>
                                  {t("capacity", {
                                    count: item.membersCount,
                                    max: item.maxMembers,
                                  })}
                                </span>
                              </div>
                              <h2>{item.name}</h2>
                              <p className={styles.muted}>
                                {item.description || t("noDescription")}
                              </p>
                              <div className={styles.tags}>
                                <span>
                                  {item.challenge || t("noChallenge")}
                                </span>
                                {item.track && <span>{item.track}</span>}
                              </div>
                              <p className={styles.muted}>
                                {item.members
                                  .map((member) => member.user?.name)
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                              {selected === item.id ? (
                                <form
                                  className={styles.stack}
                                  onSubmit={async (e) => {
                                    e.preventDefault()
                                    if (
                                      await mutate(
                                        `/${item.id}/join-requests`,
                                        "POST",
                                        { message },
                                        "requested"
                                      )
                                    ) {
                                      setSelected(null)
                                      setMessage("")
                                    }
                                  }}
                                >
                                  <LeaderContact teamId={item.id} />
                                  <p className={styles.muted}>
                                    {t("applicationSharing")}
                                  </p>
                                  <label className={styles.field}>
                                    {t("message")}
                                    <textarea
                                      className={styles.control}
                                      maxLength={300}
                                      value={message}
                                      disabled={busy}
                                      onChange={(e) =>
                                        setMessage(e.target.value)
                                      }
                                    />
                                  </label>
                                  <div className={styles.actions}>
                                    <Button
                                      type="submit"
                                      disabled={
                                        busy || !!team || isFull || pending
                                      }
                                    >
                                      {t("sendRequest")}
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      disabled={busy}
                                      onClick={() => setSelected(null)}
                                    >
                                      {t("cancel")}
                                    </Button>
                                  </div>
                                </form>
                              ) : (
                                <Button
                                  variant="secondary"
                                  disabled={busy || !!team || isFull || pending}
                                  onClick={() => {
                                    setSelected(item.id)
                                    setMessage("")
                                  }}
                                >
                                  {t(
                                    pending
                                      ? "requestPending"
                                      : isFull
                                        ? "full"
                                        : "requestJoin"
                                  )}
                                </Button>
                              )}
                              {pending && <LeaderContact teamId={item.id} />}
                            </article>
                          )
                        })}
                      </div>
                      {results.totalPages > 1 && (
                        <nav
                          aria-label={t("pagination")}
                          className={styles.pagination}
                        >
                          <Button
                            variant="secondary"
                            disabled={query.page <= 1}
                            onClick={() =>
                              setQuery({ ...query, page: query.page - 1 })
                            }
                          >
                            {t("previous")}
                          </Button>
                          <span>
                            {t("page", {
                              page: results.page,
                              total: results.totalPages,
                            })}
                          </span>
                          <Button
                            variant="secondary"
                            disabled={query.page >= results.totalPages}
                            onClick={() =>
                              setQuery({ ...query, page: query.page + 1 })
                            }
                          >
                            {t("next")}
                          </Button>
                        </nav>
                      )}
                    </>
                  )
                )}
              </>
            )}
          </>
        )
      )}
    </div>
  )
}
