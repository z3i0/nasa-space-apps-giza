"use client"

import { useCallback, useRef, useState } from "react"
import useSWR from "swr"
import { requestTeams, teamErrorKey, type Team } from "@/lib/teams"
import { SWR_KEYS, mutateParticipantTeam } from "@/hooks/use-participant-team"

export function useTeamWork() {
  const {
    data,
    error: swrError,
    isLoading,
    mutate: swrMutate,
  } = useSWR<Team | { team: null }>(
    SWR_KEYS.TEAM_WORK,
    () => requestTeams<Team | { team: null }>("/me"),
    {
      revalidateOnFocus: true,
      dedupingInterval: 4000,
    }
  )

  const team = data && "id" in data ? data : null
  const [actionError, setActionError] = useState("")
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)

  const refresh = useCallback(async () => {
    setActionError("")
    await swrMutate()
  }, [swrMutate])

  async function mutate(path: string, method: string, body?: unknown) {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    setActionError("")
    try {
      await requestTeams(path, { method, body })
      await swrMutate()
      void mutateParticipantTeam()
      return true
    } catch (e) {
      setActionError(teamErrorKey(e))
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  const error = actionError || (swrError ? teamErrorKey(swrError) : "")
  const loading = isLoading && !data

  return { team, loading, error, busy, refresh, mutate }
}
