import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { m } from 'motion/react'

type Variant = 'primary' | 'secondary' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white shadow-[0_8px_20px_-8px_rgb(68_89_240/0.6)] hover:bg-[#3446d6] hover:shadow-[0_10px_24px_-8px_rgb(68_89_240/0.7)]',
  secondary: 'border border-line-strong bg-surface text-fg shadow-sm hover:border-accent/50 hover:text-accent',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant
  icon?: ReactNode
  size?: 'md' | 'sm'
}

export function ButtonLink({ variant = 'primary', icon, size = 'md', className = '', children, ...rest }: ButtonLinkProps) {
  const sizing = size === 'md' ? 'h-12 px-5 text-base' : 'h-10 px-4 text-sm'
  return (
    <a
      className={`group inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-200 active:scale-[0.98] ${sizing} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
      {icon && <span className="transition-transform duration-200 group-hover:translate-x-0.5">{icon}</span>}
    </a>
  )
}

export type TagTone = 'default' | 'accent' | 'ai' | 'success'

export function Tag({ children, tone = 'default' }: { children: ReactNode; tone?: TagTone }) {
  const tones: Record<TagTone, string> = {
    default: 'border-line bg-surface-2 text-muted',
    accent: 'border-accent/20 bg-accent-dim text-accent-strong',
    ai: 'border-ai/20 bg-ai-dim text-ai-strong',
    success: 'border-success/20 bg-success-dim text-success',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.8125rem] font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

interface SectionHeadingProps {
  eyebrow: string
  title: ReactNode
  intro?: ReactNode
  id?: string
  /** Kept for content clarity in callers; not rendered. */
  index?: string
  align?: 'left' | 'split'
}

/** Label above a single strong headline, with an optional intro beside or below it. */
export function SectionHeading({ eyebrow, title, intro, id, align = 'split' }: SectionHeadingProps) {
  return (
    <Reveal className={align === 'split' ? 'grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10' : 'max-w-3xl'}>
      <div className={align === 'split' ? 'lg:col-span-7' : ''}>
        <p className="text-sm font-semibold text-accent">{eyebrow}</p>
        <h2 id={id} className="mt-3 text-headline font-semibold text-fg">
          {title}
        </h2>
      </div>
      {intro && (
        <p className={`text-lg leading-relaxed text-muted ${align === 'split' ? 'lg:col-span-5' : 'mt-5'}`}>{intro}</p>
      )}
    </Reveal>
  )
}

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </m.div>
  )
}

export function Section({
  id,
  labelledBy,
  children,
  className = '',
  tone = 'light',
}: {
  id: string
  labelledBy: string
  children: ReactNode
  className?: string
  tone?: 'light' | 'dark'
}) {
  if (tone === 'dark') {
    return (
      <section id={id} aria-labelledby={labelledBy} className={`theme-dark relative isolate overflow-hidden bg-bg ${className}`}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(50%_60%_at_20%_0%,rgb(82_107_255/0.22),transparent_70%),radial-gradient(40%_50%_at_85%_10%,rgb(185_167_255/0.16),transparent_70%)]"
        />
        <div className="container-page py-20 md:py-28 lg:py-32">{children}</div>
      </section>
    )
  }
  return (
    <section id={id} aria-labelledby={labelledBy} className={`container-page py-20 md:py-28 lg:py-32 ${className}`}>
      {children}
    </section>
  )
}

/**
 * Stand-in for a link whose URL isn't configured. Production renders nothing (no
 * placeholder links ship); development shows a disabled pill naming the variable.
 */
export function MissingConfig({ label, variable }: { label: string; variable: string }) {
  if (!import.meta.env.DEV) return null
  return (
    <span
      aria-disabled="true"
      title={`Set ${variable} to enable`}
      className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-full border border-dashed border-line-strong px-3.5 text-sm text-subtle"
    >
      {label} <span className="font-mono text-xs">· set {variable}</span>
    </span>
  )
}
