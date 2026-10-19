"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/routing"
import {
  Sidebar,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { DASHBOARD_ROLES_CONFIG, type DashboardRole } from "./dashboard-config"
import { getShellNavigation, isNavigationActive } from "./dashboard-navigation"

export function AppSidebar({ currentRole }: { currentRole: DashboardRole }) {
  const pathname = usePathname()
  const t = useTranslations("Dashboard")
  const RoleIcon = DASHBOARD_ROLES_CONFIG[currentRole].icon

  return (
    <aside className="sticky top-[72px] z-10 min-w-0 flex-[0_0_224px] max-[760px]:static">
      <Sidebar
        collapsible="none"
        className="h-[calc(100dvh-72px)] w-56 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] overflow-y-auto border-e border-sidebar-border bg-sidebar px-4 py-6 shadow-[6px_0_24px_#00000061] max-[760px]:h-auto max-[760px]:w-full max-[760px]:overflow-visible max-[760px]:border-e-0 max-[760px]:border-b max-[760px]:border-sidebar-border max-[760px]:px-4 max-[760px]:py-3.5 max-[760px]:shadow-none rtl:shadow-[-6px_0_24px_#00000061]"
      >
        <div className="flex w-full items-center gap-1.5 rounded-lg border border-sidebar-border bg-sidebar-accent px-2.5 py-1.5 text-[10px] leading-4 font-semibold text-sidebar-accent-foreground opacity-80">
          {currentRole === "participant" ? (
            <Image
              src="/dashboard/participant.svg"
              width={10}
              height={10}
              alt=""
            />
          ) : (
            <RoleIcon size={10} aria-hidden="true" />
          )}
          <span>{t(`shell.roles.${currentRole}`)}</span>
        </div>
        <nav
          aria-label={t("shell.navigation")}
          className="mt-4 mb-6 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] max-[760px]:mt-3 max-[760px]:mb-0 max-[760px]:flex max-[760px]:gap-3 max-[760px]:overflow-x-auto max-[760px]:py-0.5 max-[760px]:pb-1"
          data-dashboard-navigation=""
        >
          {getShellNavigation(currentRole).map((section, index) => (
            <div
              className="max-[760px]:shrink-0 [&+&]:mt-5 [&+&]:max-[760px]:mt-0"
              key={section.titleKey ?? index}
            >
              {section.titleKey && (
                <p className="mb-2 px-3 text-[10px] font-semibold tracking-wide text-[#72849e] uppercase max-[760px]:hidden">
                  {t(section.titleKey)}
                </p>
              )}
              <SidebarMenu className="gap-0.5 max-[760px]:flex-row">
                {section.items.map((item) => {
                  const active = isNavigationActive(pathname, item, currentRole)
                  const asset = active
                    ? (item.activeAsset ?? item.asset)
                    : item.asset
                  return (
                    <SidebarMenuItem
                      key={item.url}
                      className="max-[760px]:shrink-0"
                    >
                      <SidebarMenuButton
                        render={
                          <Link
                            href={item.url}
                            prefetch={false}
                            aria-current={active ? "page" : undefined}
                          />
                        }
                        isActive={active}
                        className="h-auto min-h-[46px] w-full gap-2.5 rounded-xl border border-transparent bg-transparent px-3 py-[9px] text-[13px] leading-[1.5] font-normal text-sidebar-foreground transition-[background-color,border-color,color] duration-[160ms] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active]:border-sidebar-border data-[active]:bg-sidebar-accent data-[active]:font-bold data-[active]:text-sidebar-accent-foreground data-[active]:shadow-[0_0_6px_#7df4ff17] data-[active]:[text-shadow:0_0_8px_#7df4ff40] max-[760px]:min-h-10 max-[760px]:w-auto max-[760px]:px-[9px] max-[760px]:py-[7px] max-[760px]:whitespace-nowrap"
                      >
                        <span className="grid size-[26px] shrink-0 place-items-center rounded-lg bg-sidebar-accent max-[760px]:size-6 [&_svg]:size-[18px]">
                          {asset ? (
                            <Image
                              src={`/dashboard/${asset}.svg`}
                              loading="eager"
                              width={18}
                              height={18}
                              alt=""
                            />
                          ) : (
                            <item.icon size={18} aria-hidden="true" />
                          )}
                        </span>
                        <span>{t(item.titleKey)}</span>
                        {active && (
                          <Image
                            className="ms-auto shrink-0 max-[760px]:hidden rtl:rotate-180"
                            src="/dashboard/chevron.svg"
                            width={12}
                            height={12}
                            alt=""
                          />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </div>
          ))}
        </nav>
        <div className="mt-auto flex items-start gap-2 border-t border-sidebar-border/80 pt-4 text-[11px] leading-[1.7] text-muted-foreground max-[760px]:hidden [&_img]:mt-[3px] [&_img]:shrink-0 [&_p]:m-0">
          <Image src="/dashboard/location.svg" width={12} height={12} alt="" />
          <p>
            {t("shell.location")}
            <br />
            {t("shell.missionNote")}
          </p>
        </div>
      </Sidebar>
    </aside>
  )
}
