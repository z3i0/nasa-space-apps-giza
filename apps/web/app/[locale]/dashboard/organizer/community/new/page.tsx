import { RoleGuard } from "@/components/role-guard"
import { CreateQuestionForm } from "@/components/community/create-question-form"

export default function OrganizerCreateQuestionPage() {
  return (
    <RoleGuard allowedRoles={["organizer", "competition"]}>
      <CreateQuestionForm basePath="/dashboard/organizer/community" />
    </RoleGuard>
  )
}
