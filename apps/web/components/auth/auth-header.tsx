import { ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/routing"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Logo } from "@/components/logo"
import styles from "./auth-layout.module.css"

export function AuthHeader({ backLabel }: { backLabel: string }) {
  const t = useTranslations("Home")
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label={t("brand")}>
        <Logo size="lg" />
        <span>
          SPACE APPS <span className={styles.brandLocation}>GIZA</span>
        </span>
      </Link>
      <div className={styles.headerActions}>
        <Link href="/" className={styles.homeLink} aria-label={backLabel}>
          <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
          <span>{backLabel}</span>
        </Link>
        <LanguageSwitcher variant="ghost" />
      </div>
    </header>
  )
}
