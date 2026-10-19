import { RoleGuard } from "@/components/role-guard"
import { MentorshipHub } from "@/components/mentorship/mentorship-hub"

export default function ParticipantMentorshipPage() {
  return (
    <RoleGuard allowedRoles={["participant"]}>
      <MentorshipHub role="participant" />
    </RoleGuard>
  )
}
