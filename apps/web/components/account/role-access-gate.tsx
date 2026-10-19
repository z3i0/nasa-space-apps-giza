"use client"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Award, Compass, Clock3, ShieldCheck, ShieldX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { accountApi } from "@/lib/account"
import { getAuthUser, setAuth } from "@/lib/auth"

type Access = {
  role: string
  roles: string[]
  status: "pending" | "approved" | "rejected" | "not_requested"
  reason: string
}
export function RoleAccessGate({
  role,
  children,
}: {
  role: "mentor" | "judge"
  children: React.ReactNode
}) {
  const t = useTranslations("Account")
  const [access, setAccess] = useState<Access | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    let active = false
    async function update() {
      if (active || controller.signal.aborted) return
      active = true
      try {
        const data = await accountApi<Access>(
          `/access/${role}`,
          undefined,
          controller.signal
        )
        if (controller.signal.aborted) return
        const user = getAuthUser()
        if (
          user &&
          (user.role !== role ||
            JSON.stringify(user.roles) !== JSON.stringify(data.roles))
        )
          setAuth({}, { ...user, role, roles: data.roles })
        setAccess(data)
        setError("")
      } catch (e) {
        if (!controller.signal.aborted) {
          setAccess(null)
          setError(e instanceof Error ? e.message : t("error"))
        }
      } finally {
        active = false
      }
    }
    void update()
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void update()
    }, 5000)
    const visible = () => {
      if (document.visibilityState === "visible") void update()
    }
    document.addEventListener("visibilitychange", visible)
    return () => {
      controller.abort()
      clearInterval(timer)
      document.removeEventListener("visibilitychange", visible)
    }
  }, [role, attempt, t])
  const panel = "rounded-2xl border border-border bg-card p-6 sm:p-8"
  if (error)
    return (
      <section className={panel}>
        <p role="alert">{error}</p>
        <Button className="mt-4" onClick={() => setAttempt((n) => n + 1)}>
          {t("retry")}
        </Button>
      </section>
    )
  if (!access)
    return (
      <p role="status" className={panel}>
        {t("loading")}
      </p>
    )
  if (access.status === "approved")
    return (
      <>
        <p
          role="status"
          className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4 text-sm text-emerald-200"
        >
          <ShieldCheck size={18} />
          {t("accessAccepted", { role: t(role) })}
        </p>
        {children}
      </>
    )
  const Icon = role === "judge" ? Award : Compass
  return (
    <section className={`${panel} mx-auto max-w-3xl`}>
      <div className="mb-5 flex items-center gap-3 text-purple-300">
        <Icon size={28} />
        <span className="text-sm tracking-widest uppercase">
          {t("applicationTitle", { role: t(role) })}
        </span>
      </div>
      <h1 className="text-3xl font-semibold">
        {t("roleDashboard", { role: t(role) })}
      </h1>
      <div className="mt-7 flex items-center gap-3">
        {access.status === "rejected" ? (
          <ShieldX className="text-red-300" />
        ) : (
          <Clock3 className="text-amber-300" />
        )}
        <h2 className="text-xl font-medium">{t(`label_${access.status}`)}</h2>
      </div>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        {t(
          access.status === "pending"
            ? "pendingDashboard"
            : access.status === "rejected"
              ? "deniedDashboard"
              : "requestDashboard"
        )}
      </p>
      {access.reason && (
        <p className="mt-5 rounded-xl border border-border p-4">
          {access.reason}
        </p>
      )}
      <p className="mt-5 text-sm text-muted-foreground">
        {t("automaticUpdates")}
      </p>
      {access.status === "not_requested" && (
        <Button
          className="mt-5"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await accountApi("/role-selection", { role })
              setAttempt((n) => n + 1)
            } catch (e) {
              setError(e instanceof Error ? e.message : t("error"))
            } finally {
              setBusy(false)
            }
          }}
        >
          {t("requestAccess")}
        </Button>
      )}
    </section>
  )
}
