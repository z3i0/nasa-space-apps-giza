import { RoleGuard } from "@/components/role-guard"
import { JudgingHub } from "@/components/judging/judging-hub"
export default async function Page({
  params,
}: {
  params: Promise<{ assignmentId: string }>
}) {
  const { assignmentId } = await params
  return (
    <RoleGuard allowedRoles={["judge"]}>
      <JudgingHub view="projects" assignmentId={assignmentId} />
    </RoleGuard>
  )
}
