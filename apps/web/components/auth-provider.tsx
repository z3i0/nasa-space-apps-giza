"use client"

import * as React from "react"
import { getAuthUser, UserSession } from "@/lib/auth"

interface AuthContextType {
  user: UserSession | null
  setUser: (user: UserSession | null) => void
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode
  initialUser?: UserSession | null
}) {
  const [user, setUser] = React.useState<UserSession | null>(initialUser)

  React.useEffect(() => {
    const local = getAuthUser()
    if (local) {
      setUser(local)
    }
    const handleAuthChange = () => {
      setUser(getAuthUser())
    }
    window.addEventListener("auth-user-changed", handleAuthChange)
    window.addEventListener("storage", handleAuthChange)
    return () => {
      window.removeEventListener("auth-user-changed", handleAuthChange)
      window.removeEventListener("storage", handleAuthChange)
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext)
  if (!context) {
    return {
      user: null,
      setUser: () => {},
    }
  }
  return context
}

export function useAuthUser(): UserSession | null {
  const context = React.useContext(AuthContext)
  if (context !== undefined) {
    return context.user
  }

  const [user, setUser] = React.useState<UserSession | null>(null)
  React.useEffect(() => {
    setUser(getAuthUser())
  }, [])
  return user
}
