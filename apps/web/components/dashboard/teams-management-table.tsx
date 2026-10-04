"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  Users,
  CheckCircle2,
  FolderGit2,
  Compass,
  Search,
  Upload,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  MoreVertical,
  UserPlus,
  Rocket,
  Globe,
  Award,
} from "lucide-react"
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

interface TeamRowData {
  id: string
  name: string
  track: "earthScience" | "spaceDebris" | "astrophysics" | "solarPhysics"
  leader: {
    name: string
    email: string
    avatarUrl?: string
  }
  membersCount: number
  maxMembers: number
  mentor: string
  submission: "submitted" | "draft" | "notStarted"
  updatedAt: string
}

const INITIAL_TEAMS: TeamRowData[] = [
  {
    id: "team-001",
    name: "Nebula Explorers",
    track: "earthScience",
    leader: {
      name: "Sarah Jenkins",
      email: "sarah.j@example.com",
    },
    membersCount: 5,
    maxMembers: 5,
    mentor: "Dr. Ahmed Mansour",
    submission: "submitted",
    updatedAt: "10 mins ago",
  },
  {
    id: "team-002",
    name: "AstroCode Giza",
    track: "spaceDebris",
    leader: {
      name: "Omar Khaled",
      email: "omar.k@example.com",
    },
    membersCount: 5,
    maxMembers: 5,
    mentor: "Eng. Tarek Sayed",
    submission: "draft",
    updatedAt: "30 mins ago",
  },
  {
    id: "team-003",
    name: "Cosmos AI",
    track: "astrophysics",
    leader: {
      name: "Laila Mahmoud",
      email: "laila.m@example.com",
    },
    membersCount: 4,
    maxMembers: 5,
    mentor: "Dr. Mona Fathy",
    submission: "draft",
    updatedAt: "1 hour ago",
  },
  {
    id: "team-004",
    name: "SolarPulse Dynamics",
    track: "solarPhysics",
    leader: {
      name: "Youssef Nabil",
      email: "youssef.n@example.com",
    },
    membersCount: 5,
    maxMembers: 5,
    mentor: "Eng. Nourhan Ali",
    submission: "submitted",
    updatedAt: "2 hours ago",
  },
  {
    id: "team-005",
    name: "TerraScan Orbiters",
    track: "earthScience",
    leader: {
      name: "Hany Adel",
      email: "hany.a@example.com",
    },
    membersCount: 3,
    maxMembers: 5,
    mentor: "Pending",
    submission: "notStarted",
    updatedAt: "4 hours ago",
  },
  {
    id: "team-006",
    name: "LunarRover Robotics",
    track: "spaceDebris",
    leader: {
      name: "Maya Rashed",
      email: "maya.r@example.com",
    },
    membersCount: 5,
    maxMembers: 5,
    mentor: "Dr. Karim Hassan",
    submission: "submitted",
    updatedAt: "Yesterday",
  },
  {
    id: "team-007",
    name: "ExoFinder Telescope",
    track: "astrophysics",
    leader: {
      name: "Kareem Farouk",
      email: "kareem.f@example.com",
    },
    membersCount: 4,
    maxMembers: 5,
    mentor: "Dr. Mona Fathy",
    submission: "draft",
    updatedAt: "Yesterday",
  },
  {
    id: "team-008",
    name: "BioSpace Microgravity",
    track: "earthScience",
    leader: {
      name: "Rania Sherif",
      email: "rania.s@example.com",
    },
    membersCount: 5,
    maxMembers: 5,
    mentor: "Eng. Tarek Sayed",
    submission: "submitted",
    updatedAt: "2 days ago",
  },
]

