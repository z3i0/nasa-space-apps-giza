"use client"

import { useId } from "react"
import { useTranslations } from "next-intl"
import { LayoutGrid, List, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function CommunitySelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { id: string; label: string }[]
  onChange: (value: string) => void
}) {
  const id = useId()
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger id={id} className="w-full min-w-0 bg-background text-sm">
          <SelectValue>
            {(selected) =>
              options.find((option) => option.id === selected)?.label ??
              selected
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function CommunitySearch({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const t = useTranslations("Community")
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        aria-hidden
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        aria-label={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 bg-background ps-9 pe-10 text-sm"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("clearSearch")}
          onClick={() => onChange("")}
          className="absolute end-1 top-1/2 size-8 -translate-y-1/2"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  )
}

export function CommunityViewToggle({
  value,
  onChange,
}: {
  value: "grid" | "list"
  onChange: (value: "grid" | "list") => void
}) {
  const t = useTranslations("Community")
  return (
    <div
      role="group"
      aria-label={t("viewMode")}
      className="flex shrink-0 gap-0.5 rounded-lg border bg-muted/30 p-0.5"
    >
      {(["list", "grid"] as const).map((mode) => {
        const Icon = mode === "list" ? List : LayoutGrid
        return (
          <Button
            key={mode}
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t(mode === "list" ? "listView" : "gridView")}
            aria-pressed={value === mode}
            onClick={() => onChange(mode)}
            className={`size-9 ${value === mode ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
          >
            <Icon className="size-4" />
          </Button>
        )
      })}
    </div>
  )
}
