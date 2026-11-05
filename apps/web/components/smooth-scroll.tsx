"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
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
  const pathname = usePathname()

  useEffect(() => {
    // Disable smooth scroll inside dashboard workspaces to allow native fast scrolling
    // and prevent wheel event hijacking on sidebars, tables, and dialogs
    if (pathname?.includes("/dashboard")) {
      if (lenisRef.current) {
        lenisRef.current.destroy()
        lenisRef.current = null
        document.documentElement.style.scrollBehavior = ""
      }
      return
    }

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (preference.matches) return

    const lenis = new Lenis({
      lerp: 0.07, // lower = smoother & slower catch-up
      duration: 1.4, // base ease duration for anchor scrolls
      smoothWheel: true,
      touchMultiplier: 1.5,
      allowNestedScroll: true,
      anchors: true,
      prevent: (node) => {
        return (
          node.hasAttribute?.("data-lenis-prevent") ||
          Boolean(node.closest?.("[data-lenis-prevent]")) ||
          Boolean(node.closest?.("[data-dashboard-shell]")) ||
          Boolean(node.closest?.("[role='dialog']")) ||
          Boolean(node.closest?.("[data-slot='sidebar']"))
        )
      },
    })

    lenisRef.current = lenis
    ;(window as unknown as { __lenis?: Lenis }).__lenis = lenis

    let animId: number
    function raf(time: number) {
      lenis.raf(time)
      animId = requestAnimationFrame(raf)
    }

    animId = requestAnimationFrame(raf)

    // Keep CSS scroll-behavior from fighting Lenis
    document.documentElement.style.scrollBehavior = "auto"

    return () => {
      cancelAnimationFrame(animId)
      lenis.destroy()
      lenisRef.current = null
      ;(window as unknown as { __lenis?: Lenis }).__lenis = undefined
      document.documentElement.style.scrollBehavior = ""
    }
  }, [pathname])

  return null
}
