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
              onClick={() => setOpenNotifications((open) => !open)}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-transparent bg-transparent text-muted-foreground transition-colors hover:border-border hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-expanded:border-border aria-expanded:bg-secondary aria-expanded:text-foreground [&_svg]:size-4"
            >
              <Bell className="size-4" aria-hidden="true" />
            </Button>
            {openNotifications && (
              <section
                id="dashboard-notifications-popover"
                role="dialog"
                aria-label={t("header.notifications")}
                dir={direction}
                className={cn(
                  themeClassName,
                  "absolute end-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl"
                )}
              >
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold">
                    {t("header.notifications")}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("header.notificationsDescription")}
                  </p>
                </div>
                <div className="flex min-h-36 flex-col items-center justify-center gap-3 px-5 py-7 text-center">
                  <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                    <Bell className="size-[18px]" aria-hidden="true" />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {t("header.noNotifications")}
                  </p>
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
