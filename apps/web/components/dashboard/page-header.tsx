"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { ArrowLeft, ArrowRight, type LucideIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  /** The main heading of the page */
  title: React.ReactNode
  /** Subtitle or secondary description text */
  subtitle?: React.ReactNode
  /** Lucide icon component, React component, or custom icon element */
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | React.ReactNode
  /** Custom classes for the icon container (e.g. background and text color) */
  iconClassName?: string
  /** Destination URL for the back navigation button */
  backHref?: string
  /** Custom label for the back button (defaults to localized "Back to overview") */
  backLabel?: string
  /** Primary and secondary action buttons placed on the trailing end */
  actions?: React.ReactNode
  /** Custom container classes */
  className?: string
  /** Additional children rendered below or inside the actions area */
  children?: React.ReactNode
}

export function PageHeader({
  title,
  subtitle,
  icon,
  iconClassName,
  backHref,
  backLabel,
  actions,
  className,
  children,
}: PageHeaderProps) {
  const t = useTranslations("Dashboard")
  const locale = useLocale()
  const isRtl = locale === "ar"
  const BackIcon = isRtl ? ArrowRight : ArrowLeft

  const renderIcon = () => {
    if (!icon) return null

    if (React.isValidElement(icon)) {
      return (
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
            iconClassName
          )}
        >
          {icon}
        </div>
      )
    }

    const IconComp = icon as React.ComponentType<{ className?: string }>
    return (
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary",
          iconClassName
        )}
      >
        <IconComp className="size-5" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-border/50",
        className
      )}
    >
      {/* Start: Icon + Title + Subtitle */}
      <div className="flex items-center gap-3">
        {renderIcon()}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* End: Actions & Back Button */}
      {(actions || backHref || children) && (
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {actions}
          {children}
          {backHref && (
            <Link
              href={backHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "gap-2 rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-colors"
              )}
            >
              <BackIcon className="size-3.5 shrink-0" />
              <span>{backLabel || t("placeholder.backToOverview")}</span>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
