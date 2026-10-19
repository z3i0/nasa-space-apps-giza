"use client"
import { useTranslations } from "next-intl"
export function RoleSelect({
  value,
  onChange,
  organizer = false,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  organizer?: boolean
  disabled?: boolean
}) {
  const t = useTranslations("Account")
  return (
    <label className="block text-sm font-medium">
      {t("roleLabel")}
      <select
        required
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
      >
        {[
          "participant",
          "mentor",
          "judge",
          ...(organizer ? ["organizer"] : []),
        ].map((role) => (
          <option key={role} value={role}>
            {t(role)}
          </option>
        ))}
      </select>
      <span className="mt-2 block text-xs leading-relaxed font-normal text-muted-foreground">
        {t("approvalHelp")}
      </span>
    </label>
  )
}
