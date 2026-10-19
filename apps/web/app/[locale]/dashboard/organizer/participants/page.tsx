import { RoleGuard } from "@/components/role-guard"
import { OrganizerDirectory } from "@/components/account/organizer-directory"
export default function Page() {
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <OrganizerDirectory kind="participants" />
    </RoleGuard>
  )
}
