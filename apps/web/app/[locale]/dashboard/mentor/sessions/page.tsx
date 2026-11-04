import { RoleGuard } from "@/components/role-guard"
import { MentorWorkspace } from "@/components/mentorship/mentor-workspace"

export default function MentorSessionsPage() {
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <MentorWorkspace view="sessions" />
    </RoleGuard>
  )
}
