"use client"

import Image from "next/image"
import { useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { useLocale, useTranslations } from "next-intl"
import { ArrowLeft, ArrowRight, Check, Compass } from "lucide-react"
import { timelinePhases, timelinePlanets } from "./timeline-data"
import styles from "./mission-timeline.module.css"

const count = (value: number) => String(value).padStart(2, "0")

export function MissionTimeline() {
  const t = useTranslations("Home.timeline")
  const rtl = useLocale() === "ar"
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState(1)
  const checkpoints = useRef<(HTMLButtonElement | null)[]>([])
  const touch = useRef<{ x: number; y: number } | null>(null)
  const phase = timelinePhases[active]

  function navigate(index: number, focus = false) {
    const next = Math.max(0, Math.min(timelinePhases.length - 1, index))
    if (next !== active) {
      setDirection(next > active ? 1 : -1)
      setActive(next)
    }
    if (focus) checkpoints.current[next]?.focus({ preventScroll: true })
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>, focus: boolean) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    let next: number
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      next = active + ((event.key === "ArrowRight") !== rtl ? 1 : -1)
    } else if (event.key === "Home" || event.key === "End") {
      next = event.key === "Home" ? 0 : timelinePhases.length - 1
    } else return
    event.preventDefault()
    navigate(next, focus)
  }

  return (
    <section
      id="timeline"
      className={styles.timeline}
      aria-labelledby="timeline-title"
      data-phase={phase.key}
      style={
        {
          "--timeline-accent": phase.accent,
          "--ship-position": `${12.5 + active * 25}%`,
          "--orbit-turn": `${active * -72}deg`,
          "--orbit-counter": `${active * 72}deg`,
          "--ship-facing": `${direction * (rtl ? -1 : 1) * 90}deg`,
        } as CSSProperties
      }
    >
      <div className={styles.atmosphere} aria-hidden="true" />
      <div className={styles.inner}>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>
            <Compass size={15} aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h2 id="timeline-title">{t("title")}</h2>
          <p>{t("description")}</p>
        </header>

        <div className={styles.route}>
          <div className={styles.connectors} aria-hidden="true">
            {timelinePhases.slice(1).map((item, index) => (
              <svg
                key={item.key}
                viewBox="0 0 200 40"
                preserveAspectRatio="none"
                data-complete={active > index}
              >
                <path className={styles.dots} d="M0 20 H200" />
                <path
                  className={styles.wave}
                  pathLength="1"
                  d="M0 20 C12 20 12 7 25 7 S38 33 50 33 S63 7 75 7 S88 33 100 33 S113 7 125 7 S138 33 150 33 S163 7 175 7 S188 20 200 20"
                />
              </svg>
            ))}
          </div>
          <div className={styles.ship} aria-hidden="true">
            <div className={styles.shipFlight} key={active}>
              <Image
                src="/space/spaceship.webp"
                alt=""
                width={160}
                height={248}
                sizes="64px"
                className={styles.shipImage}
              />
            </div>
          </div>
          <div
            className={styles.checkpoints}
            role="tablist"
            aria-label={t("navigation")}
            onKeyDown={(event) => onKeyDown(event, true)}
          >
            {timelinePhases.map((item, index) => (
              <button
                key={item.key}
                ref={(node) => {
                  checkpoints.current[index] = node
                }}
                type="button"
                role="tab"
                id={`timeline-tab-${item.key}`}
                aria-controls="timeline-panel"
                aria-selected={active === index}
                aria-label={t("select", {
                  number: item.number,
                  title: t(`phases.${item.key}.short`),
                })}
                tabIndex={active === index ? 0 : -1}
                data-complete={index < active}
                onClick={() => navigate(index)}
              >
                <span className={styles.marker}>
                  {index < active && <Check size={12} aria-hidden="true" />}
                  <span dir="ltr">{item.number}</span>
                </span>
                <span className={styles.checkpointLabel}>
                  {t(`phases.${item.key}.short`)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div
          id="timeline-panel"
          className={styles.panel}
          role="tabpanel"
          aria-labelledby={`timeline-tab-${phase.key}`}
          aria-describedby="timeline-instructions"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target === event.currentTarget) onKeyDown(event, false)
          }}
          onTouchStart={(event) => {
            if (
              event.touches.length !== 1 ||
              (event.target as HTMLElement).closest("button, a")
            ) {
              touch.current = null
              return
            }
            touch.current = {
              x: event.touches[0].clientX,
              y: event.touches[0].clientY,
            }
          }}
          onTouchMove={(event) => {
            if (!touch.current) return
            if (
              event.touches.length !== 1 ||
              Math.abs(event.touches[0].clientY - touch.current.y) > 35
            )
              touch.current = null
          }}
          onTouchCancel={() => {
            touch.current = null
          }}
          onTouchEnd={(event) => {
            const start = touch.current
            touch.current = null
            if (!start || !event.changedTouches.length) return
            const dx = event.changedTouches[0].clientX - start.x
            const dy = event.changedTouches[0].clientY - start.y
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2)
              navigate(active + (dx < 0 !== rtl ? 1 : -1))
          }}
        >
          <div className={styles.panelTop}>
            <span>
              <i />
              {t("briefing")}
            </span>
            <span dir="ltr">GZA / 2026</span>
          </div>
          <div className={styles.content} key={phase.key}>
            <p className={styles.phaseMeta}>
              <span>{t("phase", { number: phase.number })}</span>
              <span className={styles.metaDivider} aria-hidden="true" />
              <span>{t(`phases.${phase.key}.date`)}</span>
            </p>
            <h3>{t(`phases.${phase.key}.title`)}</h3>
            <p className={styles.summary}>
              {t(`phases.${phase.key}.description`)}
            </p>
            <ul className={styles.tags} aria-label={t("objectives")}>
              {["one", "two", "three"].map((tag) => (
                <li key={tag}>
                  <span aria-hidden="true" />
                  {t(`phases.${phase.key}.tags.${tag}`)}
                </li>
              ))}
            </ul>
          </div>
          <footer className={styles.panelFooter}>
            <button
              type="button"
              disabled={active === 0}
              onClick={() => navigate(active - 1)}
            >
              {rtl ? (
                <ArrowRight size={18} aria-hidden="true" />
              ) : (
                <ArrowLeft size={18} aria-hidden="true" />
              )}
              {t("previous")}
            </button>
            <span className={styles.counter} dir="ltr" aria-hidden="true">
              <b>{count(active + 1)}</b>
              <span>/</span>
              {count(timelinePhases.length)}
            </span>
            <button
              type="button"
              disabled={active === timelinePhases.length - 1}
              onClick={() => navigate(active + 1)}
            >
              {t("next")}
              {rtl ? (
                <ArrowLeft size={18} aria-hidden="true" />
              ) : (
                <ArrowRight size={18} aria-hidden="true" />
              )}
            </button>
          </footer>
        </div>
        <p className={styles.instructions} id="timeline-instructions">
          {t("instructions")}
        </p>
        <p
          className={styles.announcement}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {t("announcement", {
            current: active + 1,
            total: timelinePhases.length,
            number: phase.number,
            title: t(`phases.${phase.key}.title`),
          })}
        </p>
      </div>

      <div className={styles.solarSystem} aria-hidden="true">
        <div className={styles.orbitTurn}>
          <div className={styles.outerOrbit} />
          <div className={styles.innerOrbit} />
          {timelinePlanets.map((planet, index) => {
            const angle = ((180 + index * 72) * Math.PI) / 180
            return (
              <div
                key={planet.name}
                className={styles.planet}
                data-planet={planet.name}
                data-active={index === active}
                style={{
                  left: `${50 + 38 * Math.cos(angle)}%`,
                  top: `${50 + 38 * Math.sin(angle)}%`,
                  width: `${planet.size * 100}%`,
                  aspectRatio: `${planet.width} / ${planet.height}`,
                }}
              >
                <div>
                  <Image
                    src={planet.src}
                    alt=""
                    width={planet.width}
                    height={planet.height}
                    sizes="(max-width: 700px) 70px, 170px"
                  />
                </div>
              </div>
            )
          })}
          <i className={styles.moonOne} />
          <i className={styles.moonTwo} />
          <i className={styles.moonThree} />
        </div>
      </div>
    </section>
  )
}
