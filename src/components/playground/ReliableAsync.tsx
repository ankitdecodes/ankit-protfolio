import { useState } from 'react'
import { BellRing, Database, Play } from 'lucide-react'
import { asyncExplanation } from '../../content/playground'
import { formatINR, rupees } from '../../lib/sim/money'
import {
  advance,
  approveLead,
  armCrash,
  BATCH_SIZE,
  dbFailureDuringBatch,
  initialOutboxState,
  MAX_ATTEMPTS,
  MAX_RETRY_DELAY_S,
  replayCompleted,
  RETRY_BASE_S,
  retryNext,
  setDbDown,
  setFailMode,
  STALE_RECLAIM_S,
  unapproveLead,
  WORKER_INTERVAL_S,
  workerTick,
  type OutboxEvent,
  type OutboxState,
} from '../../lib/sim/outbox'
import { delay, prefersReducedMotion } from './timing'
import { Control, ControlGroup, ExplanationPanel, SimFrame, Timeline } from './ui'

const LEADS = [
  { id: 'LD-31001', agentId: 'AG-2201', amount: rupees(1500) },
  { id: 'LD-31002', agentId: 'AG-2201', amount: rupees(900) },
  { id: 'LD-31003', agentId: 'AG-2201', amount: rupees(2000) },
]
const fresh = () => initialOutboxState(LEADS)

const statusStyle: Record<OutboxEvent['status'], string> = {
  PENDING: 'bg-accent-dim text-accent-strong',
  PROCESSING: 'bg-[#f5c86b]/15 text-[#f5c86b]',
  DONE: 'bg-success-dim text-success',
  FAILED: 'bg-coral-dim text-coral',
}

const CONFIG: [string, string][] = [
  ['Worker interval', `${WORKER_INTERVAL_S} seconds`],
  ['Batch size', String(BATCH_SIZE)],
  ['Maximum attempts', String(MAX_ATTEMPTS)],
  ['Stale reclaim (default)', `${STALE_RECLAIM_S / 60} minutes`],
  ['Retry base', `${RETRY_BASE_S} seconds`],
  ['Maximum retry delay', `${MAX_RETRY_DELAY_S / 3600} hour`],
]

