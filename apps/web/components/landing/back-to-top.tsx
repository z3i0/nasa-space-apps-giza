"use client"

import { ArrowUpRight } from "lucide-react"

interface BackToTopProps {
  label: string
}

export function BackToTop({ label }: BackToTopProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()

    if (window.location.hash) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      )
    }

    const lenis = (
      window as unknown as {
        __lenis?: {
          scrollTo: (
            target: number | string | HTMLElement,
            options?: { duration?: number }
          ) => void
        }
      }
    ).__lenis

    if (lenis) {
      lenis.scrollTo(0, { duration: 1.2 })
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <a href="#top" onClick={handleClick}>
      {label}
      <ArrowUpRight size={14} aria-hidden="true" />
    </a>
  )
}

