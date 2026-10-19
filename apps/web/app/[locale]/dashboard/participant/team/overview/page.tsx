import { getServerMyTeam } from "@/lib/teams-server"
import { MyTeamClient } from "@/components/teams/my-team-client"
import { RoleGuard } from "@/components/role-guard"

export default async function MyTeamPage() {
  const { team } = await getServerMyTeam()
  return <RoleGuard allowedRoles={["participant"]}><MyTeamClient initialTeam={team} /></RoleGuard>
}
