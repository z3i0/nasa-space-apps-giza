"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface OrganizerKpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  badgeText?: string
  badgeVariant?: "default" | "secondary" | "outline" | "destructive"
  iconColorClass?: string
  className?: string
}

export function OrganizerKpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badgeText,
  badgeVariant = "secondary",
  iconColorClass = "text-primary bg-primary/10",
  className,
}: OrganizerKpiCardProps) {
  return (
    <Card className={cn("overflow-hidden border border-border/60 bg-card transition-all hover:border-border p-0", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {value}
              </span>
              {badgeText && (
                <Badge variant={badgeVariant} className="text-[11px] px-1.5 py-0 font-normal">
                  {badgeText}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              iconColorClass
            )}
          >
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

