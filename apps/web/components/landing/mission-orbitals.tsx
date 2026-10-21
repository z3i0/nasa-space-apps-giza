"use client"

import { useEffect, useRef, useCallback, type CSSProperties } from "react"
import styles from "./mission-orbitals.module.css"

/* ── Pixel Grid Canvas ─────────────────────────────────── */

interface Pixel {
  x: number
  y: number
  baseX: number
  baseY: number
  opacity: number
  baseOpacity: number
  size: number
  hue: number
}

function PixelCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pixelsRef = useRef<Pixel[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const frameRef = useRef(0)
  const initializedRef = useRef(false)

  const initPixels = useCallback((canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    const gap = 28
    const pixels: Pixel[] = []
    const cols = Math.ceil(canvas.width / gap)
    const rows = Math.ceil(canvas.height / gap)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * gap + gap / 2
        const y = row * gap + gap / 2
        pixels.push({
          x,
          y,
          baseX: x,
          baseY: y,
          opacity: 0.04 + Math.random() * 0.08,
          baseOpacity: 0.04 + Math.random() * 0.08,
          size: 2 + Math.random() * 2,
          hue: 260 + Math.random() * 30,
        })
      }
    }
    pixelsRef.current = pixels
    initializedRef.current = true
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (preference.matches) return

    initPixels(canvas)

    const onResize = () => initPixels(canvas)
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(canvas.parentElement || canvas)

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    const onPointerLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }

    canvas.addEventListener("pointermove", onPointerMove, { passive: true })
    canvas.addEventListener("pointerleave", onPointerLeave)

    const render = () => {
      if (!initializedRef.current) {
        frameRef.current = requestAnimationFrame(render)
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const { x: mx, y: my } = mouseRef.current
      const radius = 140
      const pixels = pixelsRef.current

      for (const pixel of pixels) {
        const dx = mx - pixel.baseX
        const dy = my - pixel.baseY
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < radius) {
          const force = (1 - dist / radius) * 1.0
          const angle = Math.atan2(dy, dx)
          const targetX = pixel.baseX - Math.cos(angle) * force * 35
          const targetY = pixel.baseY - Math.sin(angle) * force * 35
          pixel.x += (targetX - pixel.x) * 0.12
          pixel.y += (targetY - pixel.y) * 0.12
          pixel.opacity +=
            (Math.min(0.6, pixel.baseOpacity + force * 0.5) - pixel.opacity) *
            0.15
        } else {
          pixel.x += (pixel.baseX - pixel.x) * 0.06
          pixel.y += (pixel.baseY - pixel.y) * 0.06
          pixel.opacity += (pixel.baseOpacity - pixel.opacity) * 0.06
        }

        ctx.fillStyle = `hsla(${pixel.hue}, 65%, 72%, ${pixel.opacity})`
        ctx.fillRect(
          Math.round(pixel.x - pixel.size / 2),
          Math.round(pixel.y - pixel.size / 2),
          pixel.size,
          pixel.size
        )
      }

      frameRef.current = requestAnimationFrame(render)
    }

    frameRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frameRef.current)
      resizeObserver.disconnect()
      canvas.removeEventListener("pointermove", onPointerMove)
      canvas.removeEventListener("pointerleave", onPointerLeave)
    }
  }, [initPixels])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ width: "100%", height: "100%" }}
    />
  )
}

/* ── Orbital Rings ─────────────────────────────────────── */

interface OrbitalConfig {
  width: string
  height: string
  rotation: number
  duration: string
  dotSize: number
  dotColor: string
  glowColor: string
  offset: { x: string; y: string }
  delay: string
  opacity: number
}

const orbitals: OrbitalConfig[] = [
  {
    width: "min(700px, 85vw)",
    height: "min(380px, 50vw)",
    rotation: -18,
    duration: "22s",
    dotSize: 6,
    dotColor: "#c9b8ff",
    glowColor: "#b8a5ff",
    offset: { x: "50%", y: "45%" },
    delay: "0s",
    opacity: 0.35,
  },
  {
    width: "min(900px, 110vw)",
    height: "min(480px, 62vw)",
    rotation: 12,
    duration: "30s",
    dotSize: 4,
    dotColor: "#9370ff",
    glowColor: "#7850cc",
    offset: { x: "48%", y: "50%" },
    delay: "-8s",
    opacity: 0.22,
  },
  {
    width: "min(550px, 68vw)",
    height: "min(300px, 38vw)",
    rotation: -35,
    duration: "18s",
    dotSize: 5,
    dotColor: "#e0d4ff",
    glowColor: "#c9b8ff",
    offset: { x: "55%", y: "42%" },
    delay: "-4s",
    opacity: 0.28,
  },
]

function OrbitalRing({ config }: { config: OrbitalConfig }) {
  return (
    <div
      className={styles.orbitalRing}
      style={
        {
          "--orbital-width": config.width,
          "--orbital-height": config.height,
          "--orbital-rotation": `${config.rotation}deg`,
          "--orbital-duration": config.duration,
          "--orbital-dot-size": `${config.dotSize}px`,
          "--orbital-dot-color": config.dotColor,
          "--orbital-glow-color": config.glowColor,
          "--orbital-offset-x": config.offset.x,
          "--orbital-offset-y": config.offset.y,
          "--orbital-delay": config.delay,
          "--orbital-opacity": config.opacity,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className={styles.orbitalPath}>
        <div className={styles.orbitalDot} />
      </div>
    </div>
  )
}

/* ── Exported Component ────────────────────────────────── */

export function MissionOrbitals() {
  return (
    <div className={styles.orbitalsContainer} aria-hidden="true">
      <PixelCanvas className={styles.pixelCanvas} />
      <div className={styles.orbitalsLayer}>
        {orbitals.map((config, i) => (
          <OrbitalRing key={i} config={config} />
        ))}
      </div>
      {/* Central glow behind content */}
      <div className={styles.centralGlow} />
    </div>
  )
}
