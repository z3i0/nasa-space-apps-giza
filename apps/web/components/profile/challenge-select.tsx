"use client"
import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { accountApi } from "@/lib/account"
import { Button } from "@/components/ui/button"
type Option = { id: string; title: string; titleAr: string | null }
export function ChallengeSelect({
  id,
  value,
  onChange,
  className,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const t = useTranslations("Account"),
    locale = useLocale()
  const [options, setOptions] = useState<Option[] | null>(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const c = new AbortController()
    accountApi<Option[]>("/challenge-options", undefined, c.signal)
      .then((data) => {
        if (!c.signal.aborted) {
          setOptions(data)
          setError(false)
        }
      })
      .catch(() => {
        if (!c.signal.aborted) setError(true)
      })
    return () => c.abort()
  }, [attempt])
  return (
    <>
      <select
        id={id}
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!options || error}
        aria-describedby={`${id}-help`}
      >
        <option value="">
          {t(!options ? "loadingChallenges" : "chooseChallenge")}
        </option>
        {value && !options?.some((o) => o.title === value) && (
          <option value={value} disabled>
            {value} — {t("legacyChallenge")}
          </option>
        )}
        {options?.map((o) => (
          <option key={o.id} value={o.title}>
            {locale === "ar" && o.titleAr ? o.titleAr : o.title}
          </option>
        ))}
      </select>
      <span
        id={`${id}-help`}
        className="mt-2 block text-xs text-muted-foreground"
      >
        {t(
          error
            ? "challengeLoadError"
            : options?.length === 0
              ? "noChallenges"
              : "challengeChoiceHelp"
        )}
      </span>
      {error && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setAttempt((n) => n + 1)}
        >
          {t("retry")}
        </Button>
      )}
    </>
  )
}
