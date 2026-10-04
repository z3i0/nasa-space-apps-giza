"use client"

import { useEffect } from "react"
import { useRouter } from "@/i18n/routing"
import { getAuthUser, getRedirectPathByRole } from "@/lib/auth"
import { Loader2 } from "lucide-react"

export default function DashboardIndexPage() {
  const router = useRouter()

  useEffect(() => {
    const user = getAuthUser()
    const targetPath = getRedirectPathByRole(user?.roles || [])
    router.replace(targetPath as "/dashboard/participant")
  }, [router])

  return (
    <div className="flex h-64 w-full items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" />
    </div>
  )
}
