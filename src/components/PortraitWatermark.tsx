import { m, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { profile } from '../content/site'
import { useMediaQuery } from '../lib/hooks'

/**
 * Oversized, grayscale portrait watermark fixed behind the page. It drifts up a
 * little as the page scrolls — slower than the content — so it reads as depth.
 *
 * One instance sits behind the light page; each dark band renders a clipped copy
 * (its section uses `clip-path: inset(0)`) driven by the same page-scroll value,
 * so the portrait appears continuous across light and dark sections.
 */
export function PortraitWatermark({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const reduced = useReducedMotion()
  const desktop = useMediaQuery('(min-width: 768px)')
  const moving = desktop && !reduced

  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], ['3vh', '-10vh'])
  const scale = useTransform(scrollYProgress, [0, 1], [1.04, 1])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <m.img
        src={profile.portrait}
        alt=""
        decoding="async"
        loading="lazy"
        style={moving ? { y, scale } : undefined}
        className={`absolute top-1/2 -right-[18vw] aspect-square h-[min(60vh,420px)] w-auto max-w-none -translate-y-1/2 object-cover grayscale will-change-transform md:right-[2vw] md:h-[min(70vh,500px)] ${
          tone === 'dark' ? 'opacity-[0.07]' : 'opacity-[0.1] contrast-125'
        } [mask-image:radial-gradient(closest-side,black_35%,transparent_95%)]`}
      />
    </div>
  )
}
