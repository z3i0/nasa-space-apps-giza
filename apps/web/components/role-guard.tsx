"use client"

import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/routing"
import { useLocale, useTranslations } from "next-intl"
import { getAuthUser, getRedirectPathByRole, setAuth, UserSession } from "@/lib/auth"
import { authClient } from "@/lib/auth-client"
import { ShieldAlert, ArrowRight, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations("RoleGuard")

  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized" | "unauthenticated">("loading")
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null)

  useEffect(() => {
    let isMounted = true

    const verify = async () => {
      let user = getAuthUser()

      if (!user) {
        try {
          const sessionRes = await authClient.getSession()
          if (sessionRes.data?.user) {
            const u = sessionRes.data.user as {
              id?: string
              name?: string
              fullName?: string
              email?: string
              role?: string
            }
            const role = u.role || "participant"
            const fullName = u.name || u.fullName || u.email || ""
            user = {
              id: u.id || "",
              fullName,
              name: fullName,
              email: u.email || "",
              role,
              roles: [role],
            }
            const sessionToken = (
              sessionRes.data as { session?: { token?: string } } | null
            )?.session?.token
            setAuth({ accessToken: sessionToken }, user)
          }
        } catch {
          // session lookup error
        }
      }

      if (!isMounted) return

      if (!user) {
        setStatus("unauthenticated")
        router.replace("/login")
        return
      }

      const isOrganizer = user.roles?.includes("organizer") || user.role === "organizer"
      const hasAllowedRole = allowedRoles.some((role) => user.roles?.includes(role) || user.role === role)

      setCurrentUser(user)
      setStatus(isOrganizer || hasAllowedRole ? "authorized" : "unauthorized")
    }

    verify()

    return () => {
      isMounted = false
    }
  }, [allowedRoles, router])

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            {t("verifying")}
          </p>
        </div>
      </div>
    )
  }

  if (status === "unauthorized") {
    const userPrimaryRole = currentUser?.roles?.[0] || "participant"
    const userDashboardPath = getRedirectPathByRole(currentUser?.roles || [])

    type RoleKey = "roles.organizer" | "roles.judge" | "roles.mentor" | "roles.participant"
    const getRoleLabel = (role: string) => {
      const key = `roles.${role}` as RoleKey
      try {
        return t(key)
      } catch {
        return role
      }
    }

    const currentRoleName = getRoleLabel(userPrimaryRole)
    const allowedRolesNames = allowedRoles
      .map((r) => getRoleLabel(r))
      .join(locale === "ar" ? "، " : ", ")

    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 text-foreground relative">
        {/* Language & Theme Controls */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-card p-6 sm:p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shadow-inner">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-destructive">
              {t("accessDeniedTitle")}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("accessDeniedDescription", {
                currentRole: currentRoleName,
                allowedRoles: allowedRolesNames,
              })}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => router.push(userDashboardPath as "/dashboard/participant")}
              className="w-full h-11 text-sm font-semibold rounded-xl shadow-md gap-2"
            >
              <span>{t("goToDashboard")}</span>
              {locale === "ar" ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push("/login")}
              className="w-full h-10 text-xs font-medium"
            >
              {t("switchAccount")}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
