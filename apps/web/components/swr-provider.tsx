"use client"

import * as React from "react"
import { SWRConfig } from "swr"
import { accountApi } from "@/lib/account"

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: async (url: string) => {
          if (url.startsWith("/api/")) {
            const res = await fetch(url, { credentials: "include" })
            if (!res.ok) {
              const err = await res
                .json()
                .catch(() => ({ message: res.statusText }))
              throw new Error(
                err?.message || `Request failed with status ${res.status}`
              )
            }
            return res.json()
          }
          return accountApi(url)
        },
        revalidateOnFocus: false,
        revalidateIfStale: true,
        dedupingInterval: 4000,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  )
}

