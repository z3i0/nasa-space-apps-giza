import { RoleGuard } from "@/components/role-guard"
import { RequestsTrackingConsole } from "@/components/account/requests-tracking-console"

export default function RequestsTrackingPage() {
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <RequestsTrackingConsole />
    </RoleGuard>
  )
}
