"use client"
import { useTranslations } from "next-intl"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue) onChange(nextValue)
        }}
        disabled={disabled}
      >
        <SelectTrigger
          type="button"
          className="mt-2 !h-11 w-full rounded-xl bg-background text-base md:text-sm"
        >
          <SelectValue>
            {() =>
              value === "participant" ||
              value === "mentor" ||
              value === "judge" ||
              value === "organizer"
                ? t(value)
                : null
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {[
            "participant",
            "mentor",
            "judge",
            ...(organizer ? ["organizer"] : []),
          ].map((role) => (
            <SelectItem key={role} value={role}>
              {t(role)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="mt-2 block text-xs leading-relaxed font-normal text-muted-foreground">
        {t("approvalHelp")}
      </span>
    </label>
  )
}
