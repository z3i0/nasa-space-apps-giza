import { RoleGuard } from "@/components/role-guard"
import { JudgingHub } from "@/components/judging/judging-hub"
export default function Page() {
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <JudgingHub organizer />
    </RoleGuard>
  )
}
