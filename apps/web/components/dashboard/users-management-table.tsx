"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  Users,
  UserPlus,
  UserCheck,
  UserCog,
  Search,
  Upload,
  Download,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  MoreVertical,
  PencilRuler,
  UserRound,
  Brush,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface UserRowData {
  id: string
  name: string
  email: string
  role: "admin" | "maintainer" | "editor"
  plan: "enterprise" | "basic"
  billing: "autoDebit"
  status: "active" | "pending"
  joinedDate: string
  avatarUrl?: string
}

const INITIAL_USERS: UserRowData[] = [
  {
    id: "user-001",
    name: "Zsasza McCleverty",
    email: "zmcclevertye@soundcloud.com",
    role: "maintainer",
    plan: "enterprise",
    billing: "autoDebit",
    status: "pending",
    joinedDate: "14 Jan 2022",
  },
  {
    id: "user-002",
    name: "Galen Slixby",
    email: "galen.slixby1@example.com",
    role: "admin",
    plan: "basic",
    billing: "autoDebit",
    status: "active",
    joinedDate: "22 Mar 2022",
  },
  {
    id: "user-003",
    name: "Halsey Redmore",
    email: "halsey.redmore2@example.com",
    role: "admin",
    plan: "basic",
    billing: "autoDebit",
    status: "active",
    joinedDate: "08 May 2022",
  },
  {
    id: "user-004",
    name: "Marjory Sicely",
    email: "marjory.sicely3@example.com",
    role: "admin",
    plan: "basic",
    billing: "autoDebit",
    status: "active",
    joinedDate: "19 Jul 2022",
  },
  {
    id: "user-005",
    name: "Cyrill Risby",
    email: "cyrill.risby4@example.com",
    role: "admin",
    plan: "basic",
    billing: "autoDebit",
    status: "active",
    joinedDate: "30 Sep 2022",
  },
  {
    id: "user-006",
    name: "Maggy Hurran",
    email: "maggy.hurran5@example.com",
    role: "admin",
    plan: "basic",
    billing: "autoDebit",
    status: "active",
    joinedDate: "12 Nov 2022",
  },
  {
    id: "user-007",
    name: "Silvain Halstead",
    email: "silvain.halstead6@example.com",
    role: "editor",
    plan: "basic",
    billing: "autoDebit",
    status: "active",
    joinedDate: "25 Jan 2023",
  },
  {
    id: "user-008",
    name: "Breena Gallemore",
    email: "breena.gallemore7@example.com",
    role: "editor",
    plan: "basic",
    billing: "autoDebit",
    status: "active",
    joinedDate: "03 Apr 2023",
  },
  {
    id: "user-009",
    name: "Kathryne Litterick",
    email: "kathryne.litterick8@example.com",
    role: "editor",
    plan: "basic",
    billing: "autoDebit",
    status: "active",
    joinedDate: "17 Jun 2023",
  },
  {
    id: "user-010",
    name: "Elke Klasen",
    email: "elke.klasen9@example.com",
    role: "editor",
    plan: "basic",
    billing: "autoDebit",
    status: "active",
    joinedDate: "29 Aug 2023",
  },
]

