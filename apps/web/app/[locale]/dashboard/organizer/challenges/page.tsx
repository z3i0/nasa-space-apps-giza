import { RoleGuard } from "@/components/role-guard"
import { ChallengeExplorer } from "@/components/challenges/challenge-explorer"
export default function ChallengesPage() {
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <ChallengeExplorer management />
    </RoleGuard>
  )
}
