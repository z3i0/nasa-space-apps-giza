"use client"
import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { clearLocalAuth, setAuth } from "@/lib/auth"
import { selectAccountRole } from "@/lib/account"
export default function LoginPage() {
  const t = useTranslations("Auth.login"),
    locale = useLocale()
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    try {
      clearLocalAuth()
      await authClient.signOut()
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      })
      if (
        result.error ||
        !result.data?.token ||
        result.data.user.email.toLowerCase() !== email.trim().toLowerCase()
      )
        throw new Error(result.error?.message || t("errors.invalidCredentials"))
      const user = await selectAccountRole(email)
      setAuth({ accessToken: result.data.token }, user)
      window.location.replace(`/${locale}/dashboard/${user.role}`)
    } catch (e) {
      clearLocalAuth()
      setError(e instanceof Error ? e.message : t("errors.serverError"))
    } finally {
      setBusy(false)
    }
  }
  const input =
    "mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex justify-between border-b border-border p-4 sm:px-8">
        <Link href="/" className="text-sm underline">
          {t("backToHome")}
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="mx-auto w-full max-w-lg px-4 py-12">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl border border-destructive/40 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <form onSubmit={login} className="mt-6 space-y-5">
            <label className="block text-sm font-medium">
              {t("emailLabel")}
              <input
                type="email"
                autoComplete="email"
                required
                className={input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="block text-sm font-medium">
              {t("passwordLabel")}
              <input
                type="password"
                autoComplete="current-password"
                required
                className={input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
            </label>
            <Button type="submit" disabled={busy} className="h-11 w-full">
              {t(busy ? "signingIn" : "submit")}
            </Button>
          </form>
          <p className="mt-6 text-sm text-muted-foreground">
            {t("newAccount")}{" "}
            <Link href="/register" className="text-primary underline">
              {t("createAccount")}
            </Link>
          </p>
        </section>
      </main>
    </div>
  )
}
