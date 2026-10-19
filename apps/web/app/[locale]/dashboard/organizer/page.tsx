import { RoleGuard } from "@/components/role-guard"
import { OrganizerOverview } from "@/components/account/organizer-overview"
export default function Page() {
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <OrganizerOverview />
    </RoleGuard>
  )
}