export function UsersManagementTable() {
  const t = useTranslations("Dashboard.organizer.usersTable")
  const locale = useLocale()
  const isRtl = locale === "ar"

  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedRole, setSelectedRole] = React.useState<string>("all")
  const [selectedPlan, setSelectedPlan] = React.useState<string>("all")
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = React.useState<number>(1)
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(10)

  // Filtered list
  const filteredUsers = React.useMemo(() => {
    return INITIAL_USERS.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole = selectedRole === "all" || user.role === selectedRole
      const matchesPlan = selectedPlan === "all" || user.plan === selectedPlan
      const matchesStatus = selectedStatus === "all" || user.status === selectedStatus
      return matchesSearch && matchesRole && matchesPlan && matchesStatus
    })
  }, [searchQuery, selectedRole, selectedPlan, selectedStatus])

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredUsers.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filteredUsers.map((u) => u.id)))
    }
  }

  const toggleSelectRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const getRoleIcon = (role: UserRowData["role"]) => {
    switch (role) {
      case "maintainer":
        return <PencilRuler className="text-chart-3 size-4" />
      case "admin":
        return <UserRound className="size-4 text-green-600 dark:text-green-400" />
      case "editor":
        return <Brush className="text-chart-2 size-4" />
    }
  }

  return (
    <div className="flex flex-col gap-3 lg:gap-6 w-full">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
        {/* Stat 1: Session */}
        <div
          data-slot="card"
          data-size="default"
          className="group/card bg-card text-card-foreground ring-foreground/10 flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-sm shadow-xs ring-1 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl"
        >
          <div
            data-slot="card-content"
            className="px-(--card-spacing) flex flex-row items-start justify-between"
          >
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">
                {t("stats.session")}
              </p>
              <div className="flex items-center gap-2">
                <h4 className="text-2xl font-medium">50</h4>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  (+29%)
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("stats.totalUsers")}
              </p>
            </div>
            <div className="flex size-9.5 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Users className="size-4" />
            </div>
          </div>
        </div>

        {/* Stat 2: Paid Users */}
        <div
          data-slot="card"
          data-size="default"
          className="group/card bg-card text-card-foreground ring-foreground/10 flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-sm shadow-xs ring-1 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl"
        >
          <div
            data-slot="card-content"
            className="px-(--card-spacing) flex flex-row items-start justify-between"
          >
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">
                {t("stats.paidUsers")}
              </p>
              <div className="flex items-center gap-2">
                <h4 className="text-2xl font-medium">30</h4>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  (+18%)
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("stats.analyticsSub")}
              </p>
            </div>
            <div className="flex size-9.5 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <UserPlus className="size-4" />
            </div>
          </div>
        </div>

        {/* Stat 3: Active Users */}
        <div
          data-slot="card"
          data-size="default"
          className="group/card bg-card text-card-foreground ring-foreground/10 flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-sm shadow-xs ring-1 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl"
        >
          <div
            data-slot="card-content"
            className="px-(--card-spacing) flex flex-row items-start justify-between"
          >
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">
                {t("stats.activeUsers")}
              </p>
              <div className="flex items-center gap-2">
                <h4 className="text-2xl font-medium">35</h4>
                <p className="text-sm font-medium text-destructive">(-14%)</p>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("stats.analyticsSub")}
              </p>
            </div>
            <div className="flex size-9.5 items-center justify-center rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
              <UserCheck className="size-4" />
            </div>
          </div>
        </div>

        {/* Stat 4: Pending Users */}
        <div
          data-slot="card"
          data-size="default"
          className="group/card bg-card text-card-foreground ring-foreground/10 flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl py-(--card-spacing) text-sm shadow-xs ring-1 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl"
        >
          <div
            data-slot="card-content"
            className="px-(--card-spacing) flex flex-row items-start justify-between"
          >
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm font-medium">
                {t("stats.pendingUsers")}
              </p>
              <div className="flex items-center gap-2">
                <h4 className="text-2xl font-medium">7</h4>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  (+42%)
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("stats.analyticsSub")}
              </p>
            </div>
            <div className="flex size-9.5 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UserCog className="size-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div
        data-slot="card"
        data-size="default"
        className="group/card bg-card text-card-foreground ring-foreground/10 flex flex-col gap-(--card-spacing) overflow-hidden rounded-xl text-sm ring-1 [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-xl *:[img:last-child]:rounded-b-xl py-0 shadow-none"
      >
        <div className="w-full">
          <div className="border-b">
            {/* Filter Controls Row */}
            <div className="flex flex-col gap-4 border-b p-6">
              <div className="grid grid-cols-1 gap-6 max-md:*:last:col-span-full sm:grid-cols-2 md:grid-cols-3">
                {/* Filter 1: Role */}
                <div className="flex w-full flex-col gap-2">
                  <label
                    data-slot="label"
                    htmlFor="filter-role"
                    className="flex items-center gap-2 text-sm leading-none font-medium select-none"
                  >
                    {t("filters.role")}
                  </label>
                  <Select
                    value={selectedRole}
                    onValueChange={(val) => {
                      if (val) setSelectedRole(val)
                    }}
                  >
                    <SelectTrigger id="filter-role" className="w-full">
                      <SelectValue placeholder={t("filters.role")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("filters.all")}</SelectItem>
                      <SelectItem value="admin">{t("filters.admin")}</SelectItem>
                      <SelectItem value="maintainer">{t("filters.maintainer")}</SelectItem>
                      <SelectItem value="editor">{t("filters.editor")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter 2: Plan */}
                <div className="flex w-full flex-col gap-2">
                  <label
                    data-slot="label"
                    htmlFor="filter-plan"
                    className="flex items-center gap-2 text-sm leading-none font-medium select-none"
                  >
                    {t("filters.plan")}
                  </label>
                  <Select
                    value={selectedPlan}
                    onValueChange={(val) => {
                      if (val) setSelectedPlan(val)
                    }}
                  >
                    <SelectTrigger id="filter-plan" className="w-full">
                      <SelectValue placeholder={t("filters.plan")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("filters.all")}</SelectItem>
                      <SelectItem value="enterprise">{t("filters.enterprise")}</SelectItem>
                      <SelectItem value="basic">{t("filters.basic")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter 3: Status */}
                <div className="flex w-full flex-col gap-2">
                  <label
                    data-slot="label"
                    htmlFor="filter-status"
                    className="flex items-center gap-2 text-sm leading-none font-medium select-none"
                  >
                    {t("filters.status")}
                  </label>
                  <Select
                    value={selectedStatus}
                    onValueChange={(val) => {
                      if (val) setSelectedStatus(val)
                    }}
                  >
                    <SelectTrigger id="filter-status" className="w-full">
                      <SelectValue placeholder={t("filters.status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("filters.all")}</SelectItem>
                      <SelectItem value="active">{t("filters.active")}</SelectItem>
                      <SelectItem value="pending">{t("filters.pending")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Actions & Search Row */}
            <div className="flex gap-4 p-6 max-sm:flex-col sm:items-center sm:justify-between">
              {/* Search user */}
              <div className="w-full max-w-xs">
                <label htmlFor="search-user" className="sr-only">
                  {t("searchPlaceholder")}
                </label>
                <div
                  data-slot="input-group"
                  className="group/input-group border-input dark:bg-input/30 relative flex h-9 w-full min-w-0 items-center rounded-md border shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
                >
                  <div className="text-muted-foreground flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium ps-2.5 pe-1.5">
                    <Search className="size-4" />
                  </div>
                  <input
                    id="search-user"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="border-input placeholder:text-muted-foreground h-9 w-full min-w-0 px-2 py-1 text-sm bg-transparent outline-none border-0 shadow-none ring-0 focus:ring-0 focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 sm:justify-between">
                {/* Rows per page */}
                <div className="flex items-center gap-2">
                  <label htmlFor="rows-per-page" className="sr-only">
                    {t("show")}
                  </label>
                  <Select
                    value={String(rowsPerPage)}
                    onValueChange={(val) => {
                      if (val) setRowsPerPage(Number(val))
                    }}
                  >
                    <SelectTrigger id="rows-per-page" className="w-fit min-w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Export */}
                <Button
                  type="button"
                  variant="outline"
                  className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40 border-transparent h-9 gap-1.5 px-2.5 cursor-pointer shadow-xs"
                >
                  <Upload className="size-4" />
                  <span className="max-lg:hidden">{t("export")}</span>
                </Button>

                {/* Import */}
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 gap-1.5 px-2.5 cursor-pointer shadow-xs"
                >
                  <Download className="size-4" />
                  <span className="max-lg:hidden">{t("import")}</span>
                </Button>

                {/* Add New User */}
                <Button
                  type="button"
                  className="bg-primary text-primary-foreground hover:bg-primary/80 h-9 gap-1.5 px-2.5 cursor-pointer shadow-xs"
                >
                  <Plus className="size-4" />
                  <span className="max-lg:hidden">{t("addNewUser")}</span>
                </Button>
              </div>
            </div>

            {/* Data Table */}
            <div data-slot="table-container" className="relative w-full overflow-x-auto">
              <table data-slot="table" className="w-full caption-bottom text-sm border-t">
                <thead data-slot="table-header" className="[&_tr]:border-b">
                  <tr
                    data-slot="table-row"
                    className="hover:bg-muted/50 border-b transition-colors h-14"
                  >
                    {/* Checkbox All */}
                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground ps-4 w-12.5"
                    >
                      <input
                        type="checkbox"
                        checked={
                          selectedRows.size === filteredUsers.length &&
                          filteredUsers.length > 0
                        }
                        onChange={toggleSelectAll}
                        aria-label={t("columns.selectAll")}
                        className="size-4 rounded-sm border-input text-primary focus:ring-primary cursor-pointer accent-primary"
                      />
                    </th>

                    {/* User */}
                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground min-w-[260px] sm:w-[360px]"
                    >
                      <div className="flex h-full cursor-pointer items-center justify-between gap-2 select-none">
                        {t("columns.user")}
                      </div>
                    </th>

                    {/* Role */}
                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground w-[150px]"
                    >
                      <div className="flex h-full cursor-pointer items-center justify-between gap-2 select-none">
                        {t("columns.role")}
                      </div>
                    </th>

                    {/* Plan */}
                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground w-[150px]"
                    >
                      <div className="flex h-full cursor-pointer items-center justify-between gap-2 select-none">
                        {t("columns.plan")}
                      </div>
                    </th>

                    {/* Billing */}
                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground w-[150px]"
                    >
                      <div className="flex h-full cursor-pointer items-center justify-between gap-2 select-none">
                        {t("columns.billing")}
                      </div>
                    </th>

                    {/* Status */}
                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground w-[150px]"
                    >
                      <div className="flex h-full cursor-pointer items-center justify-between gap-2 select-none">
                        {t("columns.status")}
                      </div>
                    </th>

                    {/* Joined Date */}
                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground w-[150px]"
                    >
                      <div className="flex h-full cursor-pointer items-center justify-between gap-2 select-none">
                        {t("columns.joinedDate")}
                      </div>
                    </th>

                    {/* Actions */}
                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-center align-middle font-medium whitespace-nowrap text-muted-foreground pe-4 w-[150px]"
                    >
                      {t("columns.actions")}
                    </th>
                  </tr>
                </thead>

                <tbody data-slot="table-body" className="[&_tr:last-child]:border-0">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedRows.has(user.id)
                    const initials = user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)

                    return (
                      <tr
                        key={user.id}
                        data-slot="table-row"
                        data-state={isSelected ? "selected" : "false"}
                        className={`hover:bg-muted/50 border-b transition-colors h-14 ${
                          isSelected ? "bg-muted/40" : ""
                        }`}
                      >
                        {/* Checkbox Row */}
                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap ps-4 w-12.5"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(user.id)}
                            aria-label={`${t("columns.selectRow")} ${user.name}`}
                            className="size-4 rounded-sm border-input text-primary focus:ring-primary cursor-pointer accent-primary"
                          />
                        </td>

                        {/* User Avatar + Name + Email */}
                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap"
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-9">
                              {user.avatarUrl && (
                                <AvatarImage src={user.avatarUrl} alt={user.name} />
                              )}
                              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">
                                {user.name}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap"
                        >
                          <div className="flex items-center gap-2">
                            {getRoleIcon(user.role)}
                            <span className="capitalize">
                              {t(`filters.${user.role}`)}
                            </span>
                          </div>
                        </td>

                        {/* Plan */}
                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap"
                        >
                          <span className="text-muted-foreground">
                            {t(`filters.${user.plan}`)}
                          </span>
                        </td>

                        {/* Billing */}
                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap"
                        >
                          <span className="text-muted-foreground">
                            {t(`filters.${user.billing}`)}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap"
                        >
                          {user.status === "active" ? (
                            <span className="inline-flex w-fit items-center justify-center px-2 py-0.5 text-xs font-medium rounded-sm bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400">
                              {t("filters.active")}
                            </span>
                          ) : (
                            <span className="inline-flex w-fit items-center justify-center px-2 py-0.5 text-xs font-medium rounded-sm bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
                              {t("filters.pending")}
                            </span>
                          )}
                        </td>

                        {/* Joined Date */}
                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap text-muted-foreground"
                        >
                          <span>{user.joinedDate}</span>
                        </td>

                        {/* Actions */}
                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap pe-4"
                        >
                          <div className="flex items-center justify-center gap-1">
                            {/* View Action */}
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    type="button"
                                    aria-label={t("actions.view")}
                                    className="size-9 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  />
                                }
                              >
                                <Eye className="size-4.5" />
                              </TooltipTrigger>
                              <TooltipContent>{t("actions.view")}</TooltipContent>
                            </Tooltip>

                            {/* Delete Action */}
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    type="button"
                                    aria-label={t("actions.delete")}
                                    className="size-9 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                                  />
                                }
                              >
                                <Trash2 className="size-4.5" />
                              </TooltipTrigger>
                              <TooltipContent>{t("actions.delete")}</TooltipContent>
                            </Tooltip>

                            {/* More Actions Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <button
                                    type="button"
                                    aria-label={t("actions.more")}
                                    className="size-9 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  />
                                }
                              >
                                <MoreVertical className="size-4.5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isRtl ? "start" : "end"}>
                                <DropdownMenuItem className="cursor-pointer">
                                  {t("actions.view")}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer text-destructive">
                                  {t("actions.delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Row */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 max-sm:flex-col md:max-lg:flex-col">
            <p className="text-muted-foreground text-sm whitespace-nowrap">
              {t("pagination.showing", {
                start: filteredUsers.length > 0 ? 1 : 0,
                end: Math.min(filteredUsers.length, rowsPerPage),
                total: 50,
              })}
            </p>

            <nav
              role="navigation"
              aria-label="pagination"
              className="mx-auto flex w-full justify-center sm:justify-end"
            >
              <ul className="flex items-center gap-1">
                {/* Previous */}
                <li>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-9 gap-1.5 px-2.5 text-sm cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isRtl ? (
                      <ChevronRight className="size-4" />
                    ) : (
                      <ChevronLeft className="size-4" />
                    )}
                    <span className="max-sm:hidden">{t("pagination.previous")}</span>
                  </Button>
                </li>

                {/* Page 1 */}
                <li>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    className={`size-9 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors cursor-pointer ${
                      currentPage === 1
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-transparent hover:bg-muted text-foreground"
                    }`}
                  >
                    1
                  </button>
                </li>

                {/* Page 2 */}
                <li>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(2)}
                    className={`size-9 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors cursor-pointer ${
                      currentPage === 2
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    }`}
                  >
                    2
                  </button>
                </li>

                {/* Ellipsis */}
                <li>
                  <span className="flex size-9 items-center justify-center text-muted-foreground">
                    ...
                  </span>
                </li>

                {/* Next */}
                <li>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={currentPage >= 5}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="h-9 gap-1.5 px-2.5 text-sm cursor-pointer disabled:pointer-events-none disabled:opacity-50"
                  >
                    <span className="max-sm:hidden">{t("pagination.next")}</span>
                    {isRtl ? (
                      <ChevronLeft className="size-4" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                  </Button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}
