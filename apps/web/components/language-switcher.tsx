"use client"

import { useLocale } from "next-intl"
import { Link, usePathname } from "@/i18n/routing"
import { Languages } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface LanguageSwitcherProps {
  className?: string
  variant?: "ghost" | "outline"
}

export function LanguageSwitcher({
  className,
  variant = "outline",
}: LanguageSwitcherProps) {
  const locale = useLocale()
  const pathname = usePathname()
  const nextLocale = locale === "ar" ? "en" : "ar"
  const targetLanguage = locale === "ar" ? "English" : "العربية"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={pathname || "/"}
            locale={nextLocale}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-md transition-colors cursor-pointer select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none",
              variant === "outline"
                ? "border border-border bg-background hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
              className
            )}
            aria-label={`تغيير اللغة إلى ${targetLanguage} / Switch to ${targetLanguage}`}
          />
        }
      >
        <Languages className="size-4" />
        <span className="sr-only">{targetLanguage}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{targetLanguage}</p>
      </TooltipContent>
    </Tooltip>
  )
}
