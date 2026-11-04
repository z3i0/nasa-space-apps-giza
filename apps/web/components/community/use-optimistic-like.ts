"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { toggleLikeCommunityPost } from "@/lib/community"

export function useOptimisticLike(
  postId: string,
  initialLiked: boolean,
  initialCount: number,
  onSync?: (liked: boolean, count: number) => void
) {
  const [prevId, setPrevId] = useState(postId)
  const [isLiked, setIsLiked] = useState<boolean>(initialLiked)
  const [likesCount, setLikesCount] = useState<number>(initialCount)

  if (postId !== prevId) {
    setPrevId(postId)
    setIsLiked(initialLiked)
    setLikesCount(initialCount)
  }

  const serverLikedRef = useRef<boolean>(initialLiked)
  const targetLikedRef = useRef<boolean>(initialLiked)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    serverLikedRef.current = initialLiked
    targetLikedRef.current = initialLiked
  }, [initialLiked])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const toggle = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }

      // 1. Instant UI toggle (0ms latency)
      const nextLiked = !targetLikedRef.current
      targetLikedRef.current = nextLiked
      setIsLiked(nextLiked)
      setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)))

      // 2. Debounce backend call by 400ms to eliminate spamming
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      debounceTimerRef.current = setTimeout(async () => {
        const desiredState = targetLikedRef.current
        if (desiredState === serverLikedRef.current) {
          return
        }

        try {
          const res = await toggleLikeCommunityPost(postId, desiredState)
          serverLikedRef.current = res.isLiked
          setIsLiked(res.isLiked)
          setLikesCount(res.likesCount)
          onSync?.(res.isLiked, res.likesCount)
        } catch {
          // Revert to confirmed server state on error
          setIsLiked(serverLikedRef.current)
          targetLikedRef.current = serverLikedRef.current
        }
      }, 400)
    },
    [postId, onSync]
  )

  return { isLiked, likesCount, toggle }
}
