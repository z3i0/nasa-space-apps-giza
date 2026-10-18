import { ParticipantProfilePage } from "@/components/profile/participant-profile"
import { RoleGuard } from "@/components/role-guard"

export default function MentorProfilePage() {
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <ParticipantProfilePage />
    </RoleGuard>
  )
}
