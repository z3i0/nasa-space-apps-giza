"use client"
import * as React from "react"
import { usePathname } from "next/navigation"
import {
  getAuthUser,
  getAuthToken,
  setAuth,
  clearLocalAuth,
  type UserSession,
} from "@/lib/auth"
interface AuthContextType {
  user: UserSession | null
  setUser: (user: UserSession | null) => void
}
export const AuthContext = React.createContext<AuthContextType | undefined>(
  undefined
)
function snapshot() {
  const user = getAuthUser()
  return user ? JSON.stringify(user) : ""
}
function subscribe(notify: () => void) {
  let identity = getAuthUser()?.id
  const changed = () => {
    identity = getAuthUser()?.id
    notify()
  }
  const storage = (event: StorageEvent) => {
    if (event.key !== "hackathon_user" && event.key !== null) return
    const next = getAuthUser()?.id
    if (next !== identity && window.location.pathname.includes("/dashboard")) {
      notify()
      window.location.replace("/login")
    } else changed()
  }
  window.addEventListener("auth-user-changed", changed)
  window.addEventListener("storage", storage)
  return () => {
    window.removeEventListener("auth-user-changed", changed)
    window.removeEventListener("storage", storage)
  }
}
function useStoredUser(initial: UserSession | null = null) {
  const serverSnapshot = React.useCallback(
    () => (initial ? JSON.stringify(initial) : ""),
    [initial]
  )
  const value = React.useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  return React.useMemo<UserSession | null>(() => {
    try {
      return value ? JSON.parse(value) : null
    } catch {
      return null
    }
  }, [value])
}
function updateUser(user: UserSession | null) {
  if (user) setAuth({ accessToken: getAuthToken() || undefined }, user)
  else clearLocalAuth()
}
export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode
  initialUser?: UserSession | null
}) {
  const user = useStoredUser(initialUser)
  const pathname = usePathname()
  return (
    <AuthContext.Provider value={{ user, setUser: updateUser }}>
      <React.Fragment
        key={
          pathname.includes("/dashboard") ? user?.id || "signed-out" : "public"
        }
      >
        {children}
      </React.Fragment>
    </AuthContext.Provider>
  )
}
export function useAuth(): AuthContextType {
  return React.useContext(AuthContext) || { user: null, setUser: updateUser }
}
export function useAuthUser(): UserSession | null {
  const context = React.useContext(AuthContext)
  const fallback = useStoredUser()
  return context === undefined ? fallback : context.user
}
