"use client"

import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/routing"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import {
  LogOut,
  User as UserIcon,
  Shield,
  Award,
  Users,
  Compass,
} from "lucide-react"
import { getAuthUser, clearAuth, UserSession } from "@/lib/auth"

interface DashboardHeaderProps {
  roleName: "organizer" | "judge" | "mentor" | "participant"
  roleTitleAr?: string
  roleTitleEn?: string
}

export function DashboardHeader({ roleName }: DashboardHeaderProps) {
  const router = useRouter()
  const t = useTranslations("Dashboard")
  const [user, setUser] = useState<UserSession | null>(null)

  useEffect(() => {
    const stored = getAuthUser()
    if (stored) {
      queueMicrotask(() => {
        setUser(stored)
      })
    }
  }, [])

  const handleLogout = async () => {
    await clearAuth()
    router.push("/login")
  }

  const roleIcons = {
    organizer: <Shield className="h-4 w-4 text-amber-500" />,
    judge: <Award className="h-4 w-4 text-purple-500" />,
    mentor: <Compass className="h-4 w-4 text-blue-500" />,
    participant: <Users className="h-4 w-4 text-emerald-500" />,
  }

  const roleTitle = t(
    `titles.${roleName}` as
      | "titles.organizer"
      | "titles.judge"
      | "titles.mentor"
      | "titles.participant"
  )

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Left / Start: Brand & Role Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
              {t("brand")}
            </span>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium">
              {roleIcons[roleName]}
              <span>{roleTitle}</span>
            </div>
          </div>
        </div>

        {/* Right / End: User Info & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <div className="mr-1 hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <UserIcon className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">
                {user.name || user.fullName}
              </span>
            </div>
          )}

          <LanguageSwitcher />
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="h-9 gap-1.5 text-xs font-medium transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive sm:text-sm"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{t("logout")}</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
