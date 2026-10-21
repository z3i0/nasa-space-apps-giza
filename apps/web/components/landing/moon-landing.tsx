"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import { useTranslations } from "next-intl"
import { ArrowUpRight, Rocket } from "lucide-react"
import { Link } from "@/i18n/routing"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import styles from "./moon-landing.module.css"

export function MoonLanding() {
  const t = useTranslations("Home")
  const sceneRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    let visible = false
    const update = () => {
      scene.dataset.running = String(visible && !document.hidden)
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        update()
      },
      { threshold: 0.15 }
    )
    observer.observe(scene)
    document.addEventListener("visibilitychange", update)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", update)
    }
  }, [])

  return (
    <section
      ref={sceneRef}
      id="registration"
      className={styles.scene}
      aria-labelledby="registration-title"
      data-running="false"
    >
      <div className={styles.stars} aria-hidden="true" />
      <div className={styles.terrain} aria-hidden="true">
        <Image
          src="/space/moon-terrain.png"
          alt=""
          fill
          sizes="(max-width: 700px) 900px, 100vw"
          className={styles.terrainImage}
        />
      </div>
      <div className={styles.content}>
        <p className={styles.eyebrow}>
          <Rocket size={15} aria-hidden="true" />
          {t("nextDestination")}
        </p>
        <h2 id="registration-title">
          {t("registrationTitle")}
          <span>{t("registrationAccent")}</span>
        </h2>
        <p className={styles.description}>{t("registrationDescription")}</p>
        <p className={styles.status}>
          <span className={styles.signal} />
          {t("registrationStatus")}
        </p>
        <Link
          href="/login"
          className={cn(buttonVariants({ size: "lg" }), styles.cta)}
        >
          {t("portal")}
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
        <p className={styles.note}>{t("portalNote")}</p>
      </div>
      <div className={styles.landingZone} aria-hidden="true">
        <div className={styles.shadow} />
        <div className={styles.dust} />
        <div className={styles.ship}>
          <div className={styles.exhaust} />
          <Image
            src="/space/spaceship.webp"
            alt=""
            width={160}
            height={248}
            sizes="(max-width: 700px) 120px, 220px"
            className={styles.shipImage}
          />
        </div>
      </div>
    </section>
  )
}
