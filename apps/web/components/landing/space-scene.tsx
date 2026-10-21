"use client"

import { useEffect, useRef, type ReactNode } from "react"
import styles from "./landing.module.css"

/** Animate transforms outside React; frames run only while parallax is settling. */
export function SpaceScene({ children }: { children: ReactNode }) {
  const sceneRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)")
    const layers = Array.from(
      scene.querySelectorAll<HTMLElement>("[data-depth]")
    ).map((element) => {
      const transform = new DOMMatrixReadOnly(
        element.style.transform || undefined
      )
      return {
        element,
        speed: Number(element.dataset.depth),
        rotation: Number(element.dataset.rotate || 0),
        x: transform.m41,
        y: transform.m42,
        angle: Math.atan2(transform.m12, transform.m11) * (180 / Math.PI),
      }
    })
    let frame = 0
    let visible = true
    let top = 0
    let height = 0
    let scale = 1
    let pointerX = 0
    let pointerY = 0
    let previousTime = 0
    const enabled = () => !preference.matches && visible && !document.hidden
    const render = (time: number) => {
      frame = 0
      if (!enabled()) return
      const delta = previousTime ? Math.min(time - previousTime, 64) : 16
      previousTime = time
      const ease = 1 - Math.exp(-delta / 90)
      const distance =
        Math.min(height * 0.4, Math.max(0, window.scrollY - top)) * scale
      let moving = false
      for (const layer of layers) {
        const x = pointerX * layer.speed
        const y = (distance + pointerY) * layer.speed
        const angle = distance * layer.rotation
        layer.x += (x - layer.x) * ease
        layer.y += (y - layer.y) * ease
        layer.angle += (angle - layer.angle) * ease
        moving ||=
          Math.abs(x - layer.x) +
            Math.abs(y - layer.y) +
            Math.abs(angle - layer.angle) >
          0.1
        layer.element.style.transform = `translate3d(${layer.x}px, ${layer.y}px, 0) rotate(${layer.angle}deg)`
      }
      if (moving) frame = window.requestAnimationFrame(render)
      else previousTime = 0
    }
    const schedule = () => {
      if (!frame && enabled()) frame = window.requestAnimationFrame(render)
    }
    const updateMotion = () => {
      scene.dataset.running = String(enabled())
      if (preference.matches)
        for (const layer of layers) {
          layer.element.style.removeProperty("transform")
          layer.x = layer.y = layer.angle = 0
        }
      if (!enabled() && frame) {
        window.cancelAnimationFrame(frame)
        frame = 0
      }
      previousTime = 0
      schedule()
    }
    const measure = () => {
      top = scene.getBoundingClientRect().top + window.scrollY
      height = scene.offsetHeight
      scale = window.innerWidth <= 700 ? 0.7 : 1
      schedule()
    }
    const movePointer = (event: PointerEvent) => {
      if (!pointer.matches || !enabled()) return
      const bounds = scene.getBoundingClientRect()
      pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 44
      pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 28
      schedule()
    }
    const resetPointer = () => {
      pointerX = pointerY = 0
      schedule()
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      updateMotion()
    })
    measure()
    updateMotion()
    observer.observe(scene)
    scene.addEventListener("pointermove", movePointer, { passive: true })
    scene.addEventListener("pointerleave", resetPointer)
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", measure, { passive: true })
    document.addEventListener("visibilitychange", updateMotion)
    preference.addEventListener("change", updateMotion)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      scene.removeEventListener("pointermove", movePointer)
      scene.removeEventListener("pointerleave", resetPointer)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", measure)
      document.removeEventListener("visibilitychange", updateMotion)
      preference.removeEventListener("change", updateMotion)
    }
  }, [])

  return (
    <section
      ref={sceneRef}
      className={styles.hero}
      aria-labelledby="landing-title"
    >
      {children}
    </section>
  )
}
