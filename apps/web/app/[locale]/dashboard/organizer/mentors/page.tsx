import { RoleGuard } from "@/components/role-guard"
import { RoleApplications } from "@/components/account/role-applications"
export default function Page() {
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <RoleApplications role="mentor" />
    </RoleGuard>
  )
}
