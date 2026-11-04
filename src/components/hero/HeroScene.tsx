import { useEffect, useRef, useState } from 'react'
import { archEdges, archLayouts, archNodes } from '../../content/lab'

/**
 * Decides whether the 3D scene is worth loading. The SVG diagram is the
 * permanent fallback for reduced motion, no WebGL, low-power hardware or Save-Data.
 */
function canRender3d(): boolean {
  if (typeof window === 'undefined') return false
  // Development-only escape hatch for testing the scene on software GL.
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).get('scene') === 'force') return true
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  // Phones and small tablets get the static diagram — 3D isn't worth the battery there.
  if (window.innerWidth < 900) return false
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
  if (nav.connection?.saveData) return false
  if ((nav.hardwareConcurrency ?? 4) < 4 || (nav.deviceMemory ?? 4) < 2) return false
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') ?? c.getContext('webgl')
    if (!gl) return false
    // Software rasterisers render every frame on the CPU — keep the SVG instead.
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)
  } catch {
    return false
  }
}

export function HeroScene() {
  const hostRef = useRef<HTMLDivElement>(null)
  const labelsRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!canRender3d()) return
    let disposed = false
    let handle: { dispose: () => void } | null = null
    // Wait until the browser is idle so the scene never competes with first paint.
    const schedule = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300))
    const id = schedule(() => {
      import('./scene3d')
        .then(({ mountScene }) => {
          if (disposed || !hostRef.current || !labelsRef.current) return
          handle = mountScene(hostRef.current, labelsRef.current, {
            onReady: () => setReady(true),
            // Too slow on this device: tear down and keep the static diagram.
            onDegrade: () => {
              handle?.dispose()
              handle = null
              setReady(false)
            },
          })
        })
        .catch(() => setReady(false))
    })
    return () => {
      disposed = true
      if (typeof id === 'number') (window.cancelIdleCallback ?? window.clearTimeout)(id)
      handle?.dispose()
    }
  }, [])

  return (
    <div className="relative size-full">
      <SystemDiagram hidden={ready} />
      <div ref={hostRef} className={`absolute inset-0 transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`} />
      <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden />
    </div>
  )
}

/**
 * Static rendering of the same system — shown first and kept as the fallback.
 * Lines are SVG; labels are HTML so they stay readable at any size.
 */
function SystemDiagram({ hidden }: { hidden: boolean }) {
  const { width, height, nodes } = archLayouts.wide
  const pos = (id: keyof typeof nodes) => ({
    left: `${6 + (nodes[id].x / width) * 88}%`,
    top: `${10 + (nodes[id].y / height) * 72}%`,
  })
  return (
    <div
      role="img"
      aria-label="System map: a frontend calls an API, which uses authentication, a Redis cache, a job queue processed by workers, PostgreSQL and an AI service."
      className={`absolute inset-0 transition-opacity duration-700 ${hidden ? 'opacity-0' : 'opacity-100'}`}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
        {archEdges.map((e) => {
          const a = pos(e.from)
          const b = pos(e.to)
          return (
            <line
              key={e.id}
              x1={parseFloat(a.left)}
              y1={parseFloat(a.top)}
              x2={parseFloat(b.left)}
              y2={parseFloat(b.top)}
              stroke="var(--color-line-strong)"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}
      </svg>
      {archNodes.map((n) => {
        const ai = n.id === 'ai'
        return (
          <div key={n.id} className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center" style={pos(n.id)} aria-hidden>
            <span
              className={`grid size-7 place-items-center rounded-full bg-surface shadow-sm ring-2 sm:size-8 ${ai ? 'ring-ai/60' : 'ring-accent/50'}`}
            >
              <span className={`size-2.5 rounded-full ${ai ? 'bg-ai' : 'bg-accent'}`} />
            </span>
            <span className="mt-1.5 text-xs font-semibold whitespace-nowrap text-fg sm:text-[0.8125rem]">{n.label}</span>
            <span className="hidden text-xs whitespace-nowrap text-subtle md:block">{n.technologies.slice(0, 2).join(' · ')}</span>
          </div>
        )
      })}
    </div>
  )
}
