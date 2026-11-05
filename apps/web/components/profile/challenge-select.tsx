"use client"

import useSWR from "swr"
import { useLocale, useTranslations } from "next-intl"
import { accountApi } from "@/lib/account"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

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
  const t = useTranslations("Account")
  const locale = useLocale()
  const {
    data: options = null,
    error: isSwrError,
    mutate,
  } = useSWR<Option[]>("/challenge-options", {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })
  const error = Boolean(isSwrError)

  const selectedValue =
    options?.some((option) => option.title === value) || (value && value !== "__none__")
      ? value
      : "__none__"

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={selectedValue}
        onValueChange={(val) => {
          onChange(val === "__none__" ? "" : (val || ""))
        }}
        disabled={!options || error}
      >
        <SelectTrigger
          id={id}
          type="button"
          aria-describedby={`${id}-help`}
          className={cn(
            "h-10 w-full rounded-xl border border-input bg-background text-sm shadow-xs transition-colors focus-visible:ring-ring/50",
            className
          )}
        >
          <SelectValue
            placeholder={
              !options
                ? t("loadingChallenges")
                : error
                  ? t("challengeLoadError")
                  : t("chooseChallenge")
            }
          >
            {(val) => {
              if (!val || val === "__none__") return t("chooseChallenge")
              const found = options?.find((o) => o.title === val)
              if (!found) return val
              return locale === "ar" && found.titleAr ? found.titleAr : found.title
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72 w-(--anchor-width) rounded-xl">
          <SelectGroup>
            <SelectItem value="__none__" className="text-xs text-muted-foreground">
              {t("chooseChallenge")}
            </SelectItem>
            {value && value !== "__none__" && !options?.some((o) => o.title === value) && (
              <SelectItem value={value} className="text-xs">
                {value}
              </SelectItem>
            )}
            {options?.map((o) => (
              <SelectItem key={o.id} value={o.title} className="text-xs">
                {locale === "ar" && o.titleAr ? o.titleAr : o.title}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <span
        id={`${id}-help`}
        className="block text-xs text-muted-foreground"
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
        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void mutate()}
            className="h-8 rounded-lg text-xs"
          >
            {t("retry")}
          </Button>
        </div>
      )}
    </div>
  )
}
