import { useState } from 'react'
import { Lock, Play } from 'lucide-react'
import { financialExplanation } from '../../content/playground'
import { formatINR, rupees } from '../../lib/sim/money'
import { advance, approveLead, armCrash, initialOutboxState, setFailMode, STALE_RECLAIM_S, workerTick, type OutboxState } from '../../lib/sim/outbox'
import { createLead, simulateConcurrent, simulateDuplicate, type ConcurrencyRun, type DuplicateReport } from '../../lib/sim/payout'
import {
  createRedeem,
  financeMarkPaid,
  initialRedeemState,
  latestRequest,
  misApprove,
  misReject,
  replayRelease,
  type RedeemState,
} from '../../lib/sim/redeem'
import { delay, prefersReducedMotion } from './timing'
import { Control, ControlGroup, ExplanationPanel, LedgerTable, Pipeline, SimFrame, Timeline, WalletBuckets } from './ui'

const LEAD = { id: 'LD-24017', agentId: 'AG-1042', amount: rupees(2500) }
const CONCURRENT = [
  { leadId: 'LD-24018', agentId: 'AG-1042', amount: rupees(1200) },
  { leadId: 'LD-24019', agentId: 'AG-1042', amount: rupees(800) },
]

const PAYOUT_STAGES = ['Lead created', 'MIS approval', 'Outbox event', 'Polling worker', 'UpdateEarningsService', 'Wallet credit', 'Ledger entry']
const REDEEM_STAGES = ['Redeem request', 'Balance hold', 'MIS decision', 'Confirm / release', 'Finance PAID']

function payoutStage(s: OutboxState): number {
  const lead = s.leads[0]
  const event = s.events.at(-1)
  if (!lead) return 0
  if (lead.status === 'CREATED') return 1
  if (!event || event.status === 'PENDING') return event ? 3 : 2
  if (event.status === 'PROCESSING') return s.ledger.entries.length ? 6 : 4
  return 7
}

export function FinancialIntegrity() {
  return (
    <div className="space-y-8">
      <PayoutSimulator />
      <RedeemSimulator />
      <ExplanationPanel explanation={financialExplanation} />
    </div>
  )
}

