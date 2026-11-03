import { RoleGuard } from "@/components/role-guard"
import { PostThread } from "@/components/community/post-thread"

export default async function ParticipantPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <RoleGuard allowedRoles={["participant", "mentor", "organizer", "competition", "judge"]}>
      <PostThread postId={id} baseRoute="/dashboard/participant/community?tab=feed" />
    </RoleGuard>
  )
}
