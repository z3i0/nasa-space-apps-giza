import { ParticipantProfilePage } from "@/components/profile/participant-profile"
import { RoleGuard } from "@/components/role-guard"

export default function JudgeProfilePage() {
  return (
    <RoleGuard allowedRoles={["judge"]}>
      <ParticipantProfilePage />
    </RoleGuard>
  )
}
