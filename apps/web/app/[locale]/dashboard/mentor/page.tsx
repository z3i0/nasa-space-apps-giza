import { RoleGuard } from "@/components/role-guard"
import { MentorWorkspace } from "@/components/mentorship/mentor-workspace"

export default function MentorDashboard() {
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <MentorWorkspace view="overview" />
    </RoleGuard>
  )
}
