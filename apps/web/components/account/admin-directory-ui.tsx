"use client"

import { useContext, type ReactNode } from "react"
import { Mail, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { DashboardThemeContext } from "@/components/dashboard/dashboard-theme-context"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"

export const directoryField =
  "mt-1.5 h-10 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm font-normal"
export const directoryCard =
  "min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5"
export const directoryGrid =
  "grid auto-rows-fr items-stretch gap-4 lg:grid-cols-2 xl:grid-cols-3"
export const directoryItem = `${directoryCard} flex h-full flex-col`
export const directoryTags =
  "flex max-h-[54px] flex-wrap content-start gap-1.5 overflow-hidden"

export function normalizeDirectoryText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\p{M}\u0640]/gu, "")
    .trim()
    .toLowerCase()
}

export function ContactEmail({
  email,
  compact = false,
}: {
  email?: string
  compact?: boolean
}) {
  return email ? (
    <a
      href={`mailto:${email}`}
      title={email}
      className={`mt-3 flex min-w-0 shrink-0 items-start gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/15 ${compact ? "h-16" : ""}`}
    >
      <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <bdi
        className={`min-w-0 break-all ${compact ? "line-clamp-2" : ""}`}
        dir="ltr"
      >
        {email}
      </bdi>
    </a>
  ) : null
}

export function DirectoryDetails({
  title,
  description,
  trigger,
  children,
}: {
  title: string
  description: string
  trigger: string
  children: ReactNode
}) {
  const a = useTranslations("Operations.admin")
  const locale = useLocale()
  const theme = useContext(DashboardThemeContext)
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="w-full" />}>
        {trigger}
      </DialogTrigger>
      <DialogContent
        className={`${theme} max-h-[85dvh] overflow-x-hidden overflow-y-auto sm:max-w-xl`}
        dir={locale === "ar" ? "rtl" : "ltr"}
        showCloseButton={false}
      >
        <DialogHeader className="pe-8">
          <DialogTitle className="text-xl leading-snug [overflow-wrap:anywhere]">
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute end-3 top-3"
              aria-label={a("closeDetails")}
            />
          }
        >
          <X aria-hidden="true" />
        </DialogClose>
        {children}
        <DialogClose render={<Button variant="outline" className="w-full" />}>
          {a("done")}
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}

export function DirectoryPagination({
  page,
  pages,
  onChange,
}: {
  page: number
  pages: number
  onChange: (page: number) => void
}) {
  const t = useTranslations("Operations")
  if (pages <= 1) return null
  return (
    <nav
      aria-label={t("admin.pagination")}
      className="flex items-center justify-between gap-2 border-t border-border pt-4"
    >
      <Button
        variant="outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        {t("previous")}
      </Button>
      <span className="text-xs text-muted-foreground">
        {t("admin.page", { current: page, total: pages })}
      </span>
      <Button
        variant="outline"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        {t("next")}
      </Button>
    </nav>
  )
}
