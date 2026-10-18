import { RoleGuard } from "@/components/role-guard"
import { TeamTasks } from "@/components/teams/team-tasks"

export default function TasksPage() {
  return <RoleGuard allowedRoles={["participant"]}><TeamTasks /></RoleGuard>
}
