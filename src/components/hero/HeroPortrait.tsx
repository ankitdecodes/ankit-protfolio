import { useEffect, useRef } from 'react'
import { m, useAnimationFrame, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { MapPin } from 'lucide-react'
import { profile } from '../../content/site'

const ORBIT = ['NestJS', 'React', 'MySQL', 'Redis', 'Flutter', 'Applied AI', 'TypeScript', 'Docker']

/**
 * Hero identity: portrait on a navy stage with drifting light fields behind it,
 * a slow float, pointer tilt, scroll parallax and an orbit of the stack that
 * passes behind and in front of the photo. Everything is static under reduced motion.
 */
export function HeroPortrait() {
  const reduced = useReducedMotion()
  const stageRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<(HTMLLIElement | null)[]>([])
  const visible = useRef(true)

  // Pointer tilt (springy, subtle)
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 80, damping: 18 })
  const sy = useSpring(py, { stiffness: 80, damping: 18 })
  const portraitX = useTransform(sx, (v) => v * 14)
  const portraitY = useTransform(sy, (v) => v * 10)
  const rotateY = useTransform(sx, (v) => v * 8)
  const rotateX = useTransform(sy, (v) => v * -6)
  const glowX = useTransform(sx, (v) => v * -28)
  const glowY = useTransform(sy, (v) => v * -22)

  // Scroll parallax: the portrait drifts slower than the page
  const { scrollYProgress } = useScroll({ target: stageRef, offset: ['start start', 'end start'] })
  const scrollY = useTransform(scrollYProgress, [0, 1], [0, 70])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => (visible.current = e?.isIntersecting ?? true))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Orbit: an ellipse with depth — chips behind the portrait shrink and fade.
  const placeChips = (t: number) => {
    const stage = stageRef.current
    if (!stage) return
    const w = stage.clientWidth
    const rx = Math.min(w * 0.36, 250)
    const ry = rx * 0.32
    chipRefs.current.forEach((chip, i) => {
      if (!chip) return
      const a = t + (i / ORBIT.length) * Math.PI * 2
      const depth = Math.sin(a) // −1 back … +1 front
      const scale = 0.82 + (depth + 1) * 0.12
      chip.style.transform = `translate(-50%, -50%) translate(${Math.cos(a) * rx}px, ${depth * ry}px) scale(${scale})`
      chip.style.zIndex = depth > 0 ? '30' : '5'
      chip.style.opacity = String(0.55 + (depth + 1) * 0.225)
    })
  }

  useAnimationFrame((time) => {
    if (reduced || !visible.current) return
    placeChips(time / 9000)
  })

  useEffect(() => {
    if (reduced) placeChips(0.35)
  })

  const onMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    px.set(((e.clientX - r.left) / r.width) * 2 - 1)
    py.set(((e.clientY - r.top) / r.height) * 2 - 1)
  }
  const onLeave = () => {
    px.set(0)
    py.set(0)
  }

  return (
    <div
      ref={stageRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="theme-dark relative isolate h-[420px] overflow-hidden rounded-[2rem] bg-[#101827] shadow-lift sm:h-[500px] lg:h-[580px]"
    >
      {/* Drifting light fields */}
      <m.div aria-hidden style={reduced ? undefined : { x: glowX, y: glowY }} className="absolute inset-0 -z-10">
        <span className="hero-blob absolute top-[8%] left-[12%] size-72 rounded-full bg-[#526bff]/45 blur-3xl" />
        <span className="hero-blob hero-blob--b absolute right-[6%] bottom-[18%] size-64 rounded-full bg-[#b9a7ff]/35 blur-3xl" />
        <span className="hero-blob hero-blob--c absolute bottom-[4%] left-[30%] size-56 rounded-full bg-[#ff927a]/25 blur-3xl" />
      </m.div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgb(255_255_255/0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />

      {/* Portrait + orbit */}
      <div className="absolute inset-x-0 top-[44%] -translate-y-1/2" style={{ perspective: 900 }}>
        <ul aria-label="Core stack" className="absolute top-1/2 left-1/2">
          {ORBIT.map((tech, i) => (
            <li
              key={tech}
              ref={(el) => {
                chipRefs.current[i] = el
              }}
              className="absolute top-0 left-0 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-fg ring-1 ring-white/20 backdrop-blur-md will-change-transform"
            >
              {tech}
            </li>
          ))}
        </ul>

        <m.div
          style={reduced ? undefined : { x: portraitX, y: portraitY, rotateX, rotateY, translateY: scrollY }}
          className="relative z-20 mx-auto size-56 sm:size-64 lg:size-72"
        >
          <div className={reduced ? '' : 'hero-float'}>
            <div className="absolute -inset-3 rounded-full bg-[conic-gradient(from_200deg,#526bff,#b9a7ff,#ff927a,#526bff)] opacity-80 blur-md" aria-hidden />
            <div className="relative rounded-full bg-[conic-gradient(from_200deg,#526bff,#b9a7ff,#ff927a,#526bff)] p-[3px]">
              <img
                src={profile.portrait}
                alt="Portrait of Ankit Pal"
                width={600}
                height={600}
                fetchPriority="high"
                decoding="async"
                className="aspect-square w-full rounded-full border-4 border-[#101827] object-cover"
              />
            </div>
          </div>
        </m.div>
      </div>

      {/* Identity strip */}
      <div className="absolute inset-x-4 bottom-4 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 ring-1 ring-white/15 backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:px-5">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-fg">{profile.name}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="size-3.5" aria-hidden /> {profile.location}
          </p>
        </div>
        {profile.openToWork && (
          <span className="inline-flex items-center gap-2 rounded-full bg-[#10b981]/15 px-3 py-1.5 text-sm font-semibold text-[#6ee7b7] ring-1 ring-[#10b981]/40">
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#34d399] opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-[#34d399]" />
            </span>
            Open to work
          </span>
        )}
      </div>
    </div>
  )
}
