import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ChevronDown, RotateCcw } from 'lucide-react'
import { provenance, type Explanation, type Provenance } from '../../content/playground'
import type { LedgerEntry, Wallet } from '../../lib/sim/ledger'
import { formatINR } from '../../lib/sim/money'
import type { TimelineItem } from '../../lib/sim/outbox'

const provenanceStyle: Record<Provenance, string> = {
  implemented: 'bg-success-dim text-success ring-success/30',
  simulated: 'bg-accent-dim text-accent-strong ring-accent/30',
  conceptual: 'bg-ai-dim text-ai-strong ring-ai/30',
}

export function ProvenanceBadge({ kind }: { kind: Provenance }) {
  return (
    <span
      title={provenance[kind].detail}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8125rem] font-medium ring-1 ${provenanceStyle[kind]}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {provenance[kind].label}
    </span>
  )
}

export function SimFrame({
  title,
  kinds,
  onReset,
  children,
}: {
  title: string
  kinds: Provenance[]
  onReset?: () => void
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-surface ring-1 ring-line">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4 sm:px-6">
        <h4 className="text-lg font-semibold text-fg">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {kinds.map((k) => (
            <ProvenanceBadge key={k} kind={k} />
          ))}
        </div>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <RotateCcw className="size-4" aria-hidden /> Reset simulation
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

type ControlTone = 'primary' | 'default' | 'danger'

export function Control({
  tone = 'default',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: ControlTone }) {
  const tones: Record<ControlTone, string> = {
    primary: 'bg-fg text-[#101827] hover:bg-white',
    default: 'bg-surface-2 text-fg ring-1 ring-line hover:ring-accent/60',
    danger: 'bg-coral-dim text-coral ring-1 ring-coral/30 hover:ring-coral/70',
  }
  return (
    <button
      type="button"
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-[box-shadow,background-color,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export function ControlGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-2 text-sm font-semibold text-subtle">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

const kindStyle: Record<TimelineItem['kind'], string> = {
  business: 'bg-accent',
  outbox: 'bg-ai',
  worker: 'bg-subtle',
  ledger: 'bg-success',
  failure: 'bg-coral',
  recovery: 'bg-success',
  alert: 'bg-coral',
  rejected: 'bg-coral',
  info: 'bg-line-strong',
}

/** Event history, newest first. The newest entry is announced to screen readers. */
export function Timeline({ items, title = 'Timeline', maxHeight = 'max-h-[26rem]' }: { items: TimelineItem[]; title?: string; maxHeight?: string }) {
  const newest = items.at(-1)
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-subtle">{title}</p>
      <p className="sr-only" aria-live="polite">
        {newest?.text}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted">Nothing has happened yet — use the controls to start.</p>
      ) : (
        <ol className={`space-y-2.5 overflow-y-auto pr-1 ${maxHeight}`}>
          {[...items].reverse().map((item, i) => (
            <li key={`${items.length - i}`} className="grid grid-cols-[3.25rem_0.75rem_1fr] items-baseline gap-x-2 text-sm">
              <span className="font-mono text-xs text-subtle tabular-nums">t{item.t}</span>
              <span className={`size-2 translate-y-[-1px] rounded-full ${kindStyle[item.kind]}`} aria-hidden />
              <span className={`leading-relaxed ${item.kind === 'rejected' || item.kind === 'failure' || item.kind === 'alert' ? 'text-coral' : 'text-muted'} ${i === 0 ? 'text-fg' : ''}`}>
                {item.text}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** Value that briefly highlights whenever it changes. */
function AnimatedAmount({ value, className = '' }: { value: number; className?: string }) {
  const prev = useRef(value)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  useEffect(() => {
    if (value !== prev.current) {
      setFlash(value > prev.current ? 'up' : 'down')
      prev.current = value
      const id = window.setTimeout(() => setFlash(null), 900)
      return () => window.clearTimeout(id)
    }
  }, [value])
  return (
    <span
      className={`rounded px-1 font-mono tabular-nums transition-colors duration-500 ${
        flash === 'up' ? 'bg-success-dim text-success' : flash === 'down' ? 'bg-coral-dim text-coral' : ''
      } ${className}`}
    >
      {formatINR(value)}
    </span>
  )
}

export function WalletBuckets({ wallet, compact = false }: { wallet: Wallet; compact?: boolean }) {
  const buckets: [string, number][] = [
    ['Available', wallet.available],
    ['Under review', wallet.underReview],
    ['Lifetime earned', wallet.lifetimeEarned],
    ['Lifetime reversed', wallet.lifetimeReversed],
    ['Lifetime redeemed', wallet.lifetimeRedeemed],
  ]
  return (
    <dl className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {buckets.map(([label, value], i) => (
        <div key={label} className={`rounded-xl bg-bg/60 px-3 py-2.5 ring-1 ring-line ${i === 0 ? 'col-span-2 sm:col-span-1' : ''}`}>
          <dt className="text-sm text-subtle">{label}</dt>
          <dd className={`mt-0.5 font-semibold text-fg ${i === 0 ? 'text-xl' : 'text-base'}`}>
            <AnimatedAmount value={value} className="-mx-1" />
          </dd>
        </div>
      ))}
      <div className="rounded-xl bg-bg/60 px-3 py-2.5 ring-1 ring-line">
        <dt className="text-sm text-subtle">Wallet version</dt>
        <dd className="mt-0.5 font-mono text-base font-semibold text-fg tabular-nums">v{wallet.version}</dd>
      </div>
    </dl>
  )
}

export function LedgerTable({ entries }: { entries: LedgerEntry[] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-subtle">Wallet ledger</p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">No ledger entries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-line">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-bg/60 text-subtle">
              <tr>
                {['#', 'Class', 'Amount', 'Idempotency key', 'Available after'].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {entries.map((e) => (
                  <m.tr
                    key={e.seq}
                    initial={{ opacity: 0, backgroundColor: 'rgba(140,155,255,0.18)' }}
                    animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }}
                    transition={{ duration: 0.8 }}
                    className="border-t border-line"
                  >
                    <td className="px-3 py-2 font-mono text-subtle">{e.seq}</td>
                    <td className="px-3 py-2 font-medium text-fg">{e.entryClass}</td>
                    <td className={`px-3 py-2 font-mono ${e.type === 'Add' ? 'text-success' : 'text-coral'}`}>
                      {e.type === 'Add' ? '+' : '−'}
                      {formatINR(e.amount)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted">{e.idempotencyKey}</td>
                    <td className="px-3 py-2 font-mono text-fg">{formatINR(e.availableAfter)}</td>
                  </m.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Horizontal (desktop) / vertical (mobile) flow with stages lit up to `reached`. */
export function Pipeline({ stages, reached, label }: { stages: string[]; reached: number; label: string }) {
  return (
    <ol aria-label={label} className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
      {stages.map((stage, i) => {
        const on = i < reached
        const current = i === reached - 1
        return (
          <li key={stage} className="flex items-center gap-2 md:contents">
            <span
              aria-current={current ? 'step' : undefined}
              className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-medium ring-1 transition-colors duration-500 ${
                current ? 'bg-accent text-[#101827] ring-accent' : on ? 'bg-accent-dim text-fg ring-accent/40' : 'text-subtle ring-line'
              }`}
            >
              {stage}
            </span>
            {i < stages.length - 1 && (
              <svg viewBox="0 0 40 8" className="hidden h-2 w-8 shrink-0 md:block" aria-hidden>
                <line x1="0" y1="4" x2="40" y2="4" stroke={i < reached - 1 ? 'var(--color-accent)' : 'var(--color-line-strong)'} strokeWidth="2" className={i < reached - 1 ? 'edge-flow' : ''} />
              </svg>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export function ExplanationPanel({ explanation }: { explanation: Explanation }) {
  const [open, setOpen] = useState(false)
  const id = `explain-${explanation.diagram.join('-').replace(/\W+/g, '').slice(0, 24)}`
  const list = (title: string, items: string[]) => (
    <section>
      <h5 className="font-semibold text-fg">{title}</h5>
      <ul className="mt-2 space-y-2">
        {items.map((x) => (
          <li key={x} className="flex gap-2.5 leading-relaxed text-muted">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            {x}
          </li>
        ))}
      </ul>
    </section>
  )
  return (
    <div className="rounded-2xl bg-surface ring-1 ring-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left sm:px-6"
      >
        <span>
          <span className="block font-semibold text-fg">Technical deep dive</span>
          <span className="block text-sm text-muted">Problem, mechanism, database consistency, trade-offs and what’s real vs simulated</span>
        </span>
        <ChevronDown className={`size-5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div id={id} className="grid gap-8 border-t border-line px-5 py-6 sm:px-6 lg:grid-cols-2">
          <div className="space-y-6">
            <section>
              <h5 className="font-semibold text-fg">The problem</h5>
              <p className="mt-2 leading-relaxed text-muted">{explanation.problem}</p>
            </section>
            <section>
              <h5 className="font-semibold text-fg">Why it happens</h5>
              <p className="mt-2 leading-relaxed text-muted">{explanation.why}</p>
            </section>
            <section>
              <h5 className="font-semibold text-fg">Engineering solution</h5>
              <p className="mt-2 leading-relaxed text-muted">{explanation.solution}</p>
              <p className="mt-3 font-mono text-sm text-accent">{explanation.diagram.join('  →  ')}</p>
            </section>
            {list('Database consistency', explanation.database)}
            {list('Failure scenarios', explanation.failures)}
          </div>
          <div className="space-y-6">
            {list('Trade-offs', explanation.tradeoffs)}
            <section>
              <h5 className="font-semibold text-fg">Where this matters</h5>
              <p className="mt-2 leading-relaxed text-muted">{explanation.realWorld}</p>
            </section>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-success-dim p-4">
                <p className="text-sm font-semibold text-success">Implemented in my backend</p>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-fg">
                  {explanation.implemented.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-ai-dim p-4">
                <p className="text-sm font-semibold text-ai">Simulated or conceptual here</p>
                <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-fg">
                  {explanation.simulatedOnly.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </div>
            <section>
              <h5 className="font-semibold text-fg">Pseudocode</h5>
              <pre className="mt-2 overflow-x-auto rounded-xl bg-bg/80 p-4 font-mono text-[0.8125rem] leading-relaxed text-muted ring-1 ring-line">
                {explanation.pseudocode}
              </pre>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
