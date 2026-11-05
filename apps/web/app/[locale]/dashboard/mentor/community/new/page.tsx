import { RoleGuard } from "@/components/role-guard"
import { CreateQuestionForm } from "@/components/community/create-question-form"

export default function MentorCreateQuestionPage() {
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <CreateQuestionForm basePath="/dashboard/mentor/community" />
    </RoleGuard>
  )
}

