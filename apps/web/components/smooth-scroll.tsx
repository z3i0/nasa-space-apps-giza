"use client"

import { useEffect, useRef } from "react"
import Lenis from "lenis"

/**
 * Initialises Lenis smooth scroll on the entire page.
 * Drop this component once anywhere in the tree (e.g. layout).
 *
 * - `lerp` controls how quickly the scroll catches up (lower = smoother/slower).
 * - `duration` sets the base ease duration for programmatic scrolls.
 * - Respects `prefers-reduced-motion` — disables itself automatically.
 */
export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (preference.matches) return

    const lenis = new Lenis({
      lerp: 0.07, // lower = smoother & slower catch-up
      duration: 1.4, // base ease duration for anchor scrolls
      smoothWheel: true,
      touchMultiplier: 1.5,
    })

    lenisRef.current = lenis

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    // Keep CSS scroll-behavior from fighting Lenis
    document.documentElement.style.scrollBehavior = "auto"

    return () => {
      lenis.destroy()
      lenisRef.current = null
      document.documentElement.style.scrollBehavior = ""
    }
  }, [])

  return null
}
