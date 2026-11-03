"use client"

import * as React from "react"
import { SWRConfig } from "swr"
import { accountApi } from "@/lib/account"

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => accountApi(url),
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

