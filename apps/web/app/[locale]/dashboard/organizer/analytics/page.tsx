import { RoleGuard } from "@/components/role-guard"
import { CompetitionAnalyticsConsole } from "@/components/account/competition-analytics-console"

export default function CompetitionAnalyticsPage() {
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <CompetitionAnalyticsConsole />
    </RoleGuard>
  )
}
