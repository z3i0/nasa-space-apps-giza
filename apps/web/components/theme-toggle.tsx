"use client"

import { useTheme } from "@/components/theme-provider"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true)
    })
  }, [])

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-md border border-border bg-background" />
    )
  }

  return (
    <AnimatedThemeToggler
      theme={resolvedTheme}
      onThemeChange={(t) => setTheme(t)}
      variant="circle"
      duration={450}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-muted-foreground hover:text-foreground [&_svg]:h-4 [&_svg]:w-4"
    />
  )
}
