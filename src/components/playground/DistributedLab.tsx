import { useState } from 'react'
import { Play } from 'lucide-react'
import { distributedExplanation } from '../../content/playground'
import {
  addLatency,
  initialLab,
  injectFailure,
  recoverService,
  startWorkflow,
  TIMEOUT_MS,
  triggerTimeout,
  type LabState,
  type ServiceId,
  type Span,
  type WorkflowRun,
  type WorkflowStep,
} from '../../lib/sim/distributed'
import { Control, ControlGroup, ExplanationPanel, SimFrame } from './ui'

// Layout of the service map (percent of the panel).
const POS: Record<ServiceId, { x: number; y: number }> = {
  gateway: { x: 10, y: 50 },
  lead: { x: 36, y: 16 },
  payout: { x: 36, y: 50 },
  wallet: { x: 36, y: 84 },
  broker: { x: 64, y: 50 },
  notification: { x: 90, y: 50 },
  mysql: { x: 64, y: 84 },
}
const LINKS: [ServiceId, ServiceId][] = [
  ['gateway', 'lead'],
  ['gateway', 'payout'],
  ['gateway', 'wallet'],
  ['payout', 'broker'],
  ['broker', 'notification'],
  ['lead', 'mysql'],
  ['wallet', 'mysql'],
  ['payout', 'mysql'],
]

const stepStyle: Record<WorkflowStep['status'], string> = {
  pending: 'text-subtle ring-line',
  done: 'bg-success-dim text-success ring-success/30',
  failed: 'bg-coral-dim text-coral ring-coral/40',
  compensated: 'bg-ai-dim text-ai-strong ring-ai/40',
  skipped: 'text-subtle ring-line',
  deferred: 'bg-[#f5c86b]/15 text-[#f5c86b] ring-[#f5c86b]/30',
}

const outcomeLabel: Record<WorkflowRun['outcome'], string> = {
  completed: 'Completed',
  'completed-with-warnings': 'Completed with fallback',
  compensated: 'Failed → compensated',
}

