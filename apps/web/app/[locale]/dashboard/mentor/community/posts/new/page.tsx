import { RoleGuard } from "@/components/role-guard"
import { CreatePostForm } from "@/components/community/create-post-form"

export default function MentorCreatePostPage() {
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <CreatePostForm basePath="/dashboard/mentor/community" />
    </RoleGuard>
  )
}

