"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { Button } from "@/components/ui/button"
import type { Team } from "@/lib/teams"
import styles from "./team-workspace.module.css"

export function WorkShell({
  title,
  subtitle,
  team,
  loading,
  error,
  refresh,
  children,
}: {
  title: string
  subtitle: string
  team: Team | null
  loading: boolean
  error: string
  refresh: () => Promise<void>
  children: ReactNode
}) {
  const t = useTranslations("Teams")
  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>{team?.name || t("eyebrow")}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <Link className={styles.linkButton} href="/dashboard/participant/team">
          {t("title")}
        </Link>
      </header>
      {error && (
        <div className={styles.error} role="alert">
          <p>{t(error)}</p>
          {error === "sessionExpired" ? (
            <Link href="/login">{t("signIn")}</Link>
          ) : (
            <Button variant="secondary" onClick={refresh}>
              {t("refresh")}
            </Button>
          )}
        </div>
      )}
      {loading ? (
        <p role="status">{t("loading")}</p>
      ) : team ? (
        children
      ) : (
        !error && (
          <section className={styles.card}>
            <h2>{t("noTeam")}</h2>
            <p>{t("noTeamDescription")}</p>
            <Link
              className={styles.linkButton}
              href="/dashboard/participant/team"
            >
              {t("title")}
            </Link>
          </section>
        )
      )}
    </div>
  )
}
