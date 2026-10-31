import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { AlertTriangle, CheckCircle2, FlaskConical } from 'lucide-react'
import { sampleTransactions } from '../../content/lab'
import { SIGNALS, evaluate, formatMoney, scoreTransaction, type SignalId } from '../../lib/anomaly'
import { Tag } from '../ui/primitives'

const pctText = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`)

export function AnomalyExplorer() {
  const [threshold, setThreshold] = useState(0.5)
  const [enabled, setEnabled] = useState<Set<SignalId>>(() => new Set(SIGNALS.map((s) => s.id)))
  const [selectedId, setSelectedId] = useState('TX-1043')
  const evidenceRef = useRef<HTMLDivElement>(null)

  // On stacked layouts the evidence panel sits below the list, so bring it into view.
  const select = (id: string) => {
    setSelectedId(id)
    if (window.matchMedia?.('(max-width: 1023px)').matches) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      evidenceRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    }
  }

  const scored = useMemo(
    () => sampleTransactions.map((tx) => scoreTransaction(tx, enabled)).sort((a, b) => b.score - a.score),
    [enabled],
  )
  const metrics = useMemo(() => evaluate(scored, threshold), [scored, threshold])
  const selected = scored.find((s) => s.transaction.id === selectedId) ?? scored[0]!
  const flaggedCount = scored.filter((s) => s.score >= threshold).length

  const toggleSignal = (id: SignalId) =>
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
        <span className="font-mono text-xs text-muted">decision.explorer</span>
        <Tag tone="ai">Synthetic data</Tag>
        <Tag>Illustrative rule-weighted score — not a trained model</Tag>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {`${flaggedCount} of ${scored.length} transactions flagged at threshold ${threshold.toFixed(2)}. Selected ${selected.transaction.id}: score ${selected.score.toFixed(2)}, ${selected.score >= threshold ? 'flagged' : 'not flagged'}.`}
      </p>

      {/* Controls */}
      <div className="grid gap-6 border-b border-line p-4 sm:p-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="threshold" className="text-sm font-medium text-fg">
              Alert threshold
            </label>
            <output htmlFor="threshold" className="font-mono text-lg text-ai">
              {threshold.toFixed(2)}
            </output>
          </div>
          <input
            id="threshold"
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="range w-full"
            style={{ '--fill': `${((threshold - 0.1) / 0.8) * 100}%` } as CSSProperties}
            aria-describedby="threshold-help"
          />
          <p id="threshold-help" className="text-xs text-subtle">
            Lower catches more anomalies but raises more false alarms.
          </p>
        </div>
        <fieldset className="lg:col-span-7">
          <legend className="text-sm font-medium text-fg">Signals in the score</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {SIGNALS.map((s) => {
              const on = enabled.has(s.id)
              return (
                <label
                  key={s.id}
                  className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent ${
                    on ? 'border-accent/40 bg-accent-dim text-fg' : 'border-line text-subtle line-through'
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleSignal(s.id)} />
                  {s.label}
                  <span className="font-mono text-xs text-subtle no-underline">w {s.weight.toFixed(2)}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
      </div>

      <div className="grid lg:grid-cols-12">
        {/* Transaction list */}
        <div className="border-b border-line lg:col-span-6 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between px-4 py-3 font-mono text-xs text-subtle sm:px-6">
            <span>{scored.length} samples · by score</span>
            <span className="text-ai">{flaggedCount} flagged</span>
          </div>
          <ul className="lg:max-h-[30rem] lg:overflow-y-auto px-2 pb-2 sm:px-3" aria-label="Sample transactions">
            {scored.map(({ transaction: tx, score }) => {
              const flagged = score >= threshold
              const isSelected = tx.id === selected.transaction.id
              return (
                <li key={tx.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => select(tx.id)}
                    className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-lg px-3 py-2.5 text-left transition-colors sm:grid-cols-[5.5rem_1fr_7rem] ${
                      isSelected ? 'bg-surface-2 ring-1 ring-line-strong' : 'hover:bg-surface-2'
                    }`}
                  >
                    <span className="font-mono text-xs text-muted">{tx.id}</span>
                    <span className="order-3 col-span-2 truncate text-sm text-fg sm:order-none sm:col-span-1">
                      {tx.merchant} <span className="text-subtle">· {formatMoney(tx.amount)}</span>
                    </span>
                    <span className="flex items-center justify-end gap-2">
                      <span className="relative h-1.5 w-12 rounded-full bg-line" aria-hidden>
                        <span
                          className={`absolute inset-y-0 left-0 rounded-full ${flagged ? 'bg-ai' : 'bg-accent/60'}`}
                          style={{ width: `${Math.min(1, score) * 100}%` }}
                        />
                        <span className="absolute -top-1 h-3.5 w-px bg-fg/70" style={{ left: `${threshold * 100}%` }} />
                      </span>
                      <span className={`w-9 text-right font-mono text-xs ${flagged ? 'text-ai' : 'text-muted'}`}>
                        {score.toFixed(2)}
                      </span>
                      <span className="sr-only">{flagged ? 'flagged' : 'not flagged'}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Evidence panel */}
        <div ref={evidenceRef} className="scroll-mt-24 p-4 sm:p-6 lg:col-span-6">
          <EvidencePanel scored={selected} threshold={threshold} />
        </div>
      </div>

      {/* Evaluation */}
      <div className="grid gap-6 border-t border-line p-4 sm:p-6 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="flex items-center gap-2 text-sm font-medium text-fg">
            <FlaskConical className="size-4 text-accent" aria-hidden /> Evaluation at this threshold
          </p>
          <p className="mt-2 text-sm leading-relaxed text-subtle">
            Computed live against synthetic labels on {scored.length} records. Far too small a sample to mean anything
            statistically — it shows the method, not a result.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:col-span-8">
          <Metric label="Precision" value={pctText(metrics.precision)} hint="of flags were anomalous" />
          <Metric label="Recall" value={pctText(metrics.recall)} hint="of anomalies were flagged" />
          <Metric label="False alarms" value={String(metrics.falsePositives)} hint="normal but flagged" />
          <Metric label="Missed" value={String(metrics.falseNegatives)} hint="anomalous, not flagged" />
        </dl>
        <div className="md:col-span-12">
          <TradeoffChart scored={scored} threshold={threshold} />
        </div>
      </div>
    </div>
  )
}

