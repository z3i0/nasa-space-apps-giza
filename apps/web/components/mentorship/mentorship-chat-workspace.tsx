"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Filter,
  MessageSquare,
  Search,
  Sparkles,
  Users,
} from "lucide-react"
import type { MentorshipRequest } from "@/lib/mentorship"
import { MentorshipChat } from "./mentorship-chat"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface MentorshipChatWorkspaceProps {
  requests: MentorshipRequest[]
  userId?: string
  role: "mentor" | "participant"
  selectedRequestId?: string | null
  onSelectRequest?: (id: string | null) => void
  className?: string
}

function getInitials(name?: string) {
  if (!name) return "U"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function MentorshipChatWorkspace({
  requests,
  userId,
  role,
  selectedRequestId,
  onSelectRequest,
  className,
}: MentorshipChatWorkspaceProps) {
  const t = useTranslations("Mentorship")
  const locale = useLocale()
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    selectedRequestId || requests[0]?.id || null
  )
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    if (selectedRequestId) {
      setInternalSelectedId(selectedRequestId)
    }
  }, [selectedRequestId])

  // Controlled or uncontrolled selected ID
  const activeId =
    selectedRequestId !== undefined && selectedRequestId !== null
      ? selectedRequestId
      : internalSelectedId

  const handleSelect = (id: string | null) => {
    setInternalSelectedId(id)
    onSelectRequest?.(id)
  }

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const partnerName = role === "mentor" ? req.team.name : req.mentor.name
      const matchesSearch =
        partnerName.toLowerCase().includes(search.toLowerCase()) ||
        req.topic.toLowerCase().includes(search.toLowerCase())

      if (!matchesSearch) return false

      if (statusFilter === "all") return true
      if (statusFilter === "active") return req.status === "accepted"
      if (statusFilter === "pending") return req.status === "pending"
      if (statusFilter === "completed") return req.status === "completed"
      return true
    })
  }, [requests, search, statusFilter, role])

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === activeId),
    [requests, activeId]
  )

  const formatListItemTime = (value: string) => {
    const date = new Date(value)
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
        timeStyle: "short",
        timeZone: "Africa/Cairo",
      }).format(date)
    }
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
      month: "short",
      day: "numeric",
      timeZone: "Africa/Cairo",
    }).format(date)
  }

  const BackIcon = locale === "ar" ? ArrowRight : ArrowLeft

  return (
    <div
      className={cn(
        "flex h-[calc(100dvh-13.5rem)] min-h-[520px] max-[760px]:h-[calc(100dvh-140px)] max-[760px]:min-h-[440px] w-full rounded-2xl max-[760px]:rounded-xl border border-border bg-card overflow-hidden shadow-xs",
        className
      )}
    >
      {/* Left Sidebar: Conversations list */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-96 shrink-0 border-e border-border flex flex-col bg-card/70 backdrop-blur-xs transition-all",
          activeId ? "hidden md:flex" : "flex"
        )}
      >
        {/* Search & Header */}
        <div className="p-3.5 border-b border-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <h3 className="font-semibold text-sm">{t("chatWorkspace")}</h3>
            </div>
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              {requests.length}
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("searchConversations")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 ps-8 text-xs bg-background/60"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
            {[
              { id: "all", label: t("allConversations") },
              { id: "active", label: t("activeConversations") },
              { id: "pending", label: t("pendingConversations") },
              { id: "completed", label: t("completedConversations") },
            ].map((f) => (
              <Button
                key={f.id}
                type="button"
                variant={statusFilter === f.id ? "default" : "ghost"}
                size="sm"
                className="h-6 px-2.5 text-[11px] rounded-full shrink-0 font-medium"
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/50 [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60 hover:[&::-webkit-scrollbar-thumb]:bg-border">
          {filteredRequests.length ? (
            filteredRequests.map((req) => {
              const partnerName =
                role === "mentor" ? req.team.name : req.mentor.name
              const partnerAvatar =
                role === "mentor" ? null : req.mentor.avatar
              const isSelected = req.id === activeId

              return (
                <button
                  key={req.id}
                  type="button"
                  onClick={() => handleSelect(req.id)}
                  className={cn(
                    "w-full text-start p-3.5 flex items-start gap-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:bg-muted/70",
                    isSelected
                      ? "bg-primary/10 border-s-4 border-primary dark:bg-primary/15"
                      : "border-s-4 border-transparent"
                  )}
                >
                  <Avatar className="size-10 shrink-0 border border-border shadow-2xs mt-0.5">
                    {partnerAvatar && (
                      <AvatarImage src={partnerAvatar} alt={partnerName} />
                    )}
                    <AvatarFallback className="bg-secondary text-xs font-medium">
                      {getInitials(partnerName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4 className="font-semibold text-sm truncate leading-tight text-foreground">
                        {partnerName}
                      </h4>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatListItemTime(req.updatedAt || req.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground truncate mb-1.5">
                      {req.topic}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant={
                          req.status === "accepted"
                            ? "default"
                            : req.status === "pending"
                              ? "outline"
                              : "secondary"
                        }
                        className="text-[10px] px-1.5 py-0 leading-tight"
                      >
                        {t(req.status)}
                      </Badge>

                      {req.slot && (
                        <span className="flex items-center gap-1 text-[10px] text-primary truncate">
                          <Clock className="size-2.5 shrink-0" />
                          <span>{t("booked")}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
              <Filter className="size-8 stroke-1 text-muted-foreground/60" />
              <p className="text-xs">{t("noRequests")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Area: Active Chat Window or Empty placeholder */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 bg-background/40 h-full min-h-0",
          !activeId ? "hidden md:flex" : "flex"
        )}
      >
        {selectedRequest ? (
          <div className="flex flex-col h-full min-h-0 w-full flex-1">
            {/* Mobile Header with back button */}
            <div className="flex md:hidden items-center gap-2 border-b border-border bg-card/60 px-3 py-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 px-2 text-xs"
                onClick={() => handleSelect(null)}
              >
                <BackIcon className="size-4" />
                <span>{t("backToConversations")}</span>
              </Button>
            </div>

            {/* Main Chat Box */}
            <MentorshipChat
              key={selectedRequest.id}
              requestId={selectedRequest.id}
              status={selectedRequest.status}
              userId={userId}
              partnerName={
                role === "mentor"
                  ? selectedRequest.team.name
                  : selectedRequest.mentor.name
              }
              partnerAvatar={
                role === "mentor" ? null : selectedRequest.mentor.avatar
              }
              partnerRole={
                role === "mentor"
                  ? `${t("workspace.pages.teams.title") || "Team"}`
                  : `${t("directory.mentorLabel") || "Mentor"}`
              }
              topic={selectedRequest.topic}
              fullHeight={true}
              showHeader={true}
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground gap-4">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
              <Sparkles className="size-8" />
            </div>
            <div className="max-w-sm space-y-1.5">
              <h3 className="font-semibold text-lg text-foreground">
                {t("selectConversation")}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("selectConversationDesc")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

