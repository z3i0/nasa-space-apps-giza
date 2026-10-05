"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "@/i18n/routing"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DASHBOARD_ROLES_CONFIG,
  DashboardRole,
} from "./dashboard-config"
import {
  Search,
  Bell,
  Shield,
  Rocket,
  Compass,
  Award,
  LogOut,
  CheckCircle2,
} from "lucide-react"
import { getAuthUser, clearAuth, useAuthUser, UserSession } from "@/lib/auth"

interface DashboardNavbarProps {
  currentRole: DashboardRole
}

export function DashboardNavbar({ currentRole }: DashboardNavbarProps) {
  const t = useTranslations("Dashboard")
  const locale = useLocale()
  const router = useRouter()
  const user = useAuthUser()

  const [openSearch, setOpenSearch] = React.useState(false)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpenSearch((open) => !open)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleLogout = async () => {
    await clearAuth()
    router.push("/login")
  }

  const roleConfig = DASHBOARD_ROLES_CONFIG[currentRole] || DASHBOARD_ROLES_CONFIG.participant
  const RoleIcon = roleConfig.icon

  const displayName = user?.name || user?.fullName || "Space Apps Explorer"
  const displayEmail = user?.email || "user@spaceapps.org"
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const notifications = [
    {
      title: t("header.notif1Title"),
      desc: t("header.notif1Desc"),
      time: t("header.notif1Time"),
    },
    {
      title: t("header.notif2Title"),
      desc: t("header.notif2Desc"),
      time: t("header.notif2Time"),
    },
    {
      title: t("header.notif3Title"),
      desc: t("header.notif3Desc"),
      time: t("header.notif3Time"),
    },
  ]

  return (
    <>
      <header className="sticky top-0 z-50 px-4 before:absolute before:inset-0 before:rounded-t-xl before:mask-[linear-gradient(var(--card),var(--card)_18%,transparent_100%)] before:backdrop-blur-md sm:px-6">
        <div className="bg-card relative z-51 mx-auto mt-3 flex w-full items-center justify-between rounded-xl border border-border shadow-xs px-6 py-2 max-w-348">
          {/* Start: Sidebar Trigger + Separator + Search Button */}
          <div className="flex items-center gap-1.5 sm:gap-4">
            <SidebarTrigger className="size-8 rounded-[min(var(--radius-md),10px)] [&_svg]:size-5!" />

            <Separator
              orientation="vertical"
              className="bg-border shrink-0 hidden h-4! self-center! sm:block"
            />

            {/* Desktop Search Trigger */}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpenSearch(true)}
              className="hidden h-9 px-2.5 font-normal hover:bg-transparent sm:block dark:hover:bg-transparent"
            >
              <div className="text-muted-foreground hidden items-center gap-1.5 text-sm sm:flex">
                <Search className="size-4" />
                <span>{t("header.searchPlaceholder")}</span>
                <kbd
                  data-slot="kbd"
                  className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm px-1 font-sans text-xs font-medium select-none"
                >
                  ⌘K
                </kbd>
              </div>
            </Button>

            {/* Mobile Search Trigger */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOpenSearch(true)}
              className="size-9 sm:hidden"
            >
              <Search className="size-4" />
              <span className="sr-only">{t("header.search")}</span>
            </Button>
          </div>

          {/* End Controls */}
          <div className="flex items-center gap-1.5">
            {/* 1. Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 relative text-muted-foreground hover:text-foreground"
                  />
                }
              >
                <Bell className="size-4" />
                <span className="bg-destructive absolute top-2 end-2.5 size-2 rounded-full" />
                <span className="sr-only">{t("header.notifications")}</span>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-80 rounded-xl border border-border/60 bg-popover/95 backdrop-blur-md shadow-xl"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-foreground border-b border-border/40">
                    <span>{t("header.notifications")}</span>
                    <span className="text-xs text-muted-foreground">3 {t("badges.new")}</span>
                  </DropdownMenuLabel>
                  <div className="divide-y divide-border/40 max-h-72 overflow-y-auto">
                    {notifications.map((notif, idx) => (
                      <DropdownMenuItem
                        key={idx}
                        className="flex flex-col items-start gap-1 p-3 cursor-pointer text-start focus:bg-muted/60"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-semibold text-foreground">
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {notif.time}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {notif.desc}
                        </p>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 2. Theme Toggle (Animated) */}
            <ThemeToggle variant="ghost" />

            {/* 3. Language Switcher */}
            <LanguageSwitcher variant="ghost" />

            {/* 4. Avatar Dropdown with Status Dot */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 relative rounded-full hover:bg-transparent"
                  />
                }
              >
                <Avatar className="size-8 ring-1 ring-border">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="ring-card absolute end-0 bottom-0 block size-2 rounded-full bg-emerald-600 ring-2" />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="w-60 rounded-xl border border-border/60 bg-popover/95 backdrop-blur-md shadow-xl"
              >
                <DropdownMenuGroup>
                  <div className="p-3 text-start border-b border-border/40">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {displayName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {displayEmail}
                    </p>
                    <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      <span>{t("header.online")}</span>
                    </div>
                  </div>

                  <DropdownMenuLabel className="px-3 py-1.5 text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                    {t("switchRole")}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard/organizer")}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <Shield className="size-3.5 text-amber-500" />
                    <span>{t("titles.organizer")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard/participant")}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <Rocket className="size-3.5 text-emerald-500" />
                    <span>{t("titles.participant")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard/mentor")}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <Compass className="size-3.5 text-sky-500" />
                    <span>{t("titles.mentor")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push("/dashboard/judge")}
                    className="gap-2 cursor-pointer text-xs"
                  >
                    <Award className="size-3.5 text-purple-500" />
                    <span>{t("titles.judge")}</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer text-xs font-medium"
                >
                  <LogOut className="size-3.5" />
                  <span>{t("logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Command Palette Dialog (⌘K) */}
      <CommandDialog
        open={openSearch}
        onOpenChange={setOpenSearch}
        title={t("header.commandTitle")}
        description={t("header.commandDescription")}
      >
        <Command>
          <CommandInput placeholder={t("header.searchPlaceholder")} />
          <CommandList>
            <CommandEmpty>{t("header.commandEmpty")}</CommandEmpty>

            <CommandGroup heading={t("header.quickNavigation")}>
              {roleConfig.sections.flatMap((sec) => sec.items).map((item) => (
                <CommandItem
                  key={item.url}
                  onSelect={() => {
                    setOpenSearch(false)
                    router.push(item.url)
                  }}
                  className="gap-2 cursor-pointer text-xs"
                >
                  <item.icon className="size-4 text-muted-foreground" />
                  <span>{t(item.titleKey as any)}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading={t("switchRole")}>
              <CommandItem
                onSelect={() => {
                  setOpenSearch(false)
                  router.push("/dashboard/organizer")
                }}
                className="gap-2 cursor-pointer text-xs"
              >
                <Shield className="size-4 text-amber-500" />
                <span>{t("titles.organizer")}</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpenSearch(false)
                  router.push("/dashboard/participant")
                }}
                className="gap-2 cursor-pointer text-xs"
              >
                <Rocket className="size-4 text-emerald-500" />
                <span>{t("titles.participant")}</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpenSearch(false)
                  router.push("/dashboard/mentor")
                }}
                className="gap-2 cursor-pointer text-xs"
              >
                <Compass className="size-4 text-sky-500" />
                <span>{t("titles.mentor")}</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpenSearch(false)
                  router.push("/dashboard/judge")
                }}
                className="gap-2 cursor-pointer text-xs"
              >
                <Award className="size-4 text-purple-500" />
                <span>{t("titles.judge")}</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
