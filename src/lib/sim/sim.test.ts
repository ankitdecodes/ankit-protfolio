import { describe, expect, it } from 'vitest'
import { emptyLedger, ledgerIsConsistent, postEntry } from './ledger'
import { formatINR, rupees } from './money'
import {
  approveLead,
  armCrash,
  backoffSeconds,
  dbFailureDuringBatch,
  initialOutboxState,
  MAX_ATTEMPTS,
  replayCompleted,
  retryNext,
  setDbDown,
  setFailMode,
  STALE_RECLAIM_S,
  unapproveLead,
  workerTick,
  advance,
} from './outbox'
import { concurrencyDemo, createLead, simulateConcurrent, simulateDuplicate } from './payout'
import { createRedeem, financeMarkPaid, initialRedeemState, misApprove, misReject, replayRelease } from './redeem'
import { addLatency, initialLab, injectFailure, recoverService, startWorkflow, triggerTimeout } from './distributed'

const lead = { id: 'LD-1', agentId: 'AG-1', amount: rupees(2500) }
const fresh = () => initialOutboxState([lead])

describe('money', () => {
  it('formats integer paise without floating-point drift', () => {
    expect(formatINR(rupees(1000))).toBe('₹1,000')
    expect(formatINR(30050)).toBe('₹300.50')
    expect(() => postEntry(emptyLedger(), { idempotencyKey: 'k', entryClass: 'EARN', amount: 10.5, referenceId: 'x' })).toThrow()
  })
})

describe('ledger', () => {
  it('treats a repeated idempotency key as a no-op', () => {
    const once = postEntry(emptyLedger(), { idempotencyKey: 'k', entryClass: 'EARN', amount: 100, referenceId: 'x' })
    const twice = postEntry(once.ledger, { idempotencyKey: 'k', entryClass: 'EARN', amount: 100, referenceId: 'x' })
    expect(twice.result.kind).toBe('duplicate')
    expect(twice.ledger.wallet.available).toBe(100)
  })

  it('confirms a hold without debiting available a second time', () => {
    let l = postEntry(emptyLedger(), { idempotencyKey: 'e', entryClass: 'EARN', amount: 1000, referenceId: 'x' }).ledger
    l = postEntry(l, { idempotencyKey: 'h', entryClass: 'HOLD', amount: 300, referenceId: 'r' }).ledger
    l = postEntry(l, { idempotencyKey: 'c', entryClass: 'REDEEM', amount: 300, referenceId: 'r' }).ledger
    expect(l.wallet).toMatchObject({ available: 700, underReview: 0, lifetimeRedeemed: 300 })
    expect(ledgerIsConsistent(l)).toBe(true)
  })

  it('rejects a hold larger than the available balance', () => {
    const r = postEntry(emptyLedger(), { idempotencyKey: 'h', entryClass: 'HOLD', amount: 1, referenceId: 'r' })
    expect(r.result.kind).toBe('rejected')
  })
})

describe('outbox worker', () => {
  it('uses the worker’s capped exponential backoff', () => {
    expect([1, 2, 3].map(backoffSeconds)).toEqual([10, 20, 40])
    expect(backoffSeconds(12)).toBe(3600)
  })

  it('commits the approval and the outbox event together, then credits once', () => {
    let s = approveLead(fresh(), 'LD-1')
    expect(s.events[0]).toMatchObject({ status: 'PENDING', idempotencyKey: 'lead:LD-1:approved:c1' })
    s = workerTick(s)
    expect(s.events[0]!.status).toBe('DONE')
    expect(s.ledger.wallet.available).toBe(rupees(2500))
  })

  it('does not enqueue the same cycle twice', () => {
    const s = approveLead(approveLead(fresh(), 'LD-1'), 'LD-1')
    expect(s.events).toHaveLength(1)
  })

  it('rolls back on failure before commit and retries with backoff', () => {
    let s = setFailMode(approveLead(fresh(), 'LD-1'), 'next')
    s = workerTick(s)
    expect(s.events[0]).toMatchObject({ status: 'PENDING', attempts: 1 })
    expect(s.ledger.wallet.available).toBe(0)
    s = retryNext(s)
    expect(s.events[0]!.status).toBe('DONE')
    expect(s.ledger.wallet.available).toBe(rupees(2500))
  })

  it('marks an event FAILED after the maximum attempts and raises an alert', () => {
    let s = setFailMode(approveLead(fresh(), 'LD-1'), 'always')
    for (let i = 0; i < MAX_ATTEMPTS + 2; i++) s = retryNext(s)
    expect(s.events[0]).toMatchObject({ status: 'FAILED', attempts: MAX_ATTEMPTS })
    expect(s.alerts.some((a) => a.includes('FAILED'))).toBe(true)
  })

  it('reclaims a stale PROCESSING event after a crash and does not credit twice', () => {
    let s = armCrash(approveLead(fresh(), 'LD-1'))
    s = workerTick(s)
    expect(s.events[0]!.status).toBe('PROCESSING')
    expect(s.ledger.wallet.available).toBe(rupees(2500))
    s = workerTick(advance(s, STALE_RECLAIM_S))
    expect(s.events[0]!.status).toBe('DONE')
    expect(s.ledger.wallet.available).toBe(rupees(2500))
    expect(s.ledger.entries).toHaveLength(1)
  })

  it('leaves claimed rows PROCESSING when the database drops mid-batch, then recovers', () => {
    let s = dbFailureDuringBatch(approveLead(fresh(), 'LD-1'))
    expect(s.events[0]!.status).toBe('PROCESSING')
    s = workerTick(s)
    expect(s.timeline.at(-1)!.text).toContain('Critical alert')
    s = workerTick(advance(setDbDown(s, false), STALE_RECLAIM_S))
    expect(s.events[0]!.status).toBe('DONE')
  })

  it('absorbs a replayed DONE event via ledger idempotency', () => {
    let s = workerTick(approveLead(fresh(), 'LD-1'))
    s = workerTick(replayCompleted(s))
    expect(s.ledger.entries).toHaveLength(1)
  })

  it('reverses once per cycle, and a re-approval opens a new cycle', () => {
    let s = workerTick(approveLead(fresh(), 'LD-1'))
    s = workerTick(unapproveLead(s, 'LD-1'))
    expect(s.ledger.wallet.available).toBe(0)
    s = workerTick(replayCompleted(s))
    expect(s.ledger.wallet.available).toBe(0)
    s = workerTick(approveLead(s, 'LD-1'))
    expect(s.events.at(-1)!.idempotencyKey).toBe('lead:LD-1:approved:c2')
    expect(s.ledger.wallet.available).toBe(rupees(2500))
  })
})

