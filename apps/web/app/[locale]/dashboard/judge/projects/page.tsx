import { RoleGuard } from "@/components/role-guard"
import { JudgingHub } from "@/components/judging/judging-hub"
export default function Page() {
  return (
    <RoleGuard allowedRoles={["judge"]}>
      <JudgingHub view="projects" />
    </RoleGuard>
  )
}
