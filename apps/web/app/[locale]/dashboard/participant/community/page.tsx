import { RoleGuard } from "@/components/role-guard"
import { CommunityHub } from "@/components/community/community-hub"

export default function ParticipantCommunityPage() {
  return (
    <RoleGuard allowedRoles={["participant", "mentor", "organizer", "competition", "judge"]}>
      <CommunityHub />
    </RoleGuard>
  )
}