describe('financial integrity scenarios', () => {
  it('blocks duplicate creation and absorbs duplicate delivery', () => {
    let s = createLead(initialOutboxState([]), lead)
    s = workerTick(approveLead(s, 'LD-1'))
    const { state, report } = simulateDuplicate(s)
    expect(report).toMatchObject({ creation: 'blocked', delivery: 'absorbed' })
    expect(state.ledger.wallet.available).toBe(rupees(2500))
  })

  it('shows a lost update without locks and the correct total with a row lock', () => {
    const [noLock, locked] = concurrencyDemo(1000, 200, 300)
    expect(noLock!.final).toBe(1300)
    expect(locked!.final).toBe(1500)
    const { state } = simulateConcurrent(initialOutboxState([]), [
      { leadId: 'A', agentId: 'AG-1', amount: 200 },
      { leadId: 'B', agentId: 'AG-1', amount: 300 },
    ])
    expect(state.ledger.wallet.available).toBe(500)
    expect(state.ledger.wallet.version).toBe(2)
  })
})

describe('redeem lifecycle', () => {
  const start = () => initialRedeemState(rupees(1000))

  it('holds on request and confirms without a second debit', () => {
    let s = createRedeem(start(), rupees(300), 'AGENT')
    expect(s.ledger.wallet).toMatchObject({ available: rupees(700), underReview: rupees(300) })
    s = misApprove(s, 'MIS')
    expect(s.ledger.wallet).toMatchObject({ available: rupees(700), underReview: 0, lifetimeRedeemed: rupees(300) })
    s = financeMarkPaid(s, 'FINANCE')
    expect(s.requests[0]!.status).toBe('PAID')
    expect(s.ledger.wallet.available).toBe(rupees(700))
  })

  it('releases on rejection exactly once', () => {
    let s = misReject(createRedeem(start(), rupees(300), 'AGENT'), 'MIS')
    expect(s.ledger.wallet).toMatchObject({ available: rupees(1000), underReview: 0 })
    s = replayRelease(s)
    expect(s.ledger.wallet.available).toBe(rupees(1000))
  })

  it('enforces roles and state preconditions', () => {
    let s = createRedeem(start(), rupees(300), 'AGENT')
    s = misApprove(s, 'FINANCE')
    expect(s.timeline.at(-1)!.text).toBe('Only MIS team can approve redeem requests')
    s = financeMarkPaid(s, 'FINANCE')
    expect(s.timeline.at(-1)!.text).toBe('Only MIS-approved redeem requests can be marked as paid')
    s = createRedeem(s, rupees(100), 'AGENT')
    expect(s.timeline.at(-1)!.text).toContain('already has redeem RR-5001 status=PENDING')
  })
})

describe('distributed lab', () => {
  it('completes when every service is healthy', () => {
    const s = startWorkflow(initialLab())
    expect(s.runs[0]!.outcome).toBe('completed')
    expect(s.runs[0]!.spans.every((sp) => sp.end >= sp.start)).toBe(true)
  })

  it('compensates completed steps when the wallet fails', () => {
    const s = startWorkflow(injectFailure(initialLab(), 'wallet'))
    const run = s.runs[0]!
    expect(run.outcome).toBe('compensated')
    expect(run.steps.find((x) => x.id === 'reserve')!.status).toBe('compensated')
    expect(run.steps.find((x) => x.id === 'notify')!.status).toBe('skipped')
    expect(s.services.wallet.breaker).toBe('open')
  })

  it('falls back instead of compensating when only notifications fail', () => {
    const run = startWorkflow(injectFailure(initialLab(), 'notification')).runs[0]!
    expect(run.outcome).toBe('completed-with-warnings')
    expect(run.steps.find((x) => x.id === 'notify')!.status).toBe('deferred')
  })

  it('times out slow calls, fails fast while open, and closes after recovery', () => {
    let s = startWorkflow(triggerTimeout(initialLab(), 'payout'))
    expect(s.runs[0]!.spans.some((sp) => sp.note?.includes('timeout'))).toBe(true)
    s = startWorkflow(s)
    expect(s.runs[1]!.spans.some((sp) => sp.note === 'circuit open — failed fast')).toBe(true)
    s = startWorkflow(recoverService(s, 'payout'))
    expect(s.services.payout.breaker).toBe('closed')
    expect(s.runs[2]!.outcome).toBe('completed')
  })

  it('reflects added latency in the trace without failing', () => {
    const base = startWorkflow(initialLab()).runs[0]!
    const slow = startWorkflow(addLatency(initialLab(), 'lead', 400)).runs[0]!
    expect(slow.outcome).toBe('completed')
    expect(slow.spans[0]!.end).toBeGreaterThan(base.spans[0]!.end)
  })
})
