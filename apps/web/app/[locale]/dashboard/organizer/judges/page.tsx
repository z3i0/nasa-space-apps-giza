import { RoleGuard } from "@/components/role-guard"
import { JudgingHub } from "@/components/judging/judging-hub"
import { RoleApplications } from "@/components/account/role-applications"
export default function Page() {
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <div className="grid gap-8">
        <RoleApplications role="judge" />
        <JudgingHub organizer />
      </div>
    </RoleGuard>
  )
}
