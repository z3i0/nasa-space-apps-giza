"use client"

import { useTheme } from "@/components/theme-provider"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export interface ThemeToggleProps {
  className?: string
  variant?: "ghost" | "outline"
}

export function ThemeToggle({
  className,
  variant = "outline",
}: ThemeToggleProps = {}) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true)
    })
  }, [])

  if (!mounted) {
    return (
      <div
        className={cn(
          "size-9 rounded-md",
          variant === "outline" ? "border border-border bg-background" : "bg-transparent",
          className
        )}
      />
    )
  }

  return (
    <AnimatedThemeToggler
      theme={resolvedTheme}
      onThemeChange={(t) => setTheme(t)}
      variant="circle"
      duration={450}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md transition-colors cursor-pointer text-muted-foreground hover:text-foreground [&_svg]:size-4",
        variant === "outline"
          ? "border border-border bg-background hover:bg-accent hover:text-accent-foreground"
          : "hover:bg-muted/60",
        className
      )}
    />
  )
}
