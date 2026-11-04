import { RoleGuard } from "@/components/role-guard"
import { MentorWorkspace } from "@/components/mentorship/mentor-workspace"

export default function MentorPage() {
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <MentorWorkspace view="feedback" />
    </RoleGuard>
  )
}
