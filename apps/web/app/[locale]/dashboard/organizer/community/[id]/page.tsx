import { RoleGuard } from "@/components/role-guard"
import { QuestionThread } from "@/components/community/question-thread"

export default async function OrganizerQuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <RoleGuard allowedRoles={["organizer", "competition"]}>
      <QuestionThread questionId={id} baseRoute="/dashboard/organizer/community" />
    </RoleGuard>
  )
}
