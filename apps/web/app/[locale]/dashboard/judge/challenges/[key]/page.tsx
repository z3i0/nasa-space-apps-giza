import { RoleGuard } from "@/components/role-guard"
import { ChallengeDetail } from "@/components/challenges/challenge-detail"
export default async function ChallengePage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const { key } = await params
  return (
    <RoleGuard allowedRoles={["judge"]}>
      <ChallengeDetail key={key} challengeKey={key} role="judge" />
    </RoleGuard>
  )
}
