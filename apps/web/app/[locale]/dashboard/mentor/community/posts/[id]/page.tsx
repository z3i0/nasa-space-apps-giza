import { RoleGuard } from "@/components/role-guard"
import { PostThread } from "@/components/community/post-thread"

export default async function MentorPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <PostThread postId={id} baseRoute="/dashboard/mentor/community?tab=feed" />
    </RoleGuard>
  )
}