/** Precision and recall across every threshold, computed from the labelled sample. */
function TradeoffChart({ scored, threshold }: { scored: ReturnType<typeof scoreTransaction>[]; threshold: number }) {
  const W = 640
  const H = 170
  const pad = { l: 36, r: 12, t: 12, b: 28 }
  const steps = Array.from({ length: 17 }, (_, i) => 0.1 + i * 0.05)
  const points = steps.map((t) => ({ t, ...evaluate(scored, t) }))
  const x = (t: number) => pad.l + ((t - 0.1) / 0.8) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - v) * (H - pad.t - pad.b)
  const line = (key: 'precision' | 'recall') =>
    points
      .filter((p) => p[key] !== null)
      .map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p[key]!).toFixed(1)}`)
      .join(' ')

  return (
    <figure>
      <figcaption className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
        <span className="font-medium text-fg">Precision / recall trade-off</span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded bg-accent" aria-hidden /> precision
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded bg-ai" aria-hidden /> recall
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 w-full"
        role="img"
        aria-label={`Precision and recall for thresholds 0.10 to 0.90; current threshold ${threshold.toFixed(2)}.`}
      >
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--color-line)" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} className="fill-subtle">
              {v * 100}%
            </text>
          </g>
        ))}
        {[0.1, 0.5, 0.9].map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize={11} className="fill-subtle">
            {t.toFixed(1)}
          </text>
        ))}
        <path d={line('precision')} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} />
        <path d={line('recall')} fill="none" stroke="var(--color-ai)" strokeWidth={2.5} />
        <line x1={x(threshold)} x2={x(threshold)} y1={pad.t} y2={H - pad.b} stroke="var(--color-fg)" strokeDasharray="4 4" opacity={0.7} />
      </svg>
    </figure>
  )
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg/40 p-3">
      <dt className="text-sm text-subtle">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight text-fg tabular-nums">{value}</dd>
      <dd className="text-sm text-subtle">{hint}</dd>
    </div>
  )
}

function EvidencePanel({ scored, threshold }: { scored: ReturnType<typeof scoreTransaction>; threshold: number }) {
  const { transaction: tx, score, contributions } = scored
  const flagged = score >= threshold
  const maxWeight = Math.max(...SIGNALS.map((s) => s.weight))

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-subtle">
            {tx.id} · {tx.category} · {tx.time}
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-fg">
            {tx.merchant} <span className="text-muted">{formatMoney(tx.amount)}</span>
          </h3>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${
            flagged ? 'border-ai/40 bg-ai-dim text-ai-strong' : 'border-line text-muted'
          }`}
        >
          {flagged ? <AlertTriangle className="size-3.5" aria-hidden /> : <CheckCircle2 className="size-3.5" aria-hidden />}
          {flagged ? 'Flagged for review' : 'Below threshold'}
        </span>
      </div>

      <p className="mt-4 text-sm text-muted">
        Score <span className="font-mono text-fg">{score.toFixed(2)}</span> against threshold{' '}
        <span className="font-mono text-fg">{threshold.toFixed(2)}</span>.
      </p>

      <p className="eyebrow mt-6 mb-3">Evidence, by contribution</p>
      {contributions.length === 0 ? (
        <p className="text-sm text-subtle">All signals are switched off, so there is no evidence to score.</p>
      ) : (
        <ul className="space-y-3">
          {contributions.map((c) => (
            <li key={c.signal} className={c.value > 0 ? '' : 'opacity-55'}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-fg">{c.label}</span>
                <span className="font-mono text-xs text-muted">+{c.value.toFixed(2)}</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-line" aria-hidden>
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${c.value > 0 ? 'bg-ai' : ''}`}
                  style={{ width: `${(c.value / maxWeight) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-subtle">{c.evidence}</p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 border-t border-line pt-4 font-mono text-xs text-subtle">
        Synthetic ground truth: <span className="text-muted">{tx.label}</span>
      </p>
    </div>
  )
}
