import { RoleGuard } from "@/components/role-guard"
import { MentorWorkspace } from "@/components/mentorship/mentor-workspace"

export default function MentorProfilePage() {
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <MentorWorkspace view="profile" />
    </RoleGuard>
  )
}
