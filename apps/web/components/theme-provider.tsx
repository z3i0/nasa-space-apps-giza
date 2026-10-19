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

const ThemeContext = React.createContext<ThemeContextType | undefined>(
  undefined
)

const DARK_THEME: ThemeContextType = {
  theme: "dark",
  setTheme: () => {},
  resolvedTheme: "dark",
  systemTheme: "dark",
  themes: ["dark"],
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={DARK_THEME}>{children}</ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    return {
      theme: "dark" as Theme,
      setTheme: () => {},
      resolvedTheme: "dark" as "dark" | "light",
      systemTheme: "dark" as "dark" | "light",
      themes: ["dark"],
    }
  }
  return context
}
