import { RoleGuard } from "@/components/role-guard"
import { QuestionThread } from "@/components/community/question-thread"

export default async function MentorQuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <QuestionThread questionId={id} baseRoute="/dashboard/mentor/community" />
    </RoleGuard>
  )
}

