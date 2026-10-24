import { RoleGuard } from "@/components/role-guard"
import { OrganizerOverview } from "@/components/account/organizer-overview"
import { getServerAuthUser } from "@/lib/auth-server"
import { getTranslations, setRequestLocale } from "next-intl/server"

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  const [user, t] = await Promise.all([
    getServerAuthUser(),
    getTranslations({ locale, namespace: "Dashboard.competitionRole" }),
  ])

  const isOnlyCompetition =
    (user?.roles?.includes("competition") || user?.role === "competition") &&
    !user?.roles?.includes("organizer") &&
    user?.role !== "organizer"

  return (
    <RoleGuard allowedRoles={["organizer", "competition"]}>
      {isOnlyCompetition ? (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("title")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
        </div>
      ) : (
        <OrganizerOverview />
      )}
    </RoleGuard>
  )
}

