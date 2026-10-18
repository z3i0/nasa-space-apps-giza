import { getServerMyTeam } from "@/lib/teams-server"
import { MyTeamClient } from "@/components/teams/my-team-client"

export default async function MyTeamPage() {
  const { team } = await getServerMyTeam()
  return <MyTeamClient initialTeam={team} />
}
