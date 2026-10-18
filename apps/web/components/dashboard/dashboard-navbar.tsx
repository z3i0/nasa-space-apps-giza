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
import { Languages, LogOut, Search, UserRound } from "lucide-react"
import { DASHBOARD_ROLES_CONFIG, type DashboardRole } from "./dashboard-config"
import { getAvailableRoles } from "./dashboard-navigation"
import { clearAuth, useAuthUser } from "@/lib/auth"
import { cn } from "@/lib/utils"
import styles from "./dashboard-shell.module.css"

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
  const [signingOut, setSigningOut] = React.useState(false)
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
      if (event.key?.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpenSearch((open) => !open)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

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
      <header className={styles.topBar}>
        <Link href="/" className={styles.brand} aria-label={t("shell.home")}>
          <Image
            src="/dashboard/space-apps-logo.png"
            width={112}
            height={44}
            alt="NASA Space Apps Challenge"
            className={styles.brandLogo}
            priority
          />
          <span className={styles.brandDivider} aria-hidden="true" />
          <span className={styles.brandName}>{t("shell.brand")}</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className={styles.accountButton}
                aria-label={`${t("header.userMenu")}: ${displayName}`}
              />
            }
          >
            <Image
              src="/dashboard/account.svg"
              width={18}
              height={18}
              alt=""
              className={styles.accountIcon}
            />
            <span>{displayName}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={12}
            dir={direction}
            className={cn(themeClassName, styles.accountMenu)}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className={styles.accountSummary}>
                <strong>{displayName}</strong>
                {user?.email && <span dir="ltr">{user.email}</span>}
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
                <kbd className={styles.shortcut}>Ctrl K</kbd>
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
      </header>
      <Dialog open={openSearch} onOpenChange={setOpenSearch}>
        <DialogContent
          dir={direction}
          className={cn(themeClassName, styles.commandDialog)}
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
