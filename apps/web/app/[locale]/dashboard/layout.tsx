import { DashboardLayoutClient } from "@/components/dashboard/dashboard-layout-client"
import { getServerAuthUser } from "@/lib/auth-server"
import { AuthProvider } from "@/components/auth-provider"
import localFont from "next/font/local"

const dashboardInter = localFont({
  src: "../../../public/dashboard/fonts/inter.woff2",
  variable: "--font-dashboard-body",
  weight: "100 900",
  display: "swap",
  // Figma's font export is browser-compatible but its metrics are not supported
  // by Turbopack's fallback parser. Keep the original font; skip metric synthesis.
  adjustFontFallback: false,
})

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerAuthUser()

  return (
    <AuthProvider initialUser={user}>
      <DashboardLayoutClient
        initialUser={user}
        fontClassName={dashboardInter.variable}
      >
        {children}
      </DashboardLayoutClient>
    </AuthProvider>
  )
}
