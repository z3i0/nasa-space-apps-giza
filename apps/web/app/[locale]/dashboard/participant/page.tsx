import { RoleGuard } from "@/components/role-guard"
import { ParticipantOverview } from "@/components/account/participant-overview"
export default function Page() {
  return (
    <RoleGuard allowedRoles={["participant"]}>
      <ParticipantOverview />
    </RoleGuard>
  )
}
