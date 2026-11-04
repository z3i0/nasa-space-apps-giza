import { RoleGuard } from "@/components/role-guard"
import { OrganizerJudgesView } from "@/components/dashboard/organizer-judges-view"

export default function Page() {
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <OrganizerJudgesView />
    </RoleGuard>
  )
}
