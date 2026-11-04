import { RoleGuard } from "@/components/role-guard"
import { MentorWorkspace } from "@/components/mentorship/mentor-workspace"

export default function MentorTeamsPage() {
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <MentorWorkspace view="teams" />
    </RoleGuard>
  )
}
