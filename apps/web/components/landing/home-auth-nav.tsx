"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { ArrowUpRight, ChevronDown, LayoutDashboard, LogOut, UserRound } from "lucide-react"
import { Link, useRouter } from "@/i18n/routing"
import { clearAuth, getRedirectPathByRole, useAuthUser } from "@/lib/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import styles from "./landing.module.css"

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return (name[0] || "U").toUpperCase()
}

export function HomeAuthNav() {
  const t = useTranslations("Home")
  const locale = useLocale()
  const router = useRouter()
  const user = useAuthUser()
  const [signingOut, setSigningOut] = React.useState(false)

  if (!user) {
    return (
      <Link href="/login" className={styles.login}>
        {t("signIn")}
        <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    )
  }

  const displayName =
    user.fullName || user.name || user.email?.split("@")[0] || t("accountFallback")
  const userInitials = getInitials(displayName)
  const primaryRole = user.role || user.roles?.[0] || "participant"
  const dashboardHref = getRedirectPathByRole(user.roles || [], user.role)
  const profileHref =
    primaryRole === "participant"
      ? "/dashboard/participant/profile"
      : `/dashboard/${primaryRole}/profile`
  const direction = locale === "ar" ? "rtl" : "ltr"

  const handleLogout = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await clearAuth()
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className={cn(
              styles.login,
              "cursor-pointer border-white/20 bg-white/5 py-1.5 pe-2.5 ps-2 text-xs font-medium text-white transition-all hover:border-white/40 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none select-none max-w-[200px]"
            )}
            aria-label={`${t("userMenu")}: ${displayName}`}
          />
        }
      >
        <Avatar className="size-5 shrink-0 ring-1 ring-white/30">
          <AvatarImage src={user.avatar || undefined} alt={displayName} />
          <AvatarFallback className="bg-primary/30 text-[10px] font-semibold text-primary-foreground">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <span className="truncate max-w-[70px] text-xs font-medium sm:max-w-[120px] md:max-w-[150px]">
          {displayName}
        </span>
        <ChevronDown className="size-3 shrink-0 text-white/60" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        dir={direction}
        className="w-56 rounded-xl border border-white/15 bg-[#0f0e17]/95 p-1.5 text-foreground shadow-2xl backdrop-blur-md"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
            <span className="truncate font-semibold text-white">{displayName}</span>
            {user.email && (
              <span className="truncate text-[11px] text-white/60">{user.email}</span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={<Link href={dashboardHref} />}
            className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs text-white/90 transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
          >
            <LayoutDashboard className="size-4 text-primary" />
            <span>{t("dashboard")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            render={<Link href={profileHref} />}
            className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs text-white/90 transition-colors hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white"
          >
            <UserRound className="size-4 text-white/70" />
            <span>{t("profile")}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={signingOut}
          variant="destructive"
          className="cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 focus:bg-rose-500/10 focus:text-rose-300"
        >
          <LogOut className="size-4" />
          <span>{t("signOut")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

