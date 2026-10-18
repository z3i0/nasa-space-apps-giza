"use client"

import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { TeamContact } from "@/lib/teams"
import { ApplicantDetails } from "./participant-details"
import styles from "./team-workspace.module.css"

export function ApplicantRequest({
  user,
  message,
  children,
}: {
  user?: TeamContact
  message: string | null
  children: ReactNode
}) {
  const t = useTranslations("Teams")
  const name = user?.name || t("participant")
  const skills = user?.profile?.skills || []
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")

  return (
    <details className={styles.applicantRequest}>
      <summary className={styles.requestSummary}>
        <span className={styles.identity}>
          <Avatar size="lg">
            <AvatarImage src={user?.avatar || undefined} alt="" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className={styles.requestIdentity}>
            <strong>{name}</strong>
            <span className={styles.muted}>{t("requestPending")}</span>
          </span>
        </span>
        <span className={styles.tags} aria-label={t("application.skills")}>
          {skills.length ? (
            <>
              {skills.slice(0, 3).map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
              {skills.length > 3 && (
                <span>{t("moreSkills", { count: skills.length - 3 })}</span>
              )}
            </>
          ) : (
            <span>{t("noSkills")}</span>
          )}
        </span>
        <span className={styles.requestToggle}>
          <span className={styles.showDetails}>{t("viewApplication")}</span>
          <span className={styles.hideDetails}>{t("hideApplication")}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </span>
      </summary>
      <div className={styles.requestBody}>
        {message && (
          <div className={styles.requestMessage}>
            <h3>{t("applicantMessage")}</h3>
            <p className={styles.muted}>{message}</p>
          </div>
        )}
        <ApplicantDetails user={user} />
        {children}
      </div>
    </details>
  )
}