export function ReliableAsync() {
  const [s, setS] = useState<OutboxState>(fresh)
  const [inspect, setInspect] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const nextLead = s.leads.find((l) => l.status !== 'APPROVED')
  const approved = s.leads.find((l) => l.status === 'APPROVED')
  const selected = s.events.find((e) => e.id === inspect) ?? null

  const play = async (steps: ((x: OutboxState) => OutboxState)[]) => {
    setBusy(true)
    setInspect(null)
    let cur = fresh()
    setS(cur)
    for (const step of steps) {
      if (!prefersReducedMotion()) await delay(550)
      cur = step(cur)
      setS(cur)
    }
    setBusy(false)
  }

  const approve1 = (x: OutboxState) => approveLead(x, 'LD-31001')
  const crashApp = (x: OutboxState) => ({
    ...x,
    timeline: [...x.timeline, { t: x.clock, kind: 'failure' as const, text: 'Application crashed right after the commit — nothing was processed yet' }],
  })
  const fastForward = (x: OutboxState) => advance(x, STALE_RECLAIM_S)

  const scenarios = [
    { id: 'A', label: 'Commit, then app crash', steps: [approve1, crashApp, workerTick] },
    { id: 'B', label: 'Worker crash after processing', steps: [approve1, armCrash, workerTick, fastForward, workerTick] },
    { id: 'C', label: 'Database connection failure', steps: [approve1, dbFailureDuringBatch, workerTick, (x: OutboxState) => setDbDown(x, false), fastForward, workerTick] },
    {
      id: 'D',
      label: 'Repeated failures → FAILED',
      steps: [approve1, (x: OutboxState) => setFailMode(x, 'always'), ...Array.from({ length: MAX_ATTEMPTS }, () => retryNext)],
    },
    { id: 'E', label: 'Lead reversal', steps: [approve1, workerTick, (x: OutboxState) => unapproveLead(x, 'LD-31001'), workerTick, replayCompleted, workerTick] },
  ]

  return (
    <div className="space-y-8">
      <SimFrame title="Transactional outbox environment" kinds={['implemented', 'simulated']} onReset={() => setS(fresh())}>
        <ArchitectureStrip dbDown={s.dbDown} />

        <div className="flex flex-wrap items-center gap-2 border-y border-line px-5 py-4 sm:px-6">
          <span className="mr-1 text-sm font-semibold text-subtle">Play a scenario:</span>
          {scenarios.map((sc) => (
            <Control key={sc.id} onClick={() => play(sc.steps)} disabled={busy}>
              <Play className="size-3.5" aria-hidden /> {sc.id} · {sc.label}
            </Control>
          ))}
        </div>

        <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-4">
            <ControlGroup label="Business events">
              <Control tone="primary" onClick={() => nextLead && setS(approveLead(s, nextLead.id))} disabled={busy || !nextLead}>
                Create outbox event{nextLead ? ` (${nextLead.id})` : ''}
              </Control>
              <Control onClick={() => approved && setS(unapproveLead(s, approved.id))} disabled={busy || !approved}>
                Reverse lead (LeadUnapproved)
              </Control>
            </ControlGroup>
            <ControlGroup label="Worker">
              <Control onClick={() => setS(workerTick(s))} disabled={busy}>
                Process (worker tick)
              </Control>
              <Control onClick={() => setS(retryNext(s))} disabled={busy}>
                Retry event
              </Control>
              <Control onClick={() => setS(workerTick(advance(s, STALE_RECLAIM_S)))} disabled={busy}>
                Reclaim stale event
              </Control>
              <Control onClick={() => setS(replayCompleted(s))} disabled={busy}>
                Replay completed event
              </Control>
            </ControlGroup>
            <ControlGroup label="Fault injection">
              <Control tone="danger" onClick={() => setS(armCrash(s))} disabled={busy}>
                Crash worker
              </Control>
              <Control tone="danger" onClick={() => setS(s.dbDown ? setDbDown(s, false) : dbFailureDuringBatch(s))} disabled={busy}>
                {s.dbDown ? 'Restore database' : 'Simulate DB failure'}
              </Control>
              <Control tone="danger" onClick={() => setS(setFailMode(s, s.failMode === 'none' ? 'next' : 'none'))} disabled={busy}>
                {s.failMode === 'none' ? 'Fail next attempt' : 'Clear failure'}
              </Control>
              <Control tone="danger" onClick={() => setS(setFailMode(s, 'always'))} disabled={busy || s.failMode === 'always'}>
                Fail every attempt
              </Control>
            </ControlGroup>

            <div className="rounded-2xl bg-bg/60 p-4 ring-1 ring-line">
              <p className="text-sm font-semibold text-subtle">Worker configuration</p>
              <p className="mt-0.5 text-sm text-subtle">Defaults from my worker; some are environment-configurable.</p>
              <dl className="mt-3 divide-y divide-line">
                {CONFIG.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-1.5 text-sm">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-mono text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 font-mono text-xs text-subtle">delay = min(3600, 2^attempt × 5) s</p>
            </div>
          </div>

          <div className="min-w-0 space-y-6 lg:col-span-8">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <span className="text-muted">
                Clock <span className="font-mono text-fg">t={s.clock}s</span>
              </span>
              <span className="text-muted">
                Agent wallet <span className="font-mono text-fg">{formatINR(s.ledger.wallet.available)}</span>
              </span>
              <span className="text-muted">
                Ledger entries <span className="font-mono text-fg">{s.ledger.entries.length}</span>
              </span>
              <span className={s.dbDown ? 'font-medium text-coral' : 'text-muted'}>Database {s.dbDown ? 'DOWN' : 'up'}</span>
            </div>

            <OutboxTable events={s.events} selected={inspect} onInspect={(id) => setInspect(id === inspect ? null : id)} />
            {selected && <EventInspector event={selected} />}

            <div className="grid gap-6 xl:grid-cols-2">
              <Timeline items={s.timeline} title="Detailed timeline" maxHeight="max-h-96" />
              <div>
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-subtle">
                  <BellRing className="size-4" aria-hidden /> Alerts
                </p>
                {s.alerts.length === 0 ? (
                  <p className="text-sm text-muted">No alerts. Drain failures, stale reclaims and FAILED events raise critical alerts.</p>
                ) : (
                  <ul className="space-y-2">
                    {s.alerts.map((a, i) => (
                      <li key={i} className="rounded-lg bg-coral-dim px-3 py-2 text-sm text-coral">
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </SimFrame>

      <Comparison />
      <ExplanationPanel explanation={asyncExplanation} />
    </div>
  )
}

function ArchitectureStrip({ dbDown }: { dbDown: boolean }) {
  return (
    <div className="grid gap-4 px-5 py-6 sm:px-6 lg:grid-cols-[1fr_auto_1.4fr_auto_1fr] lg:items-center">
      <div className="rounded-2xl bg-bg/60 p-4 ring-1 ring-line">
        <p className="font-semibold text-fg">Business transaction</p>
        <p className="mt-1 text-sm text-muted">Lead approval + outbox insert, one COMMIT</p>
      </div>
      <span aria-hidden className="hidden text-subtle lg:block">→</span>
      <div className={`rounded-2xl p-4 ring-1 ${dbDown ? 'bg-coral-dim ring-coral/40' : 'bg-accent-dim ring-accent/30'}`}>
        <p className="flex items-center gap-2 font-semibold text-fg">
          <Database className="size-4" aria-hidden /> MySQL {dbDown && <span className="text-sm text-coral">· unavailable</span>}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <span className="rounded-lg bg-bg/70 px-2.5 py-1.5 text-muted">leads · wallets · ledger</span>
          <span className="rounded-lg bg-bg/70 px-2.5 py-1.5 font-medium text-fg">v2_outbox_events</span>
        </div>
      </div>
      <span aria-hidden className="hidden text-subtle lg:block">⇄</span>
      <div className="rounded-2xl bg-bg/60 p-4 ring-1 ring-line">
        <p className="font-semibold text-fg">Polling worker</p>
        <p className="mt-1 text-sm text-muted">Every 10s: reclaim → claim (SKIP LOCKED) → process → DONE</p>
      </div>
    </div>
  )
}

function OutboxTable({ events, selected, onInspect }: { events: OutboxEvent[]; selected: string | null; onInspect: (id: string) => void }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-subtle">v2_outbox_events — select a row to inspect it</p>
      {events.length === 0 ? (
        <p className="rounded-xl bg-bg/60 p-4 text-sm text-muted ring-1 ring-line">The outbox is empty. Create an outbox event to begin.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl ring-1 ring-line">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-bg/60 text-subtle">
              <tr>
                {['Event', 'Aggregate', 'Type', 'Cycle', 'Status', 'Retries', 'Created', 'Available', 'Processed', 'Last error'].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className={`border-t border-line ${selected === e.id ? 'bg-accent-dim' : ''}`}>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onInspect(e.id)}
                      aria-pressed={selected === e.id}
                      className="rounded font-mono whitespace-nowrap text-accent underline-offset-2 hover:underline"
                    >
                      {e.id}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono text-muted">{e.aggregateId}</td>
                  <td className="px-3 py-2 text-fg">{e.eventType}</td>
                  <td className="px-3 py-2 font-mono text-muted">c{e.payoutCycle}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[0.8125rem] font-medium ${statusStyle[e.status]}`}>{e.status}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-fg">{e.attempts}</td>
                  <td className="px-3 py-2 font-mono text-muted">{e.createdAt}s</td>
                  <td className="px-3 py-2 font-mono text-muted">{e.availableAt}s</td>
                  <td className="px-3 py-2 font-mono text-muted">{e.processedAt === null ? '—' : `${e.processedAt}s`}</td>
                  <td className="max-w-[14rem] truncate px-3 py-2 text-muted" title={e.lastError ?? undefined}>
                    {e.lastError ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EventInspector({ event }: { event: OutboxEvent }) {
  return (
    <div className="rounded-2xl bg-bg/60 p-5 ring-1 ring-line">
      <p className="font-semibold text-fg">Inspecting {event.id}</p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-subtle">Idempotency key</dt>
          <dd className="font-mono break-all text-fg">{event.idempotencyKey}</dd>
        </div>
        <div>
          <dt className="text-subtle">Status / attempts</dt>
          <dd className="font-mono text-fg">
            {event.status} · {event.attempts}/{MAX_ATTEMPTS}
          </dd>
        </div>
      </dl>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-bg p-3 font-mono text-[0.8125rem] text-muted ring-1 ring-line">
        {JSON.stringify({ ...event.payload, amount: `${event.payload.amount} paise` }, null, 2)}
      </pre>
    </div>
  )
}

function Comparison() {
  const rows: [string, string, string][] = [
    ['Where events live', 'Rows in the same MySQL database', 'Jobs in Redis'],
    ['Atomic with the business write', 'Yes — same transaction', 'No — needs an outbox or accepts a dual write'],
    ['Delivery', 'Polling every 10s', 'Push to workers, near real-time'],
    ['Claiming', 'FOR UPDATE SKIP LOCKED', 'Broker-managed locks'],
    ['Extra infrastructure', 'None', 'Redis + queue tooling'],
    ['Exactly-once?', 'No — idempotent consumers', 'No — idempotent consumers'],
  ]
  return (
    <div className="rounded-3xl bg-surface p-5 ring-1 ring-line sm:p-6">
      <p className="text-lg font-semibold text-fg">Architecture comparison</p>
      <p className="mt-1 text-sm text-muted">
        The left column is my payout implementation. BullMQ + Redis is an alternative — I use BullMQ for MIS imports, not for this payout flow.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="text-subtle">
              <th scope="col" className="py-2 pr-4 font-medium" />
              <th scope="col" className="py-2 pr-4 font-semibold text-success">DB-backed polling worker (implemented)</th>
              <th scope="col" className="py-2 font-semibold text-ai">BullMQ + Redis (alternative)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, a, b]) => (
              <tr key={k} className="border-t border-line">
                <th scope="row" className="py-2.5 pr-4 font-medium text-fg">
                  {k}
                </th>
                <td className="py-2.5 pr-4 text-muted">{a}</td>
                <td className="py-2.5 text-muted">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
