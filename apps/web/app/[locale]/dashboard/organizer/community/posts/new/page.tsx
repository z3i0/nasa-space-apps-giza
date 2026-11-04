import { RoleGuard } from "@/components/role-guard"
import { CreatePostForm } from "@/components/community/create-post-form"

export default function OrganizerCreatePostPage() {
  return (
    <RoleGuard allowedRoles={["organizer", "competition"]}>
      <CreatePostForm basePath="/dashboard/organizer/community" />
    </RoleGuard>
  )
}
