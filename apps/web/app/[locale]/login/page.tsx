"use client"

import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/routing"
import { useLocale, useTranslations } from "next-intl"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Shield,
  Award,
  Compass,
  Users,
} from "lucide-react"
import { setAuth, getRedirectPathByRole, clearLocalAuth } from "@/lib/auth"
import { authClient } from "@/lib/auth-client"

export default function LoginPage() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations("Auth.login")
  const tRoles = useTranslations("RoleGuard.roles")

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    // Cached user/role hints can outlive the session. Verify first, then restore
    // the cookies the route proxy needs before navigating to a dashboard.
    authClient
      .getSession()
      .then((sessionRes) => {
        if (!active) return
        if (sessionRes.data?.user) {
          const u = sessionRes.data.user as {
            id: string
            name?: string
            email: string
            role?: string
          }
          const role = u.role || "participant"
          if (!["organizer", "judge", "mentor", "participant"].includes(role)) {
            clearLocalAuth()
            setCheckingAuth(false)
            return
          }
          setAuth(
            { accessToken: sessionRes.data.session.token },
            {
              id: u.id,
              name: u.name || u.email,
              fullName: u.name || u.email,
              email: u.email,
              role,
              roles: [role],
            }
          )
          const redirectPath = getRedirectPathByRole([role])
          window.location.replace(`/${locale}${redirectPath}`)
        } else {
          clearLocalAuth()
          setCheckingAuth(false)
        }
      })
      .catch(() => {
        if (!active) return
        clearLocalAuth()
        setCheckingAuth(false)
      })
    return () => {
      active = false
    }
  }, [locale])

  // Demo accounts for rapid role testing
  const demoAccounts = [
    {
      role: tRoles("organizer"),
      roleKey: "organizer",
      email: "organizer@hackathon.local",
      password: "OrganizerSecure2026!",
      icon: <Shield className="h-3.5 w-3.5 text-amber-500" />,
      badgeColor:
        "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
    },
    {
      role: tRoles("judge"),
      roleKey: "judge",
      email: "judge@hackathon.local",
      password: "JudgeSecure2026!",
      icon: <Award className="h-3.5 w-3.5 text-purple-500" />,
      badgeColor:
        "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20",
    },
    {
      role: tRoles("mentor"),
      roleKey: "mentor",
      email: "mentor@hackathon.local",
      password: "MentorSecure2026!",
      icon: <Compass className="h-3.5 w-3.5 text-blue-500" />,
      badgeColor:
        "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20",
    },
    {
      role: tRoles("participant"),
      roleKey: "participant",
      email: "participant@hackathon.local",
      password: "ParticipantSecure2026!",
      icon: <Users className="h-3.5 w-3.5 text-emerald-500" />,
      badgeColor:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
    },
  ]

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setError(null)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError(t("errors.requiredFields"))
      return
    }

    setLoading(true)

    let canRecoverSession = true
    try {
      const res = await authClient.signIn.email({
        email: email.trim(),
        password,
      })

      if (res.error) {
        // Credential/permission failures must remain failures even if another
        // session exists. Only recover ambiguous transport/server failures.
        canRecoverSession = !res.error.status || res.error.status >= 500
        throw new Error(res.error.message || t("errors.invalidCredentials"))
      }

      const userData = res.data?.user as
        | {
            id?: string
            name?: string
            fullName?: string
            email?: string
            role?: string
          }
        | undefined

      const userRole = userData?.role || "participant"
      const fullName = userData?.name || userData?.fullName || email

      const userSession = {
        id: userData?.id || "",
        fullName,
        name: fullName,
        email: userData?.email || email,
        role: userRole,
        roles: [userRole],
      }

      const sessionToken =
        (res.data as { token?: string } | null)?.token || "better-auth-session"

      setAuth({ accessToken: sessionToken }, userSession)

      const redirectPath = getRedirectPathByRole([userRole])
      window.location.replace(`/${locale}${redirectPath}`)
    } catch (err: unknown) {
      if (canRecoverSession) {
        try {
          // A response can fail after the server has already set the session.
          // Verify that session instead of making the user leave and re-enter.
          const recovered = await authClient.getSession({
            query: { disableCookieCache: true },
          })
          const user = recovered.data?.user as
            | {
                id: string
                name?: string
                email: string
                role?: string
              }
            | undefined
          const role = user?.role || "participant"
          if (
            user &&
            recovered.data?.session.token &&
            user.email.toLowerCase() === email.trim().toLowerCase() &&
            ["organizer", "judge", "mentor", "participant"].includes(role)
          ) {
            setAuth(
              { accessToken: recovered.data.session.token },
              {
                id: user.id,
                name: user.name || user.email,
                fullName: user.name || user.email,
                email: user.email,
                role,
                roles: [role],
              }
            )
            window.location.replace(
              `/${locale}${getRedirectPathByRole([role])}`
            )
            return
          }
        } catch {
          // Preserve the original failure if session verification also fails.
        }
      }
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || t("errors.serverError"))
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-background text-foreground transition-colors duration-200">
      {/* Top Header */}
      <header className="flex w-full items-center justify-between border-b border-border/40 p-4 sm:p-6">
        <button
          onClick={() => router.push("/")}
          className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {locale === "ar" ? (
            <ArrowRight className="h-4 w-4" />
          ) : (
            <ArrowLeft className="h-4 w-4" />
          )}
          <span>{t("backToHome")}</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Login Card */}
      <main className="my-auto flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
            {/* Header */}
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                {t("title")}
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                {t("subtitle")}
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive sm:text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground sm:text-sm">
                  {t("emailLabel")}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    className="h-11 w-full rounded-xl border border-input bg-background ps-10 pe-3.5 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground sm:text-sm">
                    {t("passwordLabel")}
                  </label>
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("passwordPlaceholder")}
                    className="h-11 w-full rounded-xl border border-input bg-background ps-10 pe-10 text-sm text-foreground transition-all placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 end-0 flex cursor-pointer items-center pe-3 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="mt-2 h-11 w-full cursor-pointer gap-2 rounded-xl text-sm font-bold shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("signingIn")}</span>
                  </>
                ) : (
                  <span>{t("submit")}</span>
                )}
              </Button>
            </form>

            {/* Quick Demo Fill Buttons (Convenient testing for each role) */}
            <div className="space-y-2.5 border-t border-border/60 pt-2">
              <p className="text-center text-xs font-medium text-muted-foreground">
                {t("quickTest")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.roleKey}
                    type="button"
                    onClick={() =>
                      fillDemoAccount(account.email, account.password)
                    }
                    className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border p-2 text-xs font-semibold transition-colors ${account.badgeColor}`}
                  >
                    {account.icon}
                    <span>{account.role}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-muted-foreground">
        © 2026 NASA Space Apps Giza.
      </footer>
    </div>
  )
}
