import { getServerTeamById, getServerMyTeam } from "@/lib/teams-server"
import { SpecificTeamClient } from "@/components/teams/specific-team-client"

export default async function SpecificTeamPage(props: {
  params: Promise<{ teamId: string }>
}) {
  const { teamId } = await props.params
  const [team, myTeamData] = await Promise.all([
    getServerTeamById(teamId),
    getServerMyTeam(),
  ])

  return (
    <SpecificTeamClient
      teamId={teamId}
      initialTeam={team}
      initialMyTeam={myTeamData.team}
    />
  )
}
