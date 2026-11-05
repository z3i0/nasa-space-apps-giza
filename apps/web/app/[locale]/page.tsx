import Image from "next/image"
import localFont from "next/font/local"
import saturnImage from "@/public/space/saturn.png"
import meteorImage from "@/public/space/meteor.webp"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ArrowDown, ArrowUpLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Logo } from "@/components/logo"
import { MissionCard } from "@/components/landing/mission-card"
import { MissionTimeline } from "@/components/landing/mission-timeline"
import { MoonLanding } from "@/components/landing/moon-landing"
import { SpaceScene } from "@/components/landing/space-scene"
import { BackToTop } from "@/components/landing/back-to-top"
import { HomeAuthNav } from "@/components/landing/home-auth-nav"
import { AuthProvider } from "@/components/auth-provider"
import { getServerAuthUser } from "@/lib/auth-server"
import { Link } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import styles from "@/components/landing/landing.module.css"

const pinnacle = localFont({
  src: "../../public/fonts/pinnacle-extra-bold.woff2",
  variable: "--font-pinnacle",
  weight: "800",
  display: "swap",
})

const spaceRabbit = localFont({
  src: "../../public/fonts/space-rabbit.otf",
  variable: "--font-space-rabbit",
  weight: "400",
  display: "swap",
})

const planets = [
  { name: "saturn", node: "31:110", speed: 0.18, width: 759, height: 459 },
  { name: "earth", node: "31:108", speed: 0.12, width: 300, height: 303 },
  { name: "jupiter", node: "31:106", speed: 0.3, width: 366, height: 369 },
  { name: "neptune", node: "31:105", speed: 0.46, width: 598, height: 548 },
  { name: "meteor", node: "31:85", speed: 0.76, width: 216, height: 145 },
] as const

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("Home")
  const user = await getServerAuthUser()

  return (
    <AuthProvider initialUser={user}>
      <div
        id="top"
        className={cn(styles.landing, pinnacle.variable, spaceRabbit.variable)}
      >
        <a className={styles.skipLink} href="#mission">
          {t("skip")}
        </a>
        <header className={styles.header}>
          <Link href="/" className={styles.brand} aria-label={t("brand")}>
            <Logo size="lg" />
            <span>
              SPACE APPS <span className={styles.brandLocation}>GIZA</span>
            </span>
          </Link>
          <nav className={styles.nav} aria-label={t("navigation")}>
            <a className={styles.navMission} href="#mission">
              {t("about")}
            </a>
            <LanguageSwitcher className={styles.language} variant="ghost" />
            <HomeAuthNav />
          </nav>
        </header>
      <main>
        <SpaceScene>
          <div
            className={styles.backdrop}
            aria-hidden="true"
            data-node-id="31:114"
          >
            <Image
              src="/space/nebula.webp"
              alt=""
              fill
              sizes="100vw"
              className={styles.nebula}
              loading="eager"
            />
          </div>
          <div className={styles.planets} aria-hidden="true">
            {planets.map((planet) => (
              <div
                key={planet.name}
                className={cn(styles.planet, styles[planet.name])}
                data-depth={planet.speed}
                data-rotate={planet.name === "meteor" ? 0.16 : undefined}
                data-node-id={planet.node}
              >
                <div className={styles.entrance}>
                  <div className={styles.float}>
                    <Image
                      src={
                        planet.name === "saturn"
                          ? saturnImage
                          : planet.name === "meteor"
                            ? meteorImage
                            : `/space/${planet.name}.webp`
                      }
                      alt=""
                      width={planet.width}
                      height={planet.height}
                      sizes={
                        planet.name === "meteor"
                          ? "140px"
                          : planet.name === "saturn"
                            ? "(max-width: 700px) 48vw, (max-width: 1100px) 29vw, 470px"
                            : "(max-width: 700px) 220px, (max-width: 1100px) 280px, 505px"
                      }
                      loading="eager"
                      unoptimized={planet.name === "saturn"}
                      className={styles.planetImage}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>
              <span className={styles.signal} />
              {t("heroLabel")}
            </p>
            <h1 id="landing-title" className={styles.heroTitle} dir="ltr">
              <span className={styles.nasa}>NASA</span>
              <span className={styles.spaceApps}>Space Apps Challenge</span>
            </h1>
            <div className={styles.location} dir="ltr">
              <span />
              <p>GIZA, EGYPT</p>
              <span />
            </div>
            <p className={styles.heroDescription}>{t("heroDescription")}</p>
            <a
              href="#registration"
              className={cn(buttonVariants({ size: "lg" }), styles.primaryCta)}
            >
              {t("heroCta")}
              <ArrowUpLeft
                className={styles.ctaArrow}
                size={19}
                aria-hidden="true"
              />
            </a>
            <p className={styles.heroNote}>{t("heroNote")}</p>
          </div>
          <div
            className={styles.cockpit}
            aria-hidden="true"
            data-node-id="47:146"
          >
            <Image
              src="/space/cockpit.webp"
              alt=""
              width={2172}
              height={724}
              sizes="(max-width: 700px) 850px, 1100px"
              loading="eager"
              className={styles.cockpitImage}
            />
          </div>
          <a className={styles.scrollCue} href="#mission">
            <span>{t("scroll")}</span>
            <ArrowDown size={15} aria-hidden="true" />
          </a>
          <span className={styles.heroCoordinates} aria-hidden="true" dir="ltr">
            29.9792° N &nbsp; 31.1342° E
          </span>
        </SpaceScene>
        <MissionCard />
        <MissionTimeline />
        <MoonLanding />
      </main>
      <footer className={styles.footer}>
        <span>
          NASA SPACE APPS <b>GIZA</b>
        </span>
        <p>{t("footer")}</p>
        <BackToTop label={t("backToTop")} />
      </footer>
    </div>
  </AuthProvider>
  )
}
