"use client"

import { useLocale } from "next-intl"
import { Link, usePathname } from "@/i18n/routing"
import { Globe } from "lucide-react"

export function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const nextLocale = locale === "ar" ? "en" : "ar"

  return (
    <Link
      href={pathname || "/"}
      locale={nextLocale}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted hover:text-foreground transition-colors cursor-pointer select-none"
      aria-label="تغيير اللغة / Change Language"
    >
      <Globe className="h-4 w-4" />
      <span>{locale === "ar" ? "English" : "العربية"}</span>
    </Link>
  )
}