export function TeamsManagementTable() {
  const t = useTranslations("Dashboard.organizer.teamsTable")
  const locale = useLocale()
  const isRtl = locale === "ar"

  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedTrack, setSelectedTrack] = React.useState<string>("all")
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all")
  const [selectedSubmission, setSelectedSubmission] = React.useState<string>("all")
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = React.useState<number>(1)

  // Filter teams
  const filteredTeams = React.useMemo(() => {
    return INITIAL_TEAMS.filter((team) => {
      const matchesSearch =
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.leader.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesTrack = selectedTrack === "all" || team.track === selectedTrack
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "full" && team.membersCount === team.maxMembers) ||
        (selectedStatus === "open" && team.membersCount < team.maxMembers)
      const matchesSubmission =
        selectedSubmission === "all" || team.submission === selectedSubmission

      return matchesSearch && matchesTrack && matchesStatus && matchesSubmission
    })
  }, [searchQuery, selectedTrack, selectedStatus, selectedSubmission])

  const toggleSelectAll = () => {
    if (selectedRows.size === filteredTeams.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filteredTeams.map((t) => t.id)))
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

  const getTrackBadge = (track: TeamRowData["track"]) => {
    switch (track) {
      case "earthScience":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Globe className="size-3" />
            <span>{t(`filters.${track}`)}</span>
          </span>
        )
      case "spaceDebris":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Rocket className="size-3" />
            <span>{t(`filters.${track}`)}</span>
          </span>
        )
      case "astrophysics":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Award className="size-3" />
            <span>{t(`filters.${track}`)}</span>
          </span>
        )
      case "solarPhysics":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <FolderGit2 className="size-3" />
            <span>{t(`filters.${track}`)}</span>
          </span>
        )
    }
  }

  const getSubmissionBadge = (submission: TeamRowData["submission"]) => {
    switch (submission) {
      case "submitted":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400">
            <CheckCircle2 className="size-3" />
            <span>{t("filters.submitted")}</span>
          </span>
        )
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
            <FolderGit2 className="size-3" />
            <span>{t("filters.draft")}</span>
          </span>
        )
      case "notStarted":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-xs font-medium bg-muted text-muted-foreground">
            <span>{t("filters.notStarted")}</span>
          </span>
        )
    }
  }

  return (
    <div className="flex flex-col gap-3 lg:gap-6 w-full">
      {/* 4 Stat Cards for Teams */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
        {/* Stat 1: Total Teams */}
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
                {t("stats.totalTeams")}
              </p>
              <div className="flex items-center gap-2">
                <h4 className="text-2xl font-medium">48</h4>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  (+12)
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("stats.analyticsSub")}
              </p>
            </div>
            <div className="flex size-9.5 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
              <Users className="size-4" />
            </div>
          </div>
        </div>

        {/* Stat 2: Full Teams */}
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
                {t("stats.fullTeams")}
              </p>
              <div className="flex items-center gap-2">
                <h4 className="text-2xl font-medium">36</h4>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  (75%)
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("stats.analyticsSub")}
              </p>
            </div>
            <div className="flex size-9.5 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
        </div>

        {/* Stat 3: Submissions */}
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
                {t("stats.submissions")}
              </p>
              <div className="flex items-center gap-2">
                <h4 className="text-2xl font-medium">29</h4>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  (60%)
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("stats.analyticsSub")}
              </p>
            </div>
            <div className="flex size-9.5 items-center justify-center rounded-md bg-sky-500/10 text-sky-500">
              <FolderGit2 className="size-4" />
            </div>
          </div>
        </div>

        {/* Stat 4: Mentored Teams */}
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
                {t("stats.mentoredTeams")}
              </p>
              <div className="flex items-center gap-2">
                <h4 className="text-2xl font-medium">41</h4>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  (85%)
                </p>
              </div>
              <p className="text-muted-foreground text-xs">
                {t("stats.analyticsSub")}
              </p>
            </div>
            <div className="flex size-9.5 items-center justify-center rounded-md bg-purple-500/10 text-purple-500">
              <Compass className="size-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Teams Table Card */}
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
                {/* Filter 1: Track */}
                <div className="flex w-full flex-col gap-2">
                  <label
                    data-slot="label"
                    htmlFor="filter-team-track"
                    className="flex items-center gap-2 text-sm leading-none font-medium select-none"
                  >
                    {t("filters.track")}
                  </label>
                  <Select
                    value={selectedTrack}
                    onValueChange={(val) => {
                      if (val) setSelectedTrack(val)
                    }}
                  >
                    <SelectTrigger id="filter-team-track" className="w-full">
                      <SelectValue placeholder={t("filters.track")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("filters.all")}</SelectItem>
                      <SelectItem value="earthScience">{t("filters.earthScience")}</SelectItem>
                      <SelectItem value="spaceDebris">{t("filters.spaceDebris")}</SelectItem>
                      <SelectItem value="astrophysics">{t("filters.astrophysics")}</SelectItem>
                      <SelectItem value="solarPhysics">{t("filters.solarPhysics")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter 2: Team Roster Status */}
                <div className="flex w-full flex-col gap-2">
                  <label
                    data-slot="label"
                    htmlFor="filter-team-roster"
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
                    <SelectTrigger id="filter-team-roster" className="w-full">
                      <SelectValue placeholder={t("filters.status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("filters.all")}</SelectItem>
                      <SelectItem value="full">{t("filters.full")}</SelectItem>
                      <SelectItem value="open">{t("filters.open")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Filter 3: Submission Status */}
                <div className="flex w-full flex-col gap-2">
                  <label
                    data-slot="label"
                    htmlFor="filter-team-submission"
                    className="flex items-center gap-2 text-sm leading-none font-medium select-none"
                  >
                    {t("filters.submission")}
                  </label>
                  <Select
                    value={selectedSubmission}
                    onValueChange={(val) => {
                      if (val) setSelectedSubmission(val)
                    }}
                  >
                    <SelectTrigger id="filter-team-submission" className="w-full">
                      <SelectValue placeholder={t("filters.submission")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("filters.all")}</SelectItem>
                      <SelectItem value="submitted">{t("filters.submitted")}</SelectItem>
                      <SelectItem value="draft">{t("filters.draft")}</SelectItem>
                      <SelectItem value="notStarted">{t("filters.notStarted")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Actions & Search Row */}
            <div className="flex gap-4 p-6 max-sm:flex-col sm:items-center sm:justify-between">
              {/* Search team */}
              <div className="w-full max-w-xs">
                <label htmlFor="search-team" className="sr-only">
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
                    id="search-team"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("searchPlaceholder")}
                    className="border-input placeholder:text-muted-foreground h-9 w-full min-w-0 px-2 py-1 text-sm bg-transparent outline-none border-0 shadow-none ring-0 focus:ring-0 focus-visible:ring-0"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary border-transparent h-9 gap-1.5 px-2.5 cursor-pointer shadow-xs"
                >
                  <Upload className="size-4" />
                  <span className="max-lg:hidden">{t("export")}</span>
                </Button>

                <Button
                  type="button"
                  className="bg-primary text-primary-foreground hover:bg-primary/80 h-9 gap-1.5 px-2.5 cursor-pointer shadow-xs"
                >
                  <Plus className="size-4" />
                  <span className="max-lg:hidden">{t("addNewTeam")}</span>
                </Button>
              </div>
            </div>

            {/* Teams Table */}
            <div data-slot="table-container" className="relative w-full overflow-x-auto">
              <table data-slot="table" className="w-full caption-bottom text-sm border-t">
                <thead data-slot="table-header" className="[&_tr]:border-b">
                  <tr
                    data-slot="table-row"
                    className="hover:bg-muted/50 border-b transition-colors h-14"
                  >
                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground ps-4 w-12.5"
                    >
                      <input
                        type="checkbox"
                        checked={
                          selectedRows.size === filteredTeams.length &&
                          filteredTeams.length > 0
                        }
                        onChange={toggleSelectAll}
                        aria-label="Select all teams"
                        className="size-4 rounded-sm border-input text-primary focus:ring-primary cursor-pointer accent-primary"
                      />
                    </th>

                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground min-w-[220px]"
                    >
                      {t("columns.team")}
                    </th>

                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground min-w-[200px]"
                    >
                      {t("columns.leader")}
                    </th>

                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground w-[120px]"
                    >
                      {t("columns.members")}
                    </th>

                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground min-w-[180px]"
                    >
                      {t("columns.track")}
                    </th>

                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground min-w-[170px]"
                    >
                      {t("columns.mentor")}
                    </th>

                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-muted-foreground w-[140px]"
                    >
                      {t("columns.submission")}
                    </th>

                    <th
                      data-slot="table-head"
                      className="h-10 px-2 text-center align-middle font-medium whitespace-nowrap text-muted-foreground pe-4 w-[130px]"
                    >
                      {t("columns.actions")}
                    </th>
                  </tr>
                </thead>

                <tbody data-slot="table-body" className="[&_tr:last-child]:border-0">
                  {filteredTeams.map((team) => {
                    const isSelected = selectedRows.has(team.id)
                    const leaderInitials = team.leader.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)

                    return (
                      <tr
                        key={team.id}
                        data-slot="table-row"
                        data-state={isSelected ? "selected" : "false"}
                        className={`hover:bg-muted/50 border-b transition-colors h-14 ${
                          isSelected ? "bg-muted/40" : ""
                        }`}
                      >
                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap ps-4 w-12.5"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(team.id)}
                            aria-label={`Select team ${team.name}`}
                            className="size-4 rounded-sm border-input text-primary focus:ring-primary cursor-pointer accent-primary"
                          />
                        </td>

                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">
                              {team.name}
                            </span>
                            <span className="text-muted-foreground text-[11px]">
                              {team.updatedAt}
                            </span>
                          </div>
                        </td>

                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8">
                              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                {leaderInitials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground text-xs sm:text-sm">
                                {team.leader.name}
                              </span>
                              <span className="text-muted-foreground text-[11px]">
                                {team.leader.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap"
                        >
                          <span
                            className={`inline-flex items-center gap-1 font-semibold text-xs px-2 py-0.5 rounded-full ${
                              team.membersCount === team.maxMembers
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            <Users className="size-3" />
                            <span>
                              {team.membersCount}/{team.maxMembers}
                            </span>
                          </span>
                        </td>

                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap"
                        >
                          {getTrackBadge(team.track)}
                        </td>

                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap text-xs text-muted-foreground"
                        >
                          <span className="font-medium text-foreground">
                            {team.mentor}
                          </span>
                        </td>

                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap"
                        >
                          {getSubmissionBadge(team.submission)}
                        </td>

                        <td
                          data-slot="table-cell"
                          className="p-2 align-middle whitespace-nowrap pe-4 text-center"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    type="button"
                                    aria-label={t("actions.view")}
                                    className="size-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  />
                                }
                              >
                                <Eye className="size-4" />
                              </TooltipTrigger>
                              <TooltipContent>{t("actions.view")}</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <button
                                    type="button"
                                    aria-label={t("actions.assignMentor")}
                                    className="size-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                  />
                                }
                              >
                                <UserPlus className="size-4" />
                              </TooltipTrigger>
                              <TooltipContent>{t("actions.assignMentor")}</TooltipContent>
                            </Tooltip>

                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <button
                                    type="button"
                                    aria-label="More"
                                    className="size-8 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                  />
                                }
                              >
                                <MoreVertical className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align={isRtl ? "start" : "end"}>
                                <DropdownMenuItem className="cursor-pointer text-xs">
                                  {t("actions.view")}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer text-xs">
                                  {t("actions.assignMentor")}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer text-destructive text-xs">
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
                start: filteredTeams.length > 0 ? 1 : 0,
                end: filteredTeams.length,
                total: 48,
              })}
            </p>

            <nav
              role="navigation"
              aria-label="pagination"
              className="mx-auto flex w-full justify-center sm:justify-end"
            >
              <ul className="flex items-center gap-1">
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

                <li>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    className="size-9 inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow-xs cursor-pointer"
                  >
                    1
                  </button>
                </li>

                <li>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(2)}
                    className="size-9 inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    2
                  </button>
                </li>

                <li>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    className="h-9 gap-1.5 px-2.5 text-sm cursor-pointer"
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
