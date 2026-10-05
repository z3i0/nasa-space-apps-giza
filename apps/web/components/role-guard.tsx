"use client"

import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/routing"
import { getAuthUser, getRedirectPathByRole, setAuth } from "@/lib/auth"
import { authClient } from "@/lib/auth-client"

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(true)

  const allowedRolesKey = allowedRoles.join(",")

  useEffect(() => {
    let isMounted = true

    const checkAuth = async () => {
      let user = getAuthUser()

      if (!user) {
        try {
          const sessionRes = await authClient.getSession()
          if (sessionRes.data?.user) {
            const u = sessionRes.data.user as {
              id?: string
              name?: string
              fullName?: string
              email?: string
              role?: string
            }
            const role = u.role || "participant"
            const fullName = u.name || u.fullName || u.email || ""
            user = {
              id: u.id || "",
              fullName,
              name: fullName,
              email: u.email || "",
              role,
              roles: [role],
            }
            const sessionToken = (
              sessionRes.data as { session?: { token?: string } } | null
            )?.session?.token
            setAuth({ accessToken: sessionToken }, user)
          }
        } catch {
          // session lookup error
        }
      }

      if (!isMounted) return

      if (!user) {
        setIsAuthorized(false)
        router.replace("/login")
        return
      }

      const isOrganizer = user.roles?.includes("organizer") || user.role === "organizer"
      const hasAllowedRole = allowedRoles.some((role) => user.roles?.includes(role) || user.role === role)

      if (!isOrganizer && !hasAllowedRole) {
        setIsAuthorized(false)
        const redirectPath = getRedirectPathByRole(user.roles || [])
        router.replace(redirectPath as "/dashboard/participant")
      } else {
        setIsAuthorized(true)
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [allowedRolesKey, router])

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}
