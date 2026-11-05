"use client"

import useSWR from "swr"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { requestTeams, teamErrorKey, type TeamContact } from "@/lib/teams"
import styles from "./team-workspace.module.css"

export function ContactNumber({ phone }: { phone?: string | null }) {
  const t = useTranslations("Teams")
  return (
    <p className={styles.contact}>
      <span>{t("contactNumber")}</span>
      {phone ? (
        <a href={`tel:${phone.replace(/[^+0-9]/g, "")}`} dir="ltr">
          {phone}
        </a>
      ) : (
        <span className={styles.muted}>{t("contactMissing")}</span>
      )}
    </p>
  )
}

export function LeaderContact({ teamId }: { teamId: string }) {
  const t = useTranslations("Teams")
  const {
    data: contact = null,
    error: swrError,
    mutate,
  } = useSWR<TeamContact>(
    teamId ? `/teams/${teamId}/leader` : null,
    () => requestTeams<TeamContact>(`/${teamId}/leader`),
    { revalidateOnFocus: true }
  )
  const error = swrError ? teamErrorKey(swrError) : ""
  return (
    <div className={styles.contactPanel}>
      <h3>{t("leaderContact")}</h3>
      {error ? (
        <div role="alert">
          <p>{t(error)}</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void mutate()}
          >
            {t("refresh")}
          </Button>
        </div>
      ) : contact ? (
        <>
          <strong>{contact.name}</strong>
          <ContactNumber phone={contact.phone} />
        </>
      ) : (
        <p role="status">{t("loadingContact")}</p>
      )}
    </div>
  )
}

export function ApplicantDetails({ user }: { user?: TeamContact }) {
  const t = useTranslations("Teams")
  const profile = user?.profile
  return (
    <div className={styles.application}>
      <ContactNumber phone={user?.phone} />
      {profile ? (
        <>
          <dl className={styles.profileFacts}>
            {(
              [
                "bio",
                "desiredRole",
                "experience",
                "institution",
                "academicLevel",
                "preferredChallenge",
              ] as const
            ).map((key) =>
              profile[key] ? (
                <div key={key}>
                  <dt>{t(`application.${key}`)}</dt>
                  <dd>{profile[key]}</dd>
                </div>
              ) : null
            )}
          </dl>
          {(["skills", "interests"] as const).map((key) => (
            <div key={key} className={styles.stack}>
              <h3>{t(`application.${key}`)}</h3>
              <div className={styles.tags}>
                {profile[key]?.length ? (
                  profile[key].map((value) => (
                    <span key={value} className="max-w-[200px] truncate inline-block" title={value}>
                      {value}
                    </span>
                  ))
                ) : (
                  <p className={styles.muted}>{t("notProvided")}</p>
                )}
              </div>
            </div>
          ))}
          <div className={styles.actions}>
            {(["githubUrl", "linkedinUrl", "portfolioUrl"] as const).map(
              (key) => {
                const url = profile[key]
                return url && /^https?:\/\//i.test(url) ? (
                  <a
                    className={styles.profileLink}
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t(`application.${key}`)}
                  </a>
                ) : null
              }
            )}
          </div>
        </>
      ) : (
        <p className={styles.muted}>{t("noProfileDetails")}</p>
      )}
    </div>
  )
}
