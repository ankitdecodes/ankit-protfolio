// Financial-integrity scenarios built on the outbox model: lead creation, the
// three layers of duplicate protection, and a concurrency comparison.

import { postEntry } from './ledger'
import type { Paise } from './money'
import { creditKey, replayCompleted, workerTick, type OutboxState, type TimelineItem } from './outbox'

export function createLead(state: OutboxState, lead: { id: string; agentId: string; amount: Paise }): OutboxState {
  if (state.leads.some((l) => l.id === lead.id)) {
    return { ...state, timeline: [...state.timeline, { t: state.clock, kind: 'rejected', text: `${lead.id} already exists` }] }
  }
  return {
    ...state,
    leads: [...state.leads, { ...lead, status: 'CREATED', cycle: 1 }],
    timeline: [...state.timeline, { t: state.clock, kind: 'business', text: `Lead ${lead.id} created for agent ${lead.agentId}` }],
  }
}

export interface DuplicateReport {
  creation: 'blocked' | 'n/a'
  delivery: 'absorbed' | 'credited-again'
  balanceBefore: Paise
  balanceAfter: Paise
}

/**
 * Demonstrates the three layers separately:
 *  1. duplicate event creation  → blocked by the outbox's unique idempotency key
 *  2. duplicate event delivery  → the event really is processed a second time…
 *  3. duplicate business effect → …but the ledger's unique key makes it a no-op
 */
export function simulateDuplicate(state: OutboxState): { state: OutboxState; report: DuplicateReport | null } {
  const done = [...state.events].reverse().find((e) => e.eventType === 'LeadApproved' && e.status === 'DONE')
  if (!done) {
    return {
      state: {
        ...state,
        timeline: [...state.timeline, { t: state.clock, kind: 'rejected', text: 'Process a LeadApproved event first, then simulate a duplicate' }],
      },
      report: null,
    }
  }
  const before = state.ledger.wallet.available
  const t: TimelineItem[] = [
    { t: state.clock, kind: 'info', text: `① Duplicate creation: enqueue ${done.idempotencyKey} again` },
    { t: state.clock, kind: 'outbox', text: 'Blocked — the outbox idempotency key is unique, so no second event row' },
    { t: state.clock, kind: 'info', text: `② Duplicate delivery: ${done.id} is delivered and processed again` },
  ]
  let s: OutboxState = { ...state, timeline: [...state.timeline, ...t] }
  s = workerTick(replayCompleted(s, done.id))
  s = {
    ...s,
    timeline: [
      ...s.timeline,
      { t: s.clock, kind: 'ledger', text: `③ Business effect: ledger key ${creditKey(done.payload, done.payoutCycle)} exists → no second credit` },
    ],
  }
  const after = s.ledger.wallet.available
  return {
    state: s,
    report: { creation: 'blocked', delivery: after === before ? 'absorbed' : 'credited-again', balanceBefore: before, balanceAfter: after },
  }
}

export interface ConcurrencyStep {
  worker: 'W1' | 'W2'
  action: string
  available: Paise
}

export interface ConcurrencyRun {
  mode: 'no-lock' | 'row-lock'
  steps: ConcurrencyStep[]
  final: Paise
  expected: Paise
}

/** Two workers credit the same wallet. Deterministic interleaving, both modes. */
export function concurrencyDemo(start: Paise, a: Paise, b: Paise): ConcurrencyRun[] {
  const expected = start + a + b
  const noLock: ConcurrencyStep[] = [
    { worker: 'W1', action: `SELECT wallet → reads ${start}`, available: start },
    { worker: 'W2', action: `SELECT wallet → also reads ${start}`, available: start },
    { worker: 'W1', action: `UPDATE available = ${start} + ${a}`, available: start + a },
    { worker: 'W2', action: `UPDATE available = ${start} + ${b} (overwrites W1)`, available: start + b },
  ]
  const locked: ConcurrencyStep[] = [
    { worker: 'W1', action: 'SELECT … FOR UPDATE → row lock acquired', available: start },
    { worker: 'W2', action: 'SELECT … FOR UPDATE → waits for W1’s lock', available: start },
    { worker: 'W1', action: `UPDATE available = ${start + a}; version+1; COMMIT`, available: start + a },
    { worker: 'W2', action: `lock granted → reads ${start + a}`, available: start + a },
    { worker: 'W2', action: `UPDATE available = ${start + a + b}; version+1; COMMIT`, available: start + a + b },
  ]
  return [
    { mode: 'no-lock', steps: noLock, final: start + b, expected },
    { mode: 'row-lock', steps: locked, final: expected, expected },
  ]
}

/** Applies the locked (correct) outcome to the simulation: two serialised credits. */
export function simulateConcurrent(
  state: OutboxState,
  credits: { leadId: string; agentId: string; amount: Paise }[],
): { state: OutboxState; runs: ConcurrencyRun[] } {
  const [c1, c2] = credits
  if (!c1 || !c2) return { state, runs: [] }
  const runs = concurrencyDemo(state.ledger.wallet.available, c1.amount, c2.amount)
  let ledger = state.ledger
  const t: TimelineItem[] = [{ t: state.clock, kind: 'info', text: 'W1 and W2 credit the same wallet at the same moment' }]
  for (const [i, c] of [c1, c2].entries()) {
    const posted = postEntry(ledger, { idempotencyKey: creditKey({ ...c, payoutCycle: 1 }, 1), entryClass: 'EARN', amount: c.amount, referenceId: c.leadId })
    ledger = posted.ledger
    t.push({
      t: state.clock,
      kind: 'ledger',
      text:
        posted.result.kind === 'posted'
          ? `W${i + 1} committed under the row lock (version ${ledger.wallet.version})`
          : `W${i + 1}: ${c.leadId} already credited — idempotent no-op`,
    })
  }
  return { state: { ...state, ledger, timeline: [...state.timeline, ...t] }, runs }
}
