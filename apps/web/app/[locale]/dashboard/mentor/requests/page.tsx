import { RoleGuard } from "@/components/role-guard"
import { MentorWorkspace } from "@/components/mentorship/mentor-workspace"

export default function MentorRequestsPage() {
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <MentorWorkspace view="requests" />
    </RoleGuard>
  )
}
