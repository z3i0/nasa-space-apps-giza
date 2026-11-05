// Subtle, elegant notification sound synthesized with Web Audio API
// Single shared AudioContext avoids context exhaustion and InvalidStateError

let sharedAudioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null

  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      if (!AudioCtx) return null
      sharedAudioCtx = new AudioCtx()
    }
    return sharedAudioCtx
  } catch {
    return null
  }
}

function renderChime(ctx: AudioContext): void {
  try {
    const now = ctx.currentTime

    // First gentle tone (D5 ~ 587.33 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = "sine"
    osc1.frequency.setValueAtTime(587.33, now)

    gain1.gain.setValueAtTime(0.08, now)
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.22)

    // Second harmonious tone (A5 ~ 880 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = "sine"
    osc2.frequency.setValueAtTime(880, now + 0.08)

    gain2.gain.setValueAtTime(0.09, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)

    osc2.start(now + 0.08)
    osc2.stop(now + 0.35)
  } catch {
    // Ignore any audio render failure
  }
}

export function playNotificationSound(): void {
  if (typeof window === "undefined") return

  try {
    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === "suspended") {
      ctx
        .resume()
        .then(() => {
          renderChime(ctx)
        })
        .catch(() => {})
      return
    }

    renderChime(ctx)
  } catch {
    // Silently ignore if blocked by browser autoplay policy
  }
}
