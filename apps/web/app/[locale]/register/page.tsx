"use client"

import { useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { setAuth, clearLocalAuth } from "@/lib/auth"
import { RoleSelect } from "@/components/role-select"

export default function RegisterPage() {
  const t = useTranslations("Auth.register")
  const locale = useLocale()
  const lock = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState(false)
  const [requestedRole, setRequestedRole] = useState("participant")
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current) return
    setError("")
    if (draft.name.trim().length < 2) {
      setError(t("invalidName"))
      return
    }
    if (draft.password !== draft.confirmPassword) {
      setError(t("mismatch"))
      return
    }
    lock.current = true
    setBusy(true)
    try {
      const email = draft.email.trim().toLowerCase()
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          email,
          phone: draft.phone.trim(),
          password: draft.password,
          requestedRole,
        }),
      })
      if (!response.ok) {
        setError(
          t(
            response.status === 409
              ? "exists"
              : response.status === 400
                ? "invalid"
                : response.status >= 500
                  ? "unavailable"
                  : "error"
          )
        )
        return
      }
      setCreated(true)
      clearLocalAuth()
      await authClient.signOut()
      // Better Auth signs the browser session cookie; never fabricate a cookie.
      const result = await authClient.signIn.email({
        email,
        password: draft.password,
      })
      if (
        !result.error &&
        result.data?.user &&
        result.data.token &&
        result.data.user.email.toLowerCase() === email
      ) {
        const user = result.data.user
        setAuth(
          { accessToken: result.data.token },
          {
            id: user.id,
            name: user.name,
            email: user.email,
            role: requestedRole,
            roles: ["participant"],
          }
        )
        window.location.replace(`/${locale}/dashboard/${requestedRole}`)
      }
    } catch {
      setError(t("unavailable"))
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  const input =
    "mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border p-4 sm:px-8">
        <Link href="/" className="text-sm underline underline-offset-4">
          {t("backToHome")}
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="mx-auto w-full max-w-lg px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
          {created ? (
            <div role="status" className="mt-6 space-y-4">
              <p>{t("created")}</p>
              <Link
                href="/login"
                className="font-semibold text-primary underline"
              >
                {t("signIn")}
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-xl border border-destructive/40 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              <form className="mt-6 space-y-4" onSubmit={register}>
                <RoleSelect
                  value={requestedRole}
                  onChange={setRequestedRole}
                  disabled={busy}
                />
                <label className="block text-sm font-medium">
                  {t("name")}
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    className={input}
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  {t("email")}
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    className={input}
                    value={draft.email}
                    onChange={(e) =>
                      setDraft({ ...draft, email: e.target.value })
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  {t("phone")}
                  <input
                    required
                    type="tel"
                    maxLength={40}
                    autoComplete="tel"
                    className={input}
                    value={draft.phone}
                    onChange={(e) =>
                      setDraft({ ...draft, phone: e.target.value })
                    }
                  />
                </label>
                <label className="block text-sm font-medium">
                  {t("password")}
                  <input
                    required
                    type="password"
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    aria-describedby="password-hint"
                    className={input}
                    value={draft.password}
                    onChange={(e) =>
                      setDraft({ ...draft, password: e.target.value })
                    }
                  />
                </label>
                <p id="password-hint" className="text-xs text-muted-foreground">
                  {t("passwordHint")}
                </p>
                <label className="block text-sm font-medium">
                  {t("confirmPassword")}
                  <input
                    required
                    type="password"
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    className={input}
                    value={draft.confirmPassword}
                    onChange={(e) =>
                      setDraft({ ...draft, confirmPassword: e.target.value })
                    }
                  />
                </label>
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full rounded-xl"
                >
                  {t(busy ? "submitting" : "submit")}
                </Button>
              </form>
            </>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link
              href="/login"
              className="font-semibold text-primary underline underline-offset-4"
            >
              {t("signIn")}
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
