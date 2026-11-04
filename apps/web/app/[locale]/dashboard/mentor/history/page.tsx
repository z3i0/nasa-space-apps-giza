import { RoleGuard } from "@/components/role-guard"
import { MentorWorkspace } from "@/components/mentorship/mentor-workspace"

export default function MentorHistoryPage() {
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <MentorWorkspace view="history" />
    </RoleGuard>
  )
}
