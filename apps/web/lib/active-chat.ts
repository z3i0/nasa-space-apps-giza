// In-memory registry to track which mentorship chat is currently open and visible
const activeChats = new Set<string>()

export function registerActiveChat(requestId: string): () => void {
  activeChats.add(requestId)
  return () => {
    activeChats.delete(requestId)
  }
}

export function isChatActive(requestId?: string | null): boolean {
  if (!requestId) return false
  return activeChats.has(requestId)
}