function PayoutSimulator() {
  const [s, setS] = useState<OutboxState>(() => initialOutboxState([]))
  const [duplicate, setDuplicate] = useState<DuplicateReport | null>(null)
  const [runs, setRuns] = useState<ConcurrencyRun[]>([])
  const [busy, setBusy] = useState(false)

  const lead = s.leads[0]
  const event = s.events.find((e) => e.eventType === 'LeadApproved')
  const stuck = s.events.some((e) => e.status === 'PROCESSING')
  const credited = s.ledger.entries.some((e) => e.referenceId === LEAD.id)

  const reset = () => {
    setS(initialOutboxState([]))
    setDuplicate(null)
    setRuns([])
  }

  /** Plays a scripted scenario from a clean state, one visible step at a time. */
  const play = async (steps: ((x: OutboxState) => OutboxState)[]) => {
    setBusy(true)
    setDuplicate(null)
    setRuns([])
    let cur = initialOutboxState([])
    setS(cur)
    for (const step of steps) {
      if (!prefersReducedMotion()) await delay(550)
      cur = step(cur)
      setS(cur)
    }
    setBusy(false)
    return cur
  }

  const create = (x: OutboxState) => createLead(x, LEAD)
  const approve = (x: OutboxState) => approveLead(x, LEAD.id)

  const scenarios = [
    { id: 'A', label: 'Normal payout', run: () => play([create, approve, workerTick]) },
    {
      id: 'B',
      label: 'Duplicate event',
      run: async () => {
        const cur = await play([create, approve, workerTick])
        const r = simulateDuplicate(cur)
        setS(r.state)
        setDuplicate(r.report)
      },
    },
    {
      id: 'C',
      label: 'Concurrent requests',
      run: async () => {
        const cur = await play([create, approve, workerTick])
        const r = simulateConcurrent(cur, CONCURRENT)
        setS(r.state)
        setRuns(r.runs)
      },
    },
    { id: 'D1', label: 'Failure before commit', run: () => play([create, approve, (x) => setFailMode(x, 'next'), workerTick, workerTick]) },
    { id: 'D2', label: 'Crash after commit', run: () => play([create, approve, armCrash, workerTick, (x) => advance(x, STALE_RECLAIM_S), workerTick]) },
  ]

  return (
    <SimFrame title="Lead-to-wallet payout" kinds={['implemented', 'simulated']} onReset={reset}>
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <Pipeline stages={PAYOUT_STAGES} reached={payoutStage(s)} label="Payout pipeline progress" />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-4 sm:px-6">
        <span className="mr-1 text-sm font-semibold text-subtle">Play a scenario:</span>
        {scenarios.map((sc) => (
          <Control key={sc.id} onClick={sc.run} disabled={busy}>
            <Play className="size-3.5" aria-hidden /> {sc.id} · {sc.label}
          </Control>
        ))}
      </div>

      <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <ControlGroup label="Lead">
            <Control tone="primary" onClick={() => setS(create(s))} disabled={busy || !!lead}>
              Create lead
            </Control>
            <Control onClick={() => setS(approve(s))} disabled={busy || !lead}>
              Approve lead (MIS)
            </Control>
          </ControlGroup>
          <ControlGroup label="Worker">
            <Control onClick={() => setS(workerTick(s))} disabled={busy}>
              Run worker tick
            </Control>
            <Control onClick={() => setS(advance(s, STALE_RECLAIM_S))} disabled={busy || !stuck}>
              Fast-forward 10 min
            </Control>
          </ControlGroup>
          <ControlGroup label="Stress it">
            <Control
              onClick={() => {
                const r = simulateDuplicate(s)
                setS(r.state)
                setDuplicate(r.report)
              }}
              disabled={busy}
            >
              Simulate duplicate
            </Control>
            <Control
              onClick={() => {
                const r = simulateConcurrent(s, CONCURRENT)
                setS(r.state)
                setRuns(r.runs)
              }}
              disabled={busy}
            >
              Simulate concurrent requests
            </Control>
            <Control tone="danger" onClick={() => setS(setFailMode(s, 'next'))} disabled={busy}>
              Inject failure (before commit)
            </Control>
            <Control tone="danger" onClick={() => setS(armCrash(s))} disabled={busy}>
              Crash after commit
            </Control>
          </ControlGroup>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-bg/60 p-4 text-sm ring-1 ring-line">
            {[
              ['Lead ID', lead?.id ?? '—'],
              ['Agent ID', lead?.agentId ?? '—'],
              ['Lead status', lead?.status ?? 'not created'],
              ['Payout cycle', lead ? `c${lead.cycle}` : '—'],
              ['Amount', formatINR(LEAD.amount)],
              ['Transaction', credited ? 'credited' : event ? 'pending' : '—'],
              ['Outbox status', event?.status ?? '—'],
              ['Attempts', String(event?.attempts ?? 0)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-subtle">{k}</dt>
                <dd className="font-mono font-medium text-fg">{v}</dd>
              </div>
            ))}
            <div className="col-span-2">
              <dt className="text-subtle">Idempotency key</dt>
              <dd className="font-mono text-xs break-all text-fg">{event?.idempotencyKey ?? '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6 lg:col-span-8">
          <WalletBuckets wallet={s.ledger.wallet} />
          {duplicate && <DuplicateCard report={duplicate} />}
          {runs.length > 0 && <ConcurrencyCard runs={runs} />}
          <div className="space-y-6">
            <LedgerTable entries={s.ledger.entries} />
            <Timeline items={s.timeline} title="Transaction history" maxHeight="max-h-80" />
          </div>
        </div>
      </div>
    </SimFrame>
  )
}

function DuplicateCard({ report }: { report: DuplicateReport }) {
  const rows = [
    ['Duplicate event creation', 'Blocked by the unique outbox idempotency key', 'ok'],
    ['Duplicate event delivery', 'Happened — the event was processed a second time', 'warn'],
    ['Duplicate business processing', report.delivery === 'absorbed' ? 'Absorbed by the unique ledger key — no second credit' : 'Wallet credited twice', report.delivery === 'absorbed' ? 'ok' : 'bad'],
  ]
  return (
    <div className="rounded-2xl bg-bg/60 p-5 ring-1 ring-line">
      <p className="font-semibold text-fg">Duplicate event — three different things</p>
      <ul className="mt-3 space-y-2">
        {rows.map(([title, detail, tone]) => (
          <li key={title} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className={`size-2 rounded-full ${tone === 'ok' ? 'bg-success' : tone === 'warn' ? 'bg-[#f5c86b]' : 'bg-coral'}`} aria-hidden />
            <span className="font-medium text-fg">{title}</span>
            <span className="text-sm text-muted">{detail}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted">
        Balance before <span className="font-mono text-fg">{formatINR(report.balanceBefore)}</span> → after{' '}
        <span className="font-mono text-fg">{formatINR(report.balanceAfter)}</span>. Event deduplication alone isn’t enough — the money
        write itself must be idempotent.
      </p>
    </div>
  )
}

function ConcurrencyCard({ runs }: { runs: ConcurrencyRun[] }) {
  return (
    <div className="rounded-2xl bg-bg/60 p-5 ring-1 ring-line">
      <p className="font-semibold text-fg">Two workers, one wallet</p>
      <p className="mt-1 text-sm text-muted">An illustration of locking — not a reproduction of MySQL’s lock manager.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {runs.map((run) => {
          const correct = run.final === run.expected
          return (
            <div key={run.mode} className={`rounded-xl p-4 ring-1 ${correct ? 'ring-success/40' : 'ring-coral/40'}`}>
              <p className="flex items-center gap-2 font-medium text-fg">
                {run.mode === 'row-lock' && <Lock className="size-4 text-success" aria-hidden />}
                {run.mode === 'no-lock' ? 'Without a row lock' : 'With pessimistic_write (my implementation)'}
              </p>
              <ol className="mt-3 space-y-1.5">
                {run.steps.map((st, i) => (
                  <li key={i} className="grid grid-cols-[2.25rem_1fr] gap-2 text-sm">
                    <span className={`rounded px-1.5 text-center font-mono text-xs leading-6 ${st.worker === 'W1' ? 'bg-accent-dim text-accent-strong' : 'bg-ai-dim text-ai-strong'}`}>{st.worker}</span>
                    <span className="font-mono text-xs leading-6 text-muted">{st.action.replace(/\d{3,}/g, (n) => formatINR(Number(n)))}</span>
                  </li>
                ))}
              </ol>
              <p className={`mt-3 text-sm font-medium ${correct ? 'text-success' : 'text-coral'}`}>
                Final {formatINR(run.final)} · expected {formatINR(run.expected)} {correct ? '✓' : '— lost update'}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RedeemSimulator() {
  const [s, setS] = useState<RedeemState>(() => initialRedeemState(rupees(1000)))
  const req = latestRequest(s)
  const amount = rupees(300)
  const reached = !req ? 0 : req.status === 'PENDING' ? 2 : req.status === 'PAID' ? 5 : 4

  const statusFlow: [string, boolean][] = [
    ['PENDING', !!req],
    ['APPROVED', req?.status === 'APPROVED' || req?.status === 'PAID'],
    ['PAID', req?.status === 'PAID'],
  ]

  return (
    <SimFrame title="Agent redeem lifecycle" kinds={['implemented', 'simulated']} onReset={() => setS(initialRedeemState(rupees(1000)))}>
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <Pipeline stages={REDEEM_STAGES} reached={reached} label="Redeem lifecycle progress" />
      </div>
      <div className="grid gap-8 p-5 sm:p-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-4">
          <ControlGroup label="Agent">
            <Control tone="primary" onClick={() => setS(createRedeem(s, amount, 'AGENT'))}>
              Create redeem request ({formatINR(amount)})
            </Control>
          </ControlGroup>
          <ControlGroup label="MIS / Admin">
            <Control onClick={() => setS(misApprove(s, 'MIS'))}>MIS approve</Control>
            <Control onClick={() => setS(misReject(s, 'MIS'))}>MIS reject</Control>
          </ControlGroup>
          <ControlGroup label="Finance / Admin">
            <Control onClick={() => setS(financeMarkPaid(s, 'FINANCE'))}>Finance mark paid</Control>
          </ControlGroup>
          <ControlGroup label="Try to break it">
            <Control tone="danger" onClick={() => setS(misApprove(s, 'FINANCE'))}>
              Finance tries to approve
            </Control>
            <Control tone="danger" onClick={() => setS(replayRelease(s))}>
              Replay the release
            </Control>
          </ControlGroup>

          <div className="rounded-2xl bg-bg/60 p-4 ring-1 ring-line">
            <p className="text-sm text-subtle">Request</p>
            <p className="mt-1 font-mono text-lg font-semibold text-fg">{req ? `${req.id} · ${formatINR(req.amount)}` : 'none yet'}</p>
            <ol className="mt-3 flex flex-wrap items-center gap-2 text-sm" aria-label="Request status">
              {req?.status === 'REJECTED' ? (
                <>
                  <li className="rounded-full bg-accent-dim px-3 py-1 text-fg ring-1 ring-accent/40">PENDING</li>
                  <li aria-hidden className="text-subtle">→</li>
                  <li className="rounded-full bg-coral-dim px-3 py-1 font-medium text-coral ring-1 ring-coral/40">REJECTED</li>
                </>
              ) : (
                statusFlow.map(([label, on], i) => (
                  <li key={label} className="contents">
                    {i > 0 && (
                      <span aria-hidden className="text-subtle">
                        →
                      </span>
                    )}
                    <span className={`rounded-full px-3 py-1 ring-1 ${on ? (req?.status === label ? 'bg-accent font-medium text-[#101827] ring-accent' : 'bg-accent-dim text-fg ring-accent/40') : 'text-subtle ring-line'}`}>
                      {label}
                    </span>
                  </li>
                ))
              )}
            </ol>
            {req?.status === 'PAID' && (
              <p className="mt-3 text-sm text-muted">PAID is a status change in my code — it does not perform a bank transfer.</p>
            )}
          </div>
        </div>
        <div className="space-y-6 lg:col-span-8">
          <WalletBuckets wallet={s.ledger.wallet} />
          <div className="space-y-6">
            <LedgerTable entries={s.ledger.entries} />
            <Timeline items={s.timeline} title="What happened" maxHeight="max-h-80" />
          </div>
        </div>
      </div>
    </SimFrame>
  )
}
