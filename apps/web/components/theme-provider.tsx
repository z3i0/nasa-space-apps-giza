"use client"

import * as React from "react"

export type Theme = "dark" | "light" | "system"

export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: "dark" | "light"
  systemTheme: "dark" | "light"
  themes: Theme[]
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

const STORAGE_KEY = "theme"
const COOKIE_NAME = "theme"
const THEMES: Theme[] = ["light", "dark", "system"]

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = STORAGE_KEY,
}: {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)
  const [resolvedTheme, setResolvedTheme] = React.useState<"dark" | "light">("light")
  const [systemTheme, setSystemTheme] = React.useState<"dark" | "light">("light")

  // Helper to apply classes and sync cookies
  const applyTheme = React.useCallback(
    (targetTheme: Theme) => {
      if (typeof window === "undefined") return

      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const currentSystem = mediaQuery.matches ? "dark" : "light"
      setSystemTheme(currentSystem)

      const effective = targetTheme === "system" ? currentSystem : targetTheme
      setResolvedTheme(effective)

      const root = document.documentElement
      if (effective === "dark") {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }

      // Sync cookie for SSR Zero-FOUC on next reload
      try {
        document.cookie = `${COOKIE_NAME}=${effective}; path=/; max-age=31536000; SameSite=Lax`
      } catch {}
    },
    []
  )

  // Initialize theme from localStorage on client mount
  React.useEffect(() => {
    try {
      const saved = (localStorage.getItem(storageKey) as Theme) || defaultTheme
      queueMicrotask(() => {
        setThemeState(saved)
        applyTheme(saved)
      })
    } catch {
      queueMicrotask(() => {
        applyTheme(defaultTheme)
      })
    }
  }, [defaultTheme, storageKey, applyTheme])

  // React to system color scheme changes if set to "system"
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      const currentSystem = mediaQuery.matches ? "dark" : "light"
      setSystemTheme(currentSystem)
      if (theme === "system") {
        applyTheme("system")
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme, applyTheme])

  // Sync across tabs
  React.useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        const newTheme = e.newValue as Theme
        setThemeState(newTheme)
        applyTheme(newTheme)
      }
    }

    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [storageKey, applyTheme])

  const setTheme = React.useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme)
      try {
        localStorage.setItem(storageKey, newTheme)
      } catch {}
      applyTheme(newTheme)
    },
    [storageKey, applyTheme]
  )

  // Global hotkey 'd' to toggle theme
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() !== "d") return

      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [resolvedTheme, setTheme])

  const value = React.useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
      themes: THEMES,
    }),
    [theme, setTheme, resolvedTheme, systemTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    return {
      theme: "system" as Theme,
      setTheme: () => {},
      resolvedTheme: "light" as "dark" | "light",
      systemTheme: "light" as "dark" | "light",
      themes: THEMES,
    }
  }
  return context
}
