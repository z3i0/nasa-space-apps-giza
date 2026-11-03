import { RoleGuard } from "@/components/role-guard"
import { CreatePostForm } from "@/components/community/create-post-form"

export default function ParticipantCreatePostPage() {
  return (
    <RoleGuard allowedRoles={["participant", "mentor", "organizer", "competition", "judge"]}>
      <CreatePostForm basePath="/dashboard/participant/community" />
    </RoleGuard>
  )
}
