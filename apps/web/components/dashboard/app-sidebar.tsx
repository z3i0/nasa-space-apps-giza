"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link, usePathname } from "@/i18n/routing"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DASHBOARD_ROLES_CONFIG,
  DashboardRole,
} from "./dashboard-config"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
import { Badge } from "../ui/badge"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  currentRole: DashboardRole
}

export function AppSidebar({ currentRole, className, ...props }: AppSidebarProps) {
  const locale = useLocale()
  const pathname = usePathname()
  const t = useTranslations("Dashboard")
  const { isMobile, setOpenMobile } = useSidebar()

  const isRtl = locale === "ar"
  const roleConfig = DASHBOARD_ROLES_CONFIG[currentRole] || DASHBOARD_ROLES_CONFIG.participant
  const RoleIcon = roleConfig.icon

  return (
    <Sidebar
      side={isRtl ? "right" : "left"}
      collapsible="icon"
      className={cn(
        "border-sidebar-border select-none",
        isRtl ? "border-l border-s-0 group-data-[side=right]:border-l" : "border-r",
        className
      )}
      {...props}
    >
      {/* Brand & Active Role Header */}
      <SidebarHeader className="border-b border-sidebar-border/60 pb-3 pt-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:py-2.5">
        <SidebarMenu>
          <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarMenuButton
              size="lg"
              render={<Link href={`/dashboard/${currentRole}`} />}
              tooltip={{
                children: t("brand"),
                side: isRtl ? "left" : "right",
              }}
              className="group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center hover:bg-sidebar-accent/50 transition-colors"
            >
              {/* Official NASA Space Apps Giza Logo */}
              <Logo className="group-data-[collapsible=icon]:size-8" />

              {/* Title & Role Info */}
              <div className="grid flex-1 text-start leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-bold tracking-tight text-foreground text-sm flex items-center gap-1.5">
                  {t("brand")}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    className={cn(
                      roleConfig.colorClass.bg,
                      roleConfig.colorClass.text,
                      roleConfig.colorClass.border
                    )}
                  >
                    <RoleIcon className="size-3" />
                    <span>{t(roleConfig.titleKey as any)}</span>
                  </Badge>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Sections */}
      <SidebarContent className="gap-2 px-2 py-3 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2">
        {roleConfig.sections.map((section) => (
          <SidebarGroup
            key={section.titleKey}
            className="py-1.5 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:py-1"
          >
            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 px-2 group-data-[collapsible=icon]:pointer-events-none">
              {t(section.titleKey as any)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="group-data-[collapsible=icon]:items-center">
                {section.items.map((item) => {
                  const isActive =
                    pathname === item.url ||
                    (item.url !== `/dashboard/${currentRole}` && pathname.startsWith(item.url))

                  const itemTitle = t(item.titleKey as any)

                  return (
                    <SidebarMenuItem
                      key={item.titleKey}
                      className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full"
                    >
                      <SidebarMenuButton
                        render={
                          <Link
                            href={item.url}
                            onClick={() => {
                              if (isMobile) setOpenMobile(false)
                            }}
                          />
                        }
                        isActive={isActive}
                        tooltip={{
                          children: itemTitle,
                          side: isRtl ? "left" : "right",
                        }}
                        className={cn(
                          "transition-all duration-150 font-medium",
                          "group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-0! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 [&>span]:group-data-[collapsible=icon]:hidden",
                          isActive
                            ? "bg-primary/10 text-primary font-semibold shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/70"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <span className="truncate">{itemTitle}</span>
                      </SidebarMenuButton>

                      {item.badgeKey && (
                        <SidebarMenuBadge
                          className={cn(
                            "font-semibold px-1.5 py-0.5 rounded-md",
                            item.badgeVariant === "default"
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {t(item.badgeKey as any)}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
