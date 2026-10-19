"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { PageHeader } from "@/components/dashboard/page-header"
import { useAuthUser } from "@/lib/auth"
import {
  MentorshipApiError,
  mentorshipApi,
  type Mentor,
  type MentorshipRequest,
} from "@/lib/mentorship"

import { MentorshipChat } from "./mentorship-chat"

type Role = "mentor" | "participant"
const card = "rounded-2xl border border-[#2a3950] bg-[#111b2d] p-5"
const button =
  "rounded-xl bg-[#fb9746] px-4 py-2 text-sm font-semibold text-[#080d20] hover:bg-[#ffad67] disabled:opacity-50"
const secondary =
  "rounded-xl border border-[#2a3950] bg-[#172439] px-4 py-2 text-sm text-[#e0e2ef] hover:border-[#7df4ff] disabled:opacity-50"
const field =
  "w-full rounded-xl border border-[#2a3950] bg-[#080d20] px-3 py-2 text-sm text-[#e0e2ef]"

export function MentorshipHub({ role }: { role: Role }) {
  const t = useTranslations("Mentorship")
  const locale = useLocale()
  const user = useAuthUser()
  const userId = user?.id
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [requests, setRequests] = useState<MentorshipRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const mutationLock = useRef(false)
  const [error, setError] = useState("")
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null)
  const [topic, setTopic] = useState("")
  const [openRequest, setOpenRequest] = useState<string | null>(null)
  const [profile, setProfile] = useState({
    expertise: "",
    availability: "",
    bio: "",
  })
  const [slot, setSlot] = useState({ startTime: "", endTime: "" })
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const [savedNotes, setSavedNotes] = useState<Record<string, boolean>>({})

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const [mentorList, requestList] = await Promise.all([
          mentorshipApi<Mentor[]>("/mentors", { signal }),
          mentorshipApi<MentorshipRequest[]>("/requests", { signal }),
        ])
        if (!signal?.aborted) {
          setMentors(mentorList)
          setRequests(requestList)
          setError("")
        }
        if (!signal?.aborted && role === "mentor" && userId) {
          const own = mentorList.find(
            (mentor) => mentor.id === userId
          )?.mentorProfile
          if (own)
            setProfile({
              expertise: own.expertise.join(", "),
              availability: own.availability,
              bio: own.bio,
            })
        }
      } catch {
        if (!signal?.aborted) setError(t("error"))
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [t, role, userId]
  )

  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(() => refresh(controller.signal))
    return () => controller.abort()
  }, [refresh])
  async function act(
    action: () => Promise<unknown>,
    after?: () => void,
    teamRequest = false
  ) {
    if (mutationLock.current) return
    mutationLock.current = true
    setBusy(true)
    setError("")
    try {
      await action()
      after?.()
      await refresh()
    } catch (cause) {
      setError(
        teamRequest &&
          cause instanceof MentorshipApiError &&
          cause.status === 400
          ? t("noTeam")
          : t("requestFailed")
      )
    } finally {
      mutationLock.current = false
      setBusy(false)
    }
  }
  const time = (value: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Cairo",
    }).format(new Date(value))
  const mine = mentors.find((mentor) => mentor.id === user?.id)
  const pending = requests.filter(
    (request) => request.status === "pending"
  ).length
  const active = requests.filter(
    (request) => request.status === "accepted"
  ).length
  const upcoming = requests.filter(
    (request) => request.slot && new Date(request.slot.startTime) > new Date()
  ).length

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={t(role === "mentor" ? "mentorTitle" : "participantTitle")}
        subtitle={t(
          role === "mentor" ? "mentorSubtitle" : "participantSubtitle"
        )}
      />
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200"
        >
          {error}{" "}
          <button className="ms-3 underline" onClick={() => void refresh()}>
            {t("retry")}
          </button>
        </div>
      )}
      {loading ? (
        <p className="text-[#a8b5ca]">{t("loading")}</p>
      ) : (
        <>
          {role === "mentor" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ["pendingCount", pending],
                    ["activeCount", active],
                    ["upcomingCount", upcoming],
                  ] as const
                ).map(([key, value]) => (
                  <div key={key} className={card}>
                    <p className="text-sm text-[#a8b5ca]">{t(key)}</p>
                    <p className="mt-2 text-3xl font-bold text-[#7df4ff]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <section className={card}>
                <h2 className="text-lg font-semibold">{t("profile")}</h2>
                <form
                  className="mt-4 grid gap-4 md:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void act(() =>
                      mentorshipApi("/profile", {
                        method: "PUT",
                        body: {
                          expertise: profile.expertise
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                          availability: profile.availability,
                          bio: profile.bio,
                        },
                      })
                    )
                  }}
                >
                  <label className="text-sm">
                    {t("expertise")}
                    <input
                      className={`mt-2 ${field}`}
                      value={profile.expertise}
                      onChange={(e) =>
                        setProfile({ ...profile, expertise: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    {t("availability")}
                    <input
                      className={`mt-2 ${field}`}
                      maxLength={240}
                      value={profile.availability}
                      onChange={(e) =>
                        setProfile({ ...profile, availability: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm md:col-span-2">
                    {t("bio")}
                    <textarea
                      className={`mt-2 min-h-24 ${field}`}
                      maxLength={1000}
                      value={profile.bio}
                      onChange={(e) =>
                        setProfile({ ...profile, bio: e.target.value })
                      }
                    />
                  </label>
                  <button
                    disabled={busy}
                    className={`${button} justify-self-start`}
                  >
                    {t("save")}
                  </button>
                </form>
              </section>
              <section className={card}>
                <h2 className="text-lg font-semibold">{t("slots")}</h2>
                <form
                  className="mt-4 flex flex-wrap items-end gap-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void act(
                      () =>
                        mentorshipApi("/slots", {
                          method: "POST",
                          body: {
                            startTime: new Date(slot.startTime).toISOString(),
                            endTime: new Date(slot.endTime).toISOString(),
                          },
                        }),
                      () => setSlot({ startTime: "", endTime: "" })
                    )
                  }}
                >
                  <label className="text-sm">
                    {t("start")}
                    <input
                      required
                      type="datetime-local"
                      className={`mt-2 ${field}`}
                      value={slot.startTime}
                      onChange={(e) =>
                        setSlot({ ...slot, startTime: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    {t("end")}
                    <input
                      required
                      type="datetime-local"
                      className={`mt-2 ${field}`}
                      value={slot.endTime}
                      onChange={(e) =>
                        setSlot({ ...slot, endTime: e.target.value })
                      }
                    />
                  </label>
                  <button disabled={busy} className={button}>
                    {t("addSlot")}
                  </button>
                </form>
                <div className="mt-4 grid gap-2">
                  {mine?.mentorSlots.length ? (
                    mine.mentorSlots.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2a3950] p-3 text-sm"
                      >
                        <span>
                          {time(item.startTime)} – {time(item.endTime)}
                        </span>
                        <button
                          disabled={busy}
                          className={secondary}
                          onClick={() =>
                            void act(() =>
                              mentorshipApi(`/slots/${item.id}`, {
                                method: "DELETE",
                              })
                            )
                          }
                        >
                          {t("remove")}
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#a8b5ca]">{t("noSlots")}</p>
                  )}
                </div>
              </section>
            </>
          )}
          {role === "participant" && (
            <section>
              <h2 className="mb-3 text-xl font-semibold">{t("mentors")}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {mentors.length ? (
                  mentors.map((mentor) => (
                    <article key={mentor.id} className={card}>
                      <h3 className="font-semibold">{mentor.name}</h3>
                      <p className="mt-1 text-xs text-[#7df4ff]">
                        {mentor.mentorProfile?.expertise.join(" · ") ||
                          mentor.profile?.skills.join(" · ")}
                      </p>
                      <p className="mt-3 text-sm text-[#a8b5ca]">
                        {mentor.mentorProfile?.bio || mentor.profile?.bio}
                      </p>
                      <p className="mt-2 text-xs text-[#a8b5ca]">
                        {mentor.mentorProfile?.availability}
                      </p>
                      <button
                        className={`${button} mt-4`}
                        onClick={() =>
                          setSelectedMentor(
                            selectedMentor === mentor.id ? null : mentor.id
                          )
                        }
                      >
                        {t("request")}
                      </button>
                      {selectedMentor === mentor.id && (
                        <form
                          className="mt-4 space-y-3"
                          onSubmit={(e) => {
                            e.preventDefault()
                            void act(
                              () =>
                                mentorshipApi("/requests", {
                                  method: "POST",
                                  body: { mentorId: mentor.id, message: topic },
                                }),
                              () => {
                                setSelectedMentor(null)
                                setTopic("")
                              },
                              true
                            )
                          }}
                        >
                          <label className="block text-sm">
                            {t("requestHint")}
                            <textarea
                              required
                              minLength={10}
                              maxLength={1000}
                              className={`mt-2 min-h-24 ${field}`}
                              value={topic}
                              onChange={(e) => setTopic(e.target.value)}
                            />
                          </label>
                          <button disabled={busy} className={button}>
                            {t("sendRequest")}
                          </button>
                        </form>
                      )}
                      {!!mentor.mentorSlots.length && (
                        <div className="mt-4 border-t border-[#2a3950] pt-3">
                          <p className="mb-2 text-sm font-medium">
                            {t("slots")}
                          </p>
                          {mentor.mentorSlots.map((item) => (
                            <p key={item.id} className="text-xs text-[#a8b5ca]">
                              {time(item.startTime)}
                            </p>
                          ))}
                        </div>
                      )}
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-[#a8b5ca]">{t("noMentors")}</p>
                )}
              </div>
            </section>
          )}
          <section>
            <h2 className="mb-3 text-xl font-semibold">{t("requests")}</h2>
            <div className="grid gap-4">
              {requests.length ? (
                requests.map((request) => (
                  <article key={request.id} className={card}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">
                          {role === "mentor"
                            ? request.team.name
                            : request.mentor.name}
                        </h3>
                        <p className="mt-1 text-sm text-[#a8b5ca]">
                          {request.topic}
                        </p>
                        <p className="mt-2 text-xs text-[#a8b5ca]">
                          {time(request.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#2a3950] bg-[#172439] px-3 py-1 text-xs text-[#7df4ff]">
                        {t(request.status)}
                      </span>
                    </div>
                    {request.slot && (
                      <p className="mt-3 text-sm text-[#7df4ff]">
                        {time(request.slot.startTime)}
                      </p>
                    )}
                    {["accepted", "completed"].includes(request.status) && (
                      <div className="mt-4 rounded-xl border border-[#2a3950] bg-[#080d20] p-4">
                        <h4 className="text-sm font-semibold">{t("notes")}</h4>
                        {role === "mentor" ? (
                          <form
                            className="mt-2 space-y-2"
                            onSubmit={(e) => {
                              e.preventDefault()
                              void act(
                                () =>
                                  mentorshipApi(
                                    `/requests/${request.id}/notes`,
                                    {
                                      method: "PUT",
                                      body: {
                                        content:
                                          noteDrafts[request.id] ??
                                          request.sessionNotes ??
                                          "",
                                      },
                                    }
                                  ),
                                () =>
                                  setSavedNotes((current) => ({
                                    ...current,
                                    [request.id]: true,
                                  }))
                              )
                            }}
                          >
                            <textarea
                              className={`min-h-20 ${field}`}
                              maxLength={2000}
                              aria-label={t("notes")}
                              value={
                                noteDrafts[request.id] ??
                                request.sessionNotes ??
                                ""
                              }
                              onChange={(e) => {
                                setSavedNotes((current) => ({
                                  ...current,
                                  [request.id]: false,
                                }))
                                setNoteDrafts((current) => ({
                                  ...current,
                                  [request.id]: e.target.value,
                                }))
                              }}
                            />
                            <button disabled={busy} className={secondary}>
                              {t("saveNotes")}
                            </button>
                            {savedNotes[request.id] && (
                              <p
                                role="status"
                                className="text-sm text-[#7df4ff]"
                              >
                                {t("notesSaved")}
                              </p>
                            )}
                          </form>
                        ) : (
                          <p className="mt-2 text-sm whitespace-pre-wrap text-[#a8b5ca]">
                            {request.sessionNotes || t("noNotes")}
                          </p>
                        )}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {role === "mentor" && request.status === "pending" && (
                        <>
                          <button
                            disabled={busy}
                            className={button}
                            onClick={() =>
                              void act(() =>
                                mentorshipApi(`/requests/${request.id}`, {
                                  method: "PATCH",
                                  body: { status: "accepted" },
                                })
                              )
                            }
                          >
                            {t("accept")}
                          </button>
                          <button
                            disabled={busy}
                            className={secondary}
                            onClick={() =>
                              void act(() =>
                                mentorshipApi(`/requests/${request.id}`, {
                                  method: "PATCH",
                                  body: { status: "declined" },
                                })
                              )
                            }
                          >
                            {t("decline")}
                          </button>
                        </>
                      )}
                      {role === "participant" &&
                        ["pending", "accepted"].includes(request.status) && (
                          <button
                            disabled={busy}
                            className={secondary}
                            onClick={() =>
                              void act(() =>
                                mentorshipApi(`/requests/${request.id}`, {
                                  method: "PATCH",
                                  body: { status: "canceled" },
                                })
                              )
                            }
                          >
                            {t("cancel")}
                          </button>
                        )}
                      {role === "mentor" && request.status === "accepted" && (
                        <button
                          disabled={busy}
                          className={secondary}
                          onClick={() =>
                            void act(() =>
                              mentorshipApi(`/requests/${request.id}`, {
                                method: "PATCH",
                                body: { status: "completed" },
                              })
                            )
                          }
                        >
                          {t("complete")}
                        </button>
                      )}
                      <button
                        className={secondary}
                        onClick={() => {
                          setOpenRequest(
                            openRequest === request.id ? null : request.id
                          )
                        }}
                      >
                        {t(
                          openRequest === request.id ? "closeChat" : "openChat"
                        )}
                      </button>
                    </div>
                    {role === "participant" &&
                      request.status === "accepted" &&
                      !request.slot &&
                      !!request.mentor.mentorSlots.length && (
                        <div className="mt-4 border-t border-[#2a3950] pt-4">
                          <h4 className="text-sm font-semibold">
                            {t("slots")}
                          </h4>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {request.mentor.mentorSlots.map((item) => (
                              <button
                                key={item.id}
                                disabled={busy}
                                className={secondary}
                                onClick={() =>
                                  void act(() =>
                                    mentorshipApi(`/slots/${item.id}/book`, {
                                      method: "POST",
                                      body: { requestId: request.id },
                                    })
                                  )
                                }
                              >
                                {t("book")}: {time(item.startTime)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    {openRequest === request.id && (
                      <MentorshipChat
                        key={request.id}
                        requestId={request.id}
                        status={request.status}
                        userId={userId}
                      />
                    )}
                  </article>
                ))
              ) : (
                <p className="rounded-xl border border-[#2a3950] p-5 text-sm text-[#a8b5ca]">
                  {t("noRequests")}
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
