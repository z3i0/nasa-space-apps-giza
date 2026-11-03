"use client"

import { OrganizerParticipantsView } from "@/components/dashboard/organizer-participants-view"

export type HackathonRole =
  "organizer" | "team_leader" | "participant" | "mentor" | "judge"

export function UsersManagementTable() {
  return <OrganizerParticipantsView />
}
