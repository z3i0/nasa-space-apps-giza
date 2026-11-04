import { RoleGuard } from "@/components/role-guard"
import { OrganizerParticipantsView } from "@/components/dashboard/organizer-participants-view"

export default function Page() {
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <OrganizerParticipantsView />
    </RoleGuard>
  )
}
