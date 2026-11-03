import { RoleGuard } from "@/components/role-guard"
import { OrganizerTeamsView } from "@/components/dashboard/organizer-teams-view"

export default function Page() {
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <OrganizerTeamsView />
    </RoleGuard>
  )
}
