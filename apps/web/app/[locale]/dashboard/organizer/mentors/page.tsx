import { RoleGuard } from "@/components/role-guard"
import { OrganizerMentorsView } from "@/components/dashboard/organizer-mentors-view"

export default function Page() {
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <OrganizerMentorsView />
    </RoleGuard>
  )
}
