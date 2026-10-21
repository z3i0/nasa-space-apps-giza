import { RoleGuard } from "@/components/role-guard"
import { TeamSubmission } from "@/components/teams/team-submission"

export default function SubmissionPage() {
  return (
    <RoleGuard allowedRoles={["participant"]}>
      <TeamSubmission />
    </RoleGuard>
  )
}
