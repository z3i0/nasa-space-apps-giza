import { ParticipantProfilePage } from "@/components/profile/participant-profile"
import { RoleGuard } from "@/components/role-guard"

export default function GenericProfilePage() {
  return (
    <RoleGuard allowedRoles={["participant", "mentor", "judge", "organizer", "admin"]}>
      <ParticipantProfilePage />
    </RoleGuard>
  )
}
