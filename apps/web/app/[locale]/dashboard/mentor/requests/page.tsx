import { RoleGuard } from "@/components/role-guard"
import { MentorshipHub } from "@/components/mentorship/mentorship-hub"

export default function MentorRequestsPage() {
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <MentorshipHub role="mentor" />
    </RoleGuard>
  )
}
