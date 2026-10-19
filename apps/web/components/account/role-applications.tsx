"use client"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { accountApi, type RoleApplication } from "@/lib/account"
export function RoleApplications({
  role,
  embedded = false,
}: {
  role?: "mentor" | "judge"
  embedded?: boolean
}) {
  const t = useTranslations("Account")
  const [items, setItems] = useState<RoleApplication[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [attempt, setAttempt] = useState(0),
    [reasons, setReasons] = useState<Record<string, string>>({})
  useEffect(() => {
    if (busy) return
    const c = new AbortController()
    let active = false
    const refresh = () => {
      if (active || c.signal.aborted) return
      active = true
      return accountApi<RoleApplication[]>(
        "/role-applications",
        undefined,
        c.signal
      )
        .then((data) => {
          if (!c.signal.aborted) setItems(data)
        })
        .catch((e) => {
          if (!c.signal.aborted) setError(e.message)
        })
        .finally(() => {
          active = false
        })
    }
    void refresh()
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh()
    }, 5000)
    return () => {
      c.abort()
      clearInterval(timer)
    }
  }, [attempt, busy])
  async function review(id: string, decision: string) {
    if (busy) return
    setBusy(true)
    setError("")
    setNotice("")
    try {
      await accountApi(`/role-applications/${id}/review`, {
        decision,
        reason: reasons[id] ?? items?.find((a) => a.id === id)?.reason ?? "",
        expectedStatus: items?.find((a) => a.id === id)?.status,
      })
      setItems(await accountApi<RoleApplication[]>("/role-applications"))
      setNotice(t("reviewed"))
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"))
    } finally {
      setBusy(false)
    }
  }
  const panel = "rounded-2xl border border-border bg-card p-6"
  const visibleItems = items
    ?.filter((item) => !role || item.role === role)
    .sort(
      (a, b) => Number(b.status === "pending") - Number(a.status === "pending")
    )
  const Heading = embedded ? "h2" : "h1"
  return (
    <div className="mx-auto grid max-w-6xl gap-6">
      <header className={panel}>
        <Heading className="text-2xl font-semibold">
          {role
            ? t("roleApprovalsTitle", { role: t(role) })
            : t("applicationsTitle")}
        </Heading>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t("applicationsHelp")}
        </p>
      </header>
      {error && (
        <p role="alert" className={panel}>
          {error}{" "}
          <Button
            onClick={() => {
              setError("")
              setAttempt((n) => n + 1)
            }}
          >
            {t("retry")}
          </Button>
        </p>
      )}
      {notice && (
        <p role="status" className={panel}>
          {notice}
        </p>
      )}
      {!items ? (
        <p role="status">{t("loading")}</p>
      ) : !visibleItems?.length ? (
        <p className={panel}>{t("noApplications")}</p>
      ) : (
        visibleItems.map((a) => (
          <article className={panel} key={a.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{a.user?.name}</h2>
                <p className="mt-1 text-sm break-all text-muted-foreground">
                  {a.user?.email}
                </p>
                <p className="mt-2 text-sm">
                  {t("requestedRole", { role: t(a.role) })}
                </p>
              </div>
              <span className="rounded-full border border-border px-3 py-1 text-xs">
                {t(`label_${a.status}`)}
              </span>
            </div>
            {
              <div className="mt-5 grid gap-4">
                <label className="text-sm">
                  {t("reviewReason")}
                  <textarea
                    maxLength={1000}
                    disabled={busy}
                    value={reasons[a.id] ?? a.reason}
                    onChange={(e) =>
                      setReasons((old) => ({ ...old, [a.id]: e.target.value }))
                    }
                    className="mt-2 min-h-20 w-full rounded-lg border border-border bg-background p-3"
                  />
                </label>
                <div className="flex gap-3">
                  <Button
                    disabled={busy || a.status === "approved"}
                    onClick={() => void review(a.id, "approved")}
                  >
                    {t("approve")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy || a.status === "rejected"}
                    onClick={() => void review(a.id, "rejected")}
                  >
                    {t("reject")}
                  </Button>
                </div>
              </div>
            }
          </article>
        ))
      )}
    </div>
  )
}
