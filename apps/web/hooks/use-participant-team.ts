"use client"

import useSWR, { mutate as globalMutate } from "swr"
import {
  fetchMyTeam,
  fetchMyInvitations,
  type TeamDetails,
  type MyTeamInvitation,
} from "@/lib/teams"

export const SWR_KEYS = {
  MY_TEAM: "/teams/my-team-state",
  MY_INVITATIONS: "/teams/my-invitations-state",
  WORKSPACE: "/teams/workspace/me",
  TEAM_WORK: "/teams/me",
  OVERVIEW: "/overview",
} as const

export interface UseMyTeamOptions {
  fallbackData?: { team: TeamDetails | null }
  revalidateOnFocus?: boolean
  refreshInterval?: number
}

/**
 * Shared hook to access and synchronize the current participant's team.
 * Keeps `my-team-client`, `specific-team-client`, and `find-team/browse` in perfect sync.
 */
export function useMyTeam(options?: UseMyTeamOptions) {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<{ team: TeamDetails | null }>(
    SWR_KEYS.MY_TEAM,
    () => fetchMyTeam().catch(() => ({ team: null })),
    {
      fallbackData: options?.fallbackData,
      revalidateOnFocus: options?.revalidateOnFocus ?? true,
      refreshInterval: options?.refreshInterval ?? 15000,
    }
  )

  const team = data !== undefined ? data.team : options?.fallbackData?.team

  return {
    team,
    data,
    error,
    isLoading: isLoading && team === undefined,
    isValidating,
    mutate,
  }
}

/**
 * Shared hook to access and synchronize the participant's team invitations.
 */
export function useMyInvitations(options?: { refreshInterval?: number }) {
  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<{ invitations: MyTeamInvitation[] }>(
    SWR_KEYS.MY_INVITATIONS,
    () => fetchMyInvitations().catch(() => ({ invitations: [] })),
    {
      revalidateOnFocus: true,
      refreshInterval: options?.refreshInterval ?? 15000,
    }
  )

  const invitations = data?.invitations || []

  return {
    invitations,
    data,
    error,
    isLoading: isLoading && !data,
    mutate,
  }
}

/**
 * Global cache invalidator for all team-related participant endpoints.
 * Call this after creating, leaving, joining, or updating a team.
 */
export async function mutateParticipantTeam() {
  await Promise.all([
    globalMutate(SWR_KEYS.MY_TEAM),
    globalMutate(SWR_KEYS.MY_INVITATIONS),
    globalMutate(SWR_KEYS.WORKSPACE),
    globalMutate(SWR_KEYS.TEAM_WORK),
    globalMutate(SWR_KEYS.OVERVIEW),
  ])
}

