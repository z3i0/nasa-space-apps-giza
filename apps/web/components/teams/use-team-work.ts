"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { requestTeams, teamErrorKey, type Team } from "@/lib/teams"

export function useTeamWork() {
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const load = useCallback(async (signal?: AbortSignal) => {
    const result = await requestTeams<Team | { team: null }>("/me", { signal })
    if (!signal?.aborted) setTeam("id" in result ? result : null)
  }, [])
  const refresh = useCallback(async () => {
    setError("")
    setLoading(true)
    try {
      await load()
    } catch (e) {
      setError(teamErrorKey(e))
    } finally {
      setLoading(false)
    }
  }, [load])
  useEffect(() => {
    const controller = new AbortController()
    requestTeams<Team | { team: null }>("/me", { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setTeam("id" in result ? result : null)
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(teamErrorKey(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])
  async function mutate(path: string, method: string, body?: unknown) {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    setError("")
    try {
      await requestTeams(path, { method, body })
      await load()
      return true
    } catch (e) {
      setError(teamErrorKey(e))
      return false
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return { team, loading, error, busy, refresh, mutate }
}
