import { RoleGuard } from "@/components/role-guard"
import { CreateQuestionForm } from "@/components/community/create-question-form"

export default function ParticipantCreateQuestionPage() {
  return (
    <RoleGuard allowedRoles={["participant", "mentor", "organizer", "competition", "judge"]}>
      <CreateQuestionForm basePath="/dashboard/participant/community" />
    </RoleGuard>
  )
}