export function DistributedLab() {
  const [lab, setLab] = useState<LabState>(initialLab)
  const [target, setTarget] = useState<ServiceId>('wallet')
  const [openTrace, setOpenTrace] = useState<number | null>(null)

  const run = openTrace !== null ? lab.runs[openTrace] : lab.runs.at(-1)
  const svc = lab.services[target]

  const start = () => {
    const next = startWorkflow(lab)
    setLab(next)
    setOpenTrace(next.runs.length - 1)
  }

  return (
    <div className="space-y-8">
      <SimFrame
        title="Payout workflow across services"
        kinds={['conceptual']}
        onReset={() => {
          setLab(initialLab())
          setOpenTrace(null)
        }}
      >
        <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <ControlGroup label="Workflow">
              <Control tone="primary" onClick={start}>
                <Play className="size-3.5" aria-hidden /> Start workflow
              </Control>
            </ControlGroup>
            <div>
              <label htmlFor="target-svc" className="mb-2 block text-sm font-semibold text-subtle">
                Target service
              </label>
              <select
                id="target-svc"
                value={target}
                onChange={(e) => setTarget(e.target.value as ServiceId)}
                className="h-11 w-full rounded-lg bg-surface-2 px-3 text-fg ring-1 ring-line focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {Object.values(lab.services).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <ControlGroup label={`Fault injection · ${svc.label}`}>
              <Control tone="danger" onClick={() => setLab(injectFailure(lab, target))}>
                Inject service failure
              </Control>
              <Control tone="danger" onClick={() => setLab(addLatency(lab, target))}>
                Add 400ms latency
              </Control>
              <Control tone="danger" onClick={() => setLab(triggerTimeout(lab, target))}>
                Trigger timeout
              </Control>
              <Control onClick={() => setLab(recoverService(lab, target))}>Recover service</Control>
            </ControlGroup>
            <p className="rounded-xl bg-bg/60 p-4 text-sm leading-relaxed text-muted ring-1 ring-line">
              Calls time out at {TIMEOUT_MS}ms and retry up to 3 times with 100ms → 200ms backoff. Three consecutive failures open a
              service’s circuit; recovering it moves the breaker to half-open, and one successful trial closes it.
            </p>
          </div>

          <div className="min-w-0 space-y-6 lg:col-span-8">
            <ServiceMap lab={lab} target={target} onSelect={setTarget} />
            <p className="sr-only" aria-live="polite">
              {run ? `Run ${lab.runs.indexOf(run) + 1}: ${outcomeLabel[run.outcome]}` : ''}
            </p>
            {run ? <RunView run={run} /> : <p className="text-sm text-muted">Start a workflow to see the saga and its trace.</p>}
          </div>
        </div>

        {lab.runs.length > 0 && (
          <div className="border-t border-line px-5 py-5 sm:px-6">
            <p className="mb-3 text-sm font-semibold text-subtle">Run history — open a trace</p>
            <ul className="flex flex-wrap gap-2">
              {lab.runs.map((r, i) => (
                <li key={r.traceId}>
                  <button
                    type="button"
                    aria-pressed={(openTrace ?? lab.runs.length - 1) === i}
                    onClick={() => setOpenTrace(i)}
                    className="rounded-lg px-3 py-2 text-left text-sm ring-1 ring-line transition-colors hover:ring-accent/60 aria-pressed:bg-accent-dim aria-pressed:ring-accent/50"
                  >
                    <span className="block font-medium text-fg">Run {i + 1}</span>
                    <span className={`block ${r.outcome === 'compensated' ? 'text-coral' : r.outcome === 'completed' ? 'text-success' : 'text-[#f5c86b]'}`}>
                      {outcomeLabel[r.outcome]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SimFrame>
      <ExplanationPanel explanation={distributedExplanation} />
    </div>
  )
}

function ServiceMap({ lab, target, onSelect }: { lab: LabState; target: ServiceId; onSelect: (id: ServiceId) => void }) {
  return (
    <>
    <ul className="grid grid-cols-2 gap-2 sm:hidden" aria-label="Services">
      {Object.values(lab.services).map((s) => (
        <li key={s.id}>
          <button
            type="button"
            aria-pressed={target === s.id}
            onClick={() => onSelect(s.id)}
            className={`w-full rounded-xl px-3 py-2 text-left ring-1 ${s.health === 'down' ? 'bg-coral-dim ring-coral' : s.extraLatencyMs > 0 ? 'bg-[#f5c86b]/10 ring-[#f5c86b]' : 'bg-surface ring-line-strong'} ${target === s.id ? 'shadow-glow' : ''}`}
          >
            <span className="block text-sm font-semibold text-fg">{s.label}</span>
            <span className="block text-xs text-muted">
              {s.health === 'down' ? 'down' : `${s.baseMs + s.extraLatencyMs}ms`}
              {s.breaker !== 'closed' && <span className="text-coral"> · {s.breaker}</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
    <div className="relative hidden rounded-2xl bg-bg/60 ring-1 ring-line sm:block sm:h-80">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
        {LINKS.map(([a, b]) => {
          const bad = lab.services[a].health === 'down' || lab.services[b].health === 'down'
          return (
            <line
              key={`${a}-${b}`}
              x1={POS[a].x}
              y1={POS[a].y}
              x2={POS[b].x}
              y2={POS[b].y}
              stroke={bad ? 'var(--color-coral)' : 'var(--color-accent)'}
              strokeOpacity={bad ? 0.7 : 0.45}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              className="edge-flow"
            />
          )
        })}
      </svg>
      {Object.values(lab.services).map((s) => {
        const tone = s.health === 'down' ? 'ring-coral bg-coral-dim' : s.extraLatencyMs > 0 ? 'ring-[#f5c86b] bg-[#f5c86b]/10' : 'ring-line-strong bg-surface'
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={target === s.id}
            onClick={() => onSelect(s.id)}
            style={{ left: `${POS[s.id].x}%`, top: `${POS[s.id].y}%` }}
            className={`absolute w-[6.5rem] -translate-x-1/2 -translate-y-1/2 rounded-xl px-2 py-1.5 text-left ring-1 transition-shadow sm:w-32 sm:px-3 sm:py-2 ${tone} ${target === s.id ? 'shadow-glow' : ''}`}
          >
            <span className="block text-[0.8125rem] leading-tight font-semibold text-fg sm:text-sm">{s.label}</span>
            <span className="mt-0.5 block text-xs text-muted">
              {s.health === 'down' ? 'down' : `${s.baseMs + s.extraLatencyMs}ms`}
              {s.breaker !== 'closed' && <span className="text-coral"> · {s.breaker}</span>}
            </span>
          </button>
        )
      })}
    </div>
    </>
  )
}

function RunView({ run }: { run: WorkflowRun }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-subtle">Saga steps</p>
          <p className={`text-sm font-medium ${run.outcome === 'compensated' ? 'text-coral' : run.outcome === 'completed' ? 'text-success' : 'text-[#f5c86b]'}`}>
            {outcomeLabel[run.outcome]}
          </p>
        </div>
        <ol className="mt-3 grid gap-2 sm:grid-cols-5">
          {run.steps.map((st, i) => (
            <li key={st.id} className={`rounded-xl px-3 py-2.5 ring-1 ${stepStyle[st.status]}`}>
              <span className="block text-xs opacity-80">Step {i + 1}</span>
              <span className="block text-sm font-semibold">{st.label}</span>
              <span className="mt-0.5 block text-xs capitalize opacity-90">{st.status}</span>
              {st.detail && <span className="mt-1 block text-xs normal-case opacity-90">{st.detail}</span>}
            </li>
          ))}
        </ol>
        {run.log.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {run.log.map((l, i) => (
              <li key={i}>· {l}</li>
            ))}
          </ul>
        )}
      </div>
      <TraceView run={run} />
    </div>
  )
}

function depthOf(span: Span, spans: Span[]): number {
  let d = 0
  let cur = span
  while (cur.parentId) {
    const parent = spans.find((s) => s.spanId === cur.parentId)
    if (!parent) break
    d++
    cur = parent
  }
  return d
}

function TraceView({ run }: { run: WorkflowRun }) {
  const total = Math.max(...run.spans.map((s) => s.end), 1)
  const failed = run.spans.find((s) => s.status === 'error' && s.parentId !== null)
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-subtle">OpenTelemetry-style trace (simulated)</p>
        <p className="font-mono text-xs text-subtle">trace_id {run.traceId}</p>
      </div>
      {failed && (
        <p className="mt-2 text-sm text-coral">
          First failing span: <span className="font-medium">{failed.operation}</span> in {failed.service}
          {failed.note ? ` — ${failed.note}` : ''}
        </p>
      )}
      <div className="mt-3 overflow-x-auto rounded-xl ring-1 ring-line">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="bg-bg/60 text-subtle">
            <tr>
              {['Operation', 'Service', 'span_id / parent', 'Duration', 'Timeline'].map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {run.spans.map((s) => (
              <tr key={s.spanId} className="border-t border-line">
                <td className="px-3 py-1.5 text-fg" style={{ paddingLeft: `${0.75 + depthOf(s, run.spans) * 0.9}rem` }}>
                  {s.operation}
                  {s.note && <span className="block text-xs text-coral">{s.note}</span>}
                </td>
                <td className="px-3 py-1.5 text-muted">{s.service}</td>
                <td className="px-3 py-1.5 font-mono text-xs text-subtle">
                  {s.spanId.slice(-4)} / {s.parentId ? s.parentId.slice(-4) : 'root'}
                </td>
                <td className="px-3 py-1.5 font-mono text-muted">{s.end - s.start}ms</td>
                <td className="w-1/3 px-3 py-1.5">
                  <div className="relative h-2.5 rounded-full bg-line">
                    <div
                      className={`absolute h-full rounded-full ${s.status === 'error' ? 'bg-coral' : 'bg-accent'}`}
                      style={{ left: `${(s.start / total) * 100}%`, width: `${Math.max(0.8, ((s.end - s.start) / total) * 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
