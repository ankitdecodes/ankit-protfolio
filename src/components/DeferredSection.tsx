import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * Mounts a heavy, code-split section only when it nears the viewport, so its
 * download and render never compete with first load. The placeholder carries the
 * section id, so anchors keep working.
 *
 * In-page navigation (any hash change, or a hash on load) mounts every deferred
 * section at once — sections above the target would otherwise grow after the
 * jump and push it out of view — and re-anchors to the target once rendered.
 */
export function DeferredSection({
  id,
  label,
  component: Component,
}: {
  id: string
  label: string
  component: LazyExoticComponent<ComponentType>
}) {
  const ref = useRef<HTMLElement>(null)
  const [mounted, setMounted] = useState(() => typeof window !== 'undefined' && window.location.hash.length > 1)

  useEffect(() => {
    if (mounted) return
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => entry?.isIntersecting && setMounted(true), { rootMargin: '900px 0px' })
    io.observe(el)
    const onHash = () => setMounted(true)
    window.addEventListener('hashchange', onHash)
    return () => {
      io.disconnect()
      window.removeEventListener('hashchange', onHash)
    }
  }, [mounted])

  const placeholder = (
    <section id={id} ref={ref} aria-label={label} className="container-page py-20 md:py-28">
      <div className="h-[70vh] animate-pulse rounded-card border border-line bg-surface/40 motion-reduce:animate-none" />
    </section>
  )

  if (!mounted) return placeholder
  return (
    <Suspense fallback={placeholder}>
      <Component />
      <ReanchorOnMount />
    </Suspense>
  )
}

/** After real content replaces a placeholder, keep the navigation target in view. */
function ReanchorOnMount() {
  useLayoutEffect(() => {
    const target = window.location.hash.slice(1)
    if (!target) return
    const el = document.getElementById(target)
    if (el && Math.abs(el.getBoundingClientRect().top) > 120) el.scrollIntoView({ behavior: 'auto', block: 'start' })
  }, [])
  return null
}
