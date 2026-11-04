import { RoleGuard } from "@/components/role-guard"
import { QuestionThread } from "@/components/community/question-thread"

export default async function ParticipantQuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <RoleGuard allowedRoles={["participant", "mentor", "organizer", "competition", "judge"]}>
      <QuestionThread questionId={id} baseRoute="/dashboard/participant/community" />
    </RoleGuard>
  )
}
