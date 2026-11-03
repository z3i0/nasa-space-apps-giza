import { RoleGuard } from "@/components/role-guard"
import { CommunityHub } from "@/components/community/community-hub"

export default function OrganizerCommunityPage() {
  return (
    <RoleGuard allowedRoles={["organizer", "competition"]}>
      <CommunityHub basePath="/dashboard/organizer/community" />
    </RoleGuard>
  )
}
