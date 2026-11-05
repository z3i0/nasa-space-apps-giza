import { RoleGuard } from "@/components/role-guard"
import { CommunityHub } from "@/components/community/community-hub"

export default function MentorCommunityPage() {
  return (
    <RoleGuard allowedRoles={["mentor"]}>
      <CommunityHub basePath="/dashboard/mentor/community" />
    </RoleGuard>
  )
}

