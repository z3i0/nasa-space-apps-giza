import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client"
import { getServerAuthUser } from "@/lib/auth-server"
import { AuthProvider } from "@/components/auth-provider"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerAuthUser()

  return (
    <AuthProvider initialUser={user}>
      <DashboardLayoutClient initialUser={user}>{children}</DashboardLayoutClient>
    </AuthProvider>
  )
}
