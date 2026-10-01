"use client"

import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/routing"
import { useLocale, useTranslations } from "next-intl"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, ArrowRight, Shield, Award, Compass, Users } from "lucide-react"
import { setAuth, getRedirectPathByRole, getAuthUser } from "@/lib/auth"
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
    const user = getAuthUser()
    if (user && user.roles && user.roles.length > 0) {
      const redirectPath = getRedirectPathByRole(user.roles)
      router.replace(redirectPath as "/dashboard/participant")
    } else {
      authClient
        .getSession()
        .then((sessionRes) => {
          if (sessionRes.data?.user) {
            const u = sessionRes.data.user as { role?: string }
            const role = u.role || "participant"
            const redirectPath = getRedirectPathByRole([role])
            router.replace(redirectPath as "/dashboard/participant")
          } else {
            setCheckingAuth(false)
          }
        })
        .catch(() => {
          setCheckingAuth(false)
        })
    }
  }, [router])

  // Demo accounts for rapid role testing
  const demoAccounts = [
    {
      role: tRoles("organizer"),
      roleKey: "organizer",
      email: "organizer@hackathon.local",
      password: "OrganizerSecure2026!",
      icon: <Shield className="h-3.5 w-3.5 text-amber-500" />,
      badgeColor: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
    },
    {
      role: tRoles("judge"),
      roleKey: "judge",
      email: "judge@hackathon.local",
      password: "JudgeSecure2026!",
      icon: <Award className="h-3.5 w-3.5 text-purple-500" />,
      badgeColor: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20",
    },
    {
      role: tRoles("mentor"),
      roleKey: "mentor",
      email: "mentor@hackathon.local",
      password: "MentorSecure2026!",
      icon: <Compass className="h-3.5 w-3.5 text-blue-500" />,
      badgeColor: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20",
    },
    {
      role: tRoles("participant"),
      roleKey: "participant",
      email: "participant@hackathon.local",
      password: "ParticipantSecure2026!",
      icon: <Users className="h-3.5 w-3.5 text-emerald-500" />,
      badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
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

    try {
      const res = await authClient.signIn.email({
        email: email.trim(),
        password,
      })

      if (res.error) {
        throw new Error(res.error.message || t("errors.invalidCredentials"))
      }

      const userData = res.data?.user as {
        id?: string
        name?: string
        fullName?: string
        email?: string
        role?: string
      } | undefined

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

      setAuth(
        { accessToken: sessionToken },
        userSession,
      )

      const redirectPath = getRedirectPathByRole([userRole])
      router.push(redirectPath as "/dashboard/participant")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg || t("errors.serverError"))
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between transition-colors duration-200">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between p-4 sm:p-6 border-b border-border/40">
        <button
          onClick={() => router.push("/")}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {locale === "ar" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          <span>{t("backToHome")}</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {t("title")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {t("subtitle")}
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-foreground">
                  {t("emailLabel")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("emailPlaceholder")}
                    className="w-full h-11 ps-10 pe-3.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-foreground">
                    {t("passwordLabel")}
                  </label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("passwordPlaceholder")}
                    className="w-full h-11 ps-10 pe-10 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 end-0 flex items-center pe-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-sm font-bold shadow-md rounded-xl mt-2 gap-2 cursor-pointer"
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
            <div className="pt-2 border-t border-border/60 space-y-2.5">
              <p className="text-xs text-center font-medium text-muted-foreground">
                {t("quickTest")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.roleKey}
                    type="button"
                    onClick={() => fillDemoAccount(account.email, account.password)}
                    className={`inline-flex items-center justify-center gap-1.5 p-2 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${account.badgeColor}`}
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
