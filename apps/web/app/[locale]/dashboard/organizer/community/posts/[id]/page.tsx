import { RoleGuard } from "@/components/role-guard"
import { PostThread } from "@/components/community/post-thread"

export default async function OrganizerPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <RoleGuard allowedRoles={["organizer", "competition", "judge", "mentor"]}>
      <PostThread postId={id} baseRoute="/dashboard/organizer/community?tab=feed" />
    </RoleGuard>
  )
}
