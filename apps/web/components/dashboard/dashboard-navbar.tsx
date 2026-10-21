"use client"

import * as React from "react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { Link, usePathname, useRouter } from "@/i18n/routing"
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
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Bell, Languages, LogOut, Search, UserRound } from "lucide-react"
import { DASHBOARD_ROLES_CONFIG, type DashboardRole } from "./dashboard-config"
import { getAvailableRoles } from "./dashboard-navigation"
import { clearAuth, useAuthUser } from "@/lib/auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  accountApi,
  type NotificationItem,
  type NotificationsResponse,
} from "@/lib/account"

interface DashboardNavbarProps {
  currentRole: DashboardRole
  themeClassName: string
}

export function DashboardNavbar({
  currentRole,
  themeClassName,
}: DashboardNavbarProps) {
  const t = useTranslations("Dashboard")
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthUser()
  const [openSearch, setOpenSearch] = React.useState(false)
  const [openNotifications, setOpenNotifications] = React.useState(false)
  const [signingOut, setSigningOut] = React.useState(false)
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const notificationsRef = React.useRef<HTMLDivElement>(null)
  const availableRoles = getAvailableRoles(user)
  const roleConfig = DASHBOARD_ROLES_CONFIG[currentRole]
  const displayName = user?.name || user?.fullName || t("shell.accountFallback")
  const profileHref =
    currentRole === "organizer"
      ? "/dashboard/organizer/settings"
      : `/dashboard/${currentRole}/profile`
  const direction = locale === "ar" ? "rtl" : "ltr"

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key?.toLowerCase() === "k" &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        setOpenSearch((open) => !open)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  React.useEffect(() => {
    if (!openNotifications) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!notificationsRef.current?.contains(event.target as Node)) {
        setOpenNotifications(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenNotifications(false)
    }

    document.addEventListener("pointerdown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [openNotifications])

  const loadNotifications = React.useCallback(async () => {
    if (!user) return
    try {
      const res = await accountApi<NotificationsResponse>("/notifications")
      setNotifications(res.notifications || [])
      setUnreadCount(res.unreadCount || 0)
    } catch {
      // ignore
    }
  }, [user])

  React.useEffect(() => {
    void loadNotifications()
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadNotifications()
      }
    }, 12000)
    return () => clearInterval(timer)
  }, [loadNotifications])

  const handleMarkAllRead = async () => {
    try {
      await accountApi("/notifications/mark-read", {})
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      // ignore
    }
  }

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      void accountApi("/notifications/mark-read", { id: notif.id })
      setUnreadCount((c) => Math.max(0, c - 1))
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      )
    }
    setOpenNotifications(false)
    if (notif.link) {
      router.push(notif.link)
    }
  }

  const handleLogout = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await clearAuth()
      router.push("/login")
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-4 border-b border-sidebar-border bg-sidebar px-7 max-[760px]:static max-[760px]:h-16 max-[760px]:gap-3 max-[760px]:px-4">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-[18px] no-underline max-[760px]:gap-2"
          aria-label={t("shell.home")}
        >
          <span className="relative block h-[44px] w-28 shrink-0 max-[760px]:w-[86px] max-[380px]:w-[72px]">
            <Image
              src="/dashboard/space-apps-logo-light.png"
              width={112}
              height={44}
              alt="NASA Space Apps Challenge"
              className="h-auto w-full dark:hidden"
              priority
            />
            <Image
              src="/dashboard/space-apps-logo.png"
              width={112}
              height={44}
              alt="NASA Space Apps Challenge"
              className="hidden h-auto w-full dark:block"
              priority
            />
          </span>
          <span
            className="h-7 w-px bg-border max-[760px]:hidden"
            aria-hidden="true"
          />
          <span className="text-sm leading-6 font-bold max-[760px]:hidden">
            {t("shell.brand")}
          </span>
        </Link>
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
          <div className="relative" ref={notificationsRef}>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("header.notifications")}
              title={t("header.notifications")}
              aria-haspopup="dialog"
              aria-expanded={openNotifications}
              aria-controls="dashboard-notifications-popover"
              onClick={() => {
                setOpenNotifications((open) => !open)
                if (!openNotifications) void loadNotifications()
              }}
              className="relative inline-flex size-9 items-center justify-center rounded-lg border border-transparent bg-transparent text-muted-foreground transition-colors hover:border-border hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-expanded:border-border aria-expanded:bg-secondary aria-expanded:text-foreground [&_svg]:size-4"
            >
              <Bell className="size-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -end-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            {openNotifications && (
              <section
                id="dashboard-notifications-popover"
                role="dialog"
                aria-label={t("header.notifications")}
                dir={direction}
                className={cn(
                  themeClassName,
                  "absolute end-0 top-11 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl backdrop-blur-xl"
                )}
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold">
                      {t("header.notifications")}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      {unreadCount > 0
                        ? `${unreadCount} ${t("header.unread")}`
                        : t("header.allRead")}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllRead}
                      className="h-7 text-xs text-primary hover:bg-primary/10"
                    >
                      {t("header.markAllAsRead")}
                    </Button>
                  )}
                </div>
                {notifications.length > 0 ? (
                  <div className="max-h-[360px] divide-y divide-border/60 overflow-y-auto">
                    {notifications.map((item) => {
                      const title =
                        locale === "ar" && item.titleAr
                          ? item.titleAr
                          : item.title
                      const message =
                        locale === "ar" && item.messageAr
                          ? item.messageAr
                          : item.message

                      return (
                        <div
                          key={item.id}
                          onClick={() => void handleNotificationClick(item)}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 p-3.5 transition-colors hover:bg-muted/40",
                            !item.isRead && "bg-primary/5"
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs",
                              item.type === "mentorship"
                                ? "bg-sky-500/15 text-sky-500"
                                : item.type === "team_join" || item.type === "team_invite"
                                  ? "bg-emerald-500/15 text-emerald-500"
                                  : item.type === "role_application"
                                    ? "bg-amber-500/15 text-amber-500"
                                    : "bg-primary/15 text-primary"
                            )}
                          >
                            <Bell className="size-3.5" />
                          </span>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-xs font-semibold text-foreground">
                                {title}
                              </p>
                              {!item.isRead && (
                                <span className="size-2 shrink-0 rounded-full bg-primary" />
                              )}
                            </div>
                            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                              {message}
                            </p>
                            <span className="block text-[10px] text-muted-foreground/80">
                              {new Date(item.createdAt).toLocaleTimeString(
                                locale === "ar" ? "ar-EG" : "en-US",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-36 flex-col items-center justify-center gap-3 px-5 py-7 text-center">
                    <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                      <Bell className="size-[18px]" aria-hidden="true" />
                    </span>
                    <p className="text-sm text-muted-foreground">
                      {t("header.noNotifications")}
                    </p>
                  </div>
                )}
                <div className="border-t border-border bg-muted/20 p-2 text-center">
                  <Link
                    href="/dashboard/notifications"
                    onClick={() => setOpenNotifications(false)}
                    className="block rounded-lg py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    {t("header.viewAllNotifications")}
                  </Link>
                </div>
              </section>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="flex size-10 min-w-0 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-xs font-normal text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  aria-label={`${t("header.userMenu")}: ${displayName}`}
                />
              }
            >
              <Avatar className="size-9 ring-2 ring-sidebar">
                <AvatarImage
                  src={user?.avatar || undefined}
                  alt={displayName}
                />
                <AvatarFallback aria-label={displayName}>
                  <UserRound className="size-[18px]" aria-hidden="true" />
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={12}
              dir={direction}
              className={cn(
                themeClassName,
                "w-64 max-w-[calc(100vw-32px)] rounded-xl border border-border text-[13px]"
              )}
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex flex-col gap-1.5 px-2 py-3">
                  <strong className="text-foreground">{displayName}</strong>
                  {user?.email && (
                    <span className="overflow-hidden text-start text-xs text-ellipsis">
                      {user.email}
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuItem render={<Link href={profileHref} />}>
                  <UserRound />
                  {t("profile")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <Link
                      href={pathname}
                      locale={locale === "ar" ? "en" : "ar"}
                    />
                  }
                >
                  <Languages />
                  <span lang={locale === "ar" ? "en" : "ar"}>
                    {locale === "ar" ? "English" : "العربية"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setOpenSearch(true)}>
                  <Search />
                  {t("header.search")}
                  <kbd className="ms-auto text-[10px] text-muted-foreground">
                    Ctrl K
                  </kbd>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              {availableRoles.length > 1 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{t("switchRole")}</DropdownMenuLabel>
                    {availableRoles.map((role) => {
                      const Icon = DASHBOARD_ROLES_CONFIG[role].icon
                      return (
                        <DropdownMenuItem
                          key={role}
                          render={<Link href={`/dashboard/${role}`} />}
                        >
                          <Icon />
                          {t(`titles.${role}`)}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuGroup>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={signingOut}
                variant="destructive"
              >
                <LogOut />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <Dialog open={openSearch} onOpenChange={setOpenSearch}>
        <DialogContent
          dir={direction}
          className={cn(
            themeClassName,
            "overflow-hidden border border-border p-0"
          )}
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{t("header.commandTitle")}</DialogTitle>
            <DialogDescription>
              {t("header.commandDescription")}
            </DialogDescription>
          </DialogHeader>
          <Command>
            <CommandInput
              placeholder={t("header.searchPlaceholder")}
              aria-label={t("header.search")}
            />
            <CommandList>
              <CommandEmpty>{t("header.commandEmpty")}</CommandEmpty>
              <CommandGroup heading={t("header.quickNavigation")}>
                {roleConfig.sections
                  .flatMap((section) => section.items)
                  .map((item) => (
                    <CommandItem
                      key={item.url}
                      onSelect={() => {
                        setOpenSearch(false)
                        router.push(item.url)
                      }}
                    >
                      <item.icon />
                      <span>{t(item.titleKey)}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
              {availableRoles.length > 1 && (
                <CommandGroup heading={t("switchRole")}>
                  {availableRoles.map((role) => {
                    const Icon = DASHBOARD_ROLES_CONFIG[role].icon
                    return (
                      <CommandItem
                        key={role}
                        onSelect={() => {
                          setOpenSearch(false)
                          router.push(`/dashboard/${role}`)
                        }}
                      >
                        <Icon />
                        {t(`titles.${role}`)}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
