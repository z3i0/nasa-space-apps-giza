"use client"
import { OrganizerDirectory } from "@/components/account/organizer-directory"
export type HackathonRole =
  "organizer" | "team_leader" | "participant" | "mentor" | "judge"
export function UsersManagementTable() {
  return <OrganizerDirectory kind="participants" />
}
