import { RoleGuard } from "@/components/role-guard"
import { OrganizerExperts } from "@/components/account/organizer-experts"
export default function Page() {
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <OrganizerExperts kind="judges" />
    </RoleGuard>
  )
}
