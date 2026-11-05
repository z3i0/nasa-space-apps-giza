"use client"

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import Image from "next/image"
import { useLocale, useTranslations } from "next-intl"
import { ArrowLeft, ArrowRight, ArrowUpRight, Radio } from "lucide-react"
import {
  missions,
  difficultyTranslations,
  subjectTranslations,
  type Mission,
} from "./mission-data"
import { MissionOrbitals } from "./mission-orbitals"
import landing from "./landing.module.css"
import styles from "./mission-deck.module.css"

const number = (value: number) => String(value).padStart(2, "0")

function DeckCard({
  mission,
  index,
  briefing,
  explore,
  locale,
}: {
  mission: Mission
  index: number
  briefing: ReactNode
  explore: () => void
  locale: string
}) {
  const t = useTranslations("Home.deck")
  const isAr = locale === "ar"

  if (mission.kind === "briefing") {
    return (
      <div className={styles.briefing}>
        {briefing}
        <button className={styles.explore} onClick={explore}>
          {t("explore")} <ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    )
  }

  const title = isAr && mission.titleAr ? mission.titleAr : mission.title
  const summary =
    isAr && mission.summaryAr ? mission.summaryAr : mission.summary
  const label = isAr && mission.labelAr ? mission.labelAr : mission.label
  const difficulty = isAr
    ? mission.difficulty.map((level) => difficultyTranslations[level] || level)
    : mission.difficulty
  const subjects = isAr
    ? mission.subjects.map((subject) => subjectTranslations[subject] || subject)
    : mission.subjects

  const missionHeaderTitle = isAr
    ? `المهمة ${number(index + 1)} · ${label}`
    : `MISSION ${number(index + 1)} · ${label}`

  const footerArchiveStamp = isAr
    ? `الجيزة / ${number(index + 1)}`
    : `GZA / ${number(index + 1)}`

  const footerArchiveLabel = isAr ? "— أرشيف المهمة" : "— MISSION ARCHIVE"

  return (
    <div className={styles.challenge}>
      <div className={styles.corners} aria-hidden="true" />
      <header className={styles.fileHeader}>
        <span lang={isAr ? "ar" : "en"} dir={isAr ? "rtl" : "ltr"}>
          {missionHeaderTitle}
        </span>
        <span className={styles.fileStatus}>
          <i />
          {t("status")}
        </span>
      </header>
      <div
        className={styles.fileBody}
        lang={isAr ? "ar" : "en"}
        dir={isAr ? "rtl" : "ltr"}
      >
        <div className={styles.fileIndex} aria-hidden="true">
          <span>{number(index + 1)}</span>
          <div>
            <span>{isAr ? "ناسا سبيس آبس" : "NASA SPACE APPS"}</span>
            <span>
              {isAr ? "أرشيف التحديات / ٢٠٢٦" : "CHALLENGE ARCHIVE / 2026"}
            </span>
          </div>
        </div>
        <h3 id={`mission-${mission.id}`}>{title}</h3>
        <p className={styles.summary}>{summary}</p>
        <div className={styles.metadata}>
          <div>
            <p className={styles.metaLabel}>{t("difficulty")}</p>
            <ul className={styles.badges}>
              {difficulty.map((level) => (
                <li key={level}>{level}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className={styles.metaLabel}>{t("subjects")}</p>
            <ul className={styles.subjects}>
              {subjects.map((subject) => (
                <li key={subject}>{subject}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <footer className={styles.fileFooter}>
        <span dir={isAr ? "rtl" : "ltr"} aria-hidden="true">
          {footerArchiveStamp} <span>{footerArchiveLabel}</span>
        </span>
        <a
          href={mission.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${t("view")}: ${title} (${t("external")})`}
        >
          {t("view")} <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </footer>
    </div>
  )
}

export function MissionDeck({ briefing }: { briefing: ReactNode }) {
  const t = useTranslations("Home.deck")
  const home = useTranslations("Home")
  const locale = useLocale()
  const rtl = locale === "ar"
  const viewport = useRef<HTMLDivElement>(null)
  const slides = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)
  const [height, setHeight] = useState<number>()
  const requested = useRef(0)
  const scrolling = useRef(false)
  const activeMission = missions[active]

  useEffect(() => {
    const compact = window.matchMedia(
      "(max-width: 1100px), (max-height: 740px)"
    )
    const updateBenefits = () => {
      viewport.current
        ?.querySelectorAll<HTMLDetailsElement>("[data-mission-benefit]")
        .forEach((detail) => {
          detail.open = !compact.matches
        })
    }
    updateBenefits()
    compact.addEventListener("change", updateBenefits)
    return () => compact.removeEventListener("change", updateBenefits)
  }, [])

  function navigate(index: number) {
    const next = Math.max(0, Math.min(missions.length - 1, index))
    const track = viewport.current
    const slide = slides.current[next]
    if (!track || !slide) return
    // Keep focus out of a slide that is about to become inert.
    if (slides.current[active]?.contains(document.activeElement))
      track.focus({ preventScroll: true })
    requested.current = next
    scrolling.current = true
    const rect = slide.getBoundingClientRect()
    const container = track.getBoundingClientRect()
    track.scrollTo({
      left:
        track.scrollLeft +
        rect.left +
        rect.width / 2 -
        container.left -
        container.width / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    })
  }

  useEffect(() => {
    const track = viewport.current
    if (!track) return
    let width = track.clientWidth
    let frame = 0
    let timer: ReturnType<typeof setTimeout>
    const update = () => {
      const rect = track.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      let nearest = 0
      let distance = Infinity
      slides.current.forEach((slide, index) => {
        if (!slide) return
        const bounds = slide.getBoundingClientRect()
        const delta = Math.abs(bounds.left + bounds.width / 2 - center)
        if (delta < distance) {
          distance = delta
          nearest = index
        }
      })
      const focusedSlide = slides.current.findIndex((slide) =>
        slide?.contains(document.activeElement)
      )
      if (focusedSlide !== -1 && focusedSlide !== nearest)
        track.focus({ preventScroll: true })
      setActive(nearest)
      if (!scrolling.current) requested.current = nearest
    }
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
      clearTimeout(timer)
      timer = setTimeout(() => {
        scrolling.current = false
        update()
      }, 150)
    }
    track.addEventListener("scroll", onScroll, { passive: true })
    const resize = new ResizeObserver(() => {
      if (track.clientWidth === width) return
      width = track.clientWidth
      // Recenter after resizing without moving the surrounding page.
      const slide = slides.current[requested.current]
      if (!slide) return
      const rect = slide.getBoundingClientRect()
      const bounds = track.getBoundingClientRect()
      track.scrollTo({
        left:
          track.scrollLeft +
          rect.left +
          rect.width / 2 -
          bounds.left -
          bounds.width / 2,
        behavior: "instant",
      })
    })
    resize.observe(track)
    return () => {
      track.removeEventListener("scroll", onScroll)
      resize.disconnect()
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const slide = slides.current[active]
    if (!slide) return
    const resize = new ResizeObserver(() =>
      setHeight(slide.getBoundingClientRect().height)
    )
    resize.observe(slide)
    return () => resize.disconnect()
  }, [active])

  return (
    <section
      id="mission"
      className={styles.deck}
      aria-labelledby="mission-title"
      style={{ "--mission-accent": activeMission.accent } as CSSProperties}
    >
      {/* Interactive orbital background */}
      <MissionOrbitals />
      {/* Large decorative spaceship */}
      <div className={styles.shipWrap} aria-hidden="true">
        <Image
          src="/space/spaceship.webp"
          alt=""
          width={160}
          height={248}
          className={styles.shipHero}
          sizes="(max-width: 700px) 120px, 260px"
        />
      </div>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>
          <Radio size={14} aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <h2 id="mission-title">{t("title")}</h2>
        <p>{t("description")}</p>
      </header>
      <div className={styles.controls}>
        <p id="deck-instructions">{t("instructions")}</p>
        <div className={styles.controlGroup}>
          <button
            aria-label={t("previous")}
            disabled={active === 0}
            onClick={() => navigate(requested.current - 1)}
          >
            {rtl ? <ArrowRight size={19} /> : <ArrowLeft size={19} />}
          </button>
          <span className={styles.counter} dir="ltr">
            <b>{number(active + 1)}</b> / {number(missions.length)}
          </span>
          <button
            aria-label={t("next")}
            disabled={active === missions.length - 1}
            onClick={() => navigate(requested.current + 1)}
          >
            {rtl ? <ArrowLeft size={19} /> : <ArrowRight size={19} />}
          </button>
        </div>
      </div>
      <div
        ref={viewport}
        className={styles.viewport}
        style={{ height: height ? height + 4 : undefined }}
        role="region"
        aria-roledescription="carousel"
        aria-label={t("navigation")}
        aria-describedby="deck-instructions"
        tabIndex={0}
        onPointerDown={() => {
          scrolling.current = false
        }}
        onKeyDown={(event) => {
          if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
            return
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault()
            navigate(
              requested.current +
                ((event.key === "ArrowRight") !== rtl ? 1 : -1)
            )
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault()
            navigate(event.key === "Home" ? 0 : missions.length - 1)
          }
        }}
      >
        {missions.map((mission, index) => (
          <article
            key={mission.id}
            ref={(node) => {
              slides.current[index] = node
            }}
            className={styles.slide}
            role="group"
            aria-roledescription="slide"
            aria-label={t("slide", {
              current: index + 1,
              total: missions.length,
              title: rtl && mission.titleAr ? mission.titleAr : mission.title,
            })}
            aria-hidden={index !== active}
            inert={index !== active}
            data-active={index === active}
            style={{ "--mission-accent": mission.accent } as CSSProperties}
          >
            <DeckCard
              mission={mission}
              index={index}
              briefing={briefing}
              explore={() => navigate(1)}
              locale={locale}
            />
          </article>
        ))}
      </div>
      <nav className={styles.progress} aria-label={t("navigation")}>
        {missions.map((mission, index) => (
          <button
            key={mission.id}
            aria-label={t("select", {
              number: index + 1,
              title: rtl && mission.titleAr ? mission.titleAr : mission.title,
            })}
            aria-current={index === active ? "step" : undefined}
            onClick={() => navigate(index)}
          >
            <span />
          </button>
        ))}
      </nav>
      <p
        className={styles.announcement}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {t("slide", {
          current: active + 1,
          total: missions.length,
          title:
            rtl && activeMission.titleAr
              ? activeMission.titleAr
              : activeMission.title,
        })}
      </p>
      <p className={landing.missionCaption}>
        {home("openToEveryone")}
        <span aria-hidden="true"> / </span>
        {home("onePlanet")}
      </p>
    </section>
  )
}
