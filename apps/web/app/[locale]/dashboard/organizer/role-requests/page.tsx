import { RoleGuard } from "@/components/role-guard"
import { RoleApplications } from "@/components/account/role-applications"
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ role?: string | string[] }>
}) {
  const initialRole = (await searchParams).role === "judge" ? "judge" : "mentor"
  return (
    <RoleGuard allowedRoles={["organizer"]}>
      <RoleApplications key={initialRole} initialRole={initialRole} />
    </RoleGuard>
  )
}
