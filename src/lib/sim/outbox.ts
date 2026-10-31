// Deterministic model of my backend's transactional outbox + DB-polling worker.
// Constants mirror OutboxWorkerService defaults; some are env-configurable there.
// Business effects go through the ledger, whose unique idempotency keys make
// re-processing safe — the outbox alone does not give exactly-once.

import { emptyLedger, postEntry, type Ledger } from './ledger'
import type { Paise } from './money'

export const WORKER_INTERVAL_S = 10
export const BATCH_SIZE = 20
export const MAX_ATTEMPTS = 8
export const STALE_RECLAIM_S = 10 * 60
export const RETRY_BASE_S = 5
export const MAX_RETRY_DELAY_S = 3600

/** Same formula as the worker: min(3600, 2^attempt × 5) seconds. */
export const backoffSeconds = (attempt: number) => Math.min(MAX_RETRY_DELAY_S, Math.pow(2, attempt) * RETRY_BASE_S)

export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'
export type OutboxEventType = 'LeadApproved' | 'LeadUnapproved'

export interface OutboxEvent {
  id: string
  aggregateId: string
  eventType: OutboxEventType
  payload: { leadId: string; agentId: string; amount: Paise; payoutCycle: number }
  payoutCycle: number
  idempotencyKey: string
  status: OutboxStatus
  attempts: number
  createdAt: number
  availableAt: number
  updatedAt: number
  processedAt: number | null
  lastError: string | null
}

export interface TimelineItem {
  t: number
  kind: 'business' | 'outbox' | 'worker' | 'ledger' | 'failure' | 'recovery' | 'alert' | 'rejected' | 'info'
  text: string
}

export interface Lead {
  id: string
  agentId: string
  amount: Paise
  status: 'CREATED' | 'APPROVED' | 'UNAPPROVED'
  cycle: number
}

export interface OutboxState {
  clock: number
  leads: Lead[]
  events: OutboxEvent[]
  ledger: Ledger
  timeline: TimelineItem[]
  alerts: string[]
  dbDown: boolean
  crashArmed: boolean
  failMode: 'none' | 'next' | 'always'
  seq: number
}

export const creditKey = (lead: Lead | OutboxEvent['payload'], cycle: number) =>
  `lead:${'leadId' in lead ? lead.leadId : lead.id}:AGENT:${lead.agentId}:c${cycle}`
export const reversalKey = (leadId: string, agentId: string, cycle: number) => `lead:${leadId}:reversal:${agentId}:c${cycle}`

export function initialOutboxState(leads: Omit<Lead, 'status' | 'cycle'>[]): OutboxState {
  return {
    clock: 0,
    leads: leads.map((l) => ({ ...l, status: 'CREATED', cycle: 1 })),
    events: [],
    ledger: emptyLedger(),
    timeline: [],
    alerts: [],
    dbDown: false,
    crashArmed: false,
    failMode: 'none',
    seq: 0,
  }
}

type Draft = OutboxState
const log = (s: Draft, kind: TimelineItem['kind'], text: string) => {
  s.timeline = [...s.timeline, { t: s.clock, kind, text }]
}
const clone = (s: OutboxState): Draft => ({
  ...s,
  leads: s.leads.map((l) => ({ ...l })),
  events: s.events.map((e) => ({ ...e })),
})

/** Writes an event, skipping when its idempotency key already exists (unique column). */
function enqueue(s: Draft, lead: Lead, eventType: OutboxEventType): OutboxEvent | null {
  const key = `lead:${lead.id}:${eventType === 'LeadApproved' ? 'approved' : 'unapproved'}:c${lead.cycle}`
  if (s.events.some((e) => e.idempotencyKey === key)) {
    log(s, 'outbox', `Enqueue skipped — ${key} already exists (unique idempotency key)`)
    return null
  }
  s.seq += 1
  const event: OutboxEvent = {
    id: `evt-${String(s.seq).padStart(3, '0')}`,
    aggregateId: lead.id,
    eventType,
    payload: { leadId: lead.id, agentId: lead.agentId, amount: lead.amount, payoutCycle: lead.cycle },
    payoutCycle: lead.cycle,
    idempotencyKey: key,
    status: 'PENDING',
    attempts: 0,
    createdAt: s.clock,
    availableAt: s.clock,
    updatedAt: s.clock,
    processedAt: null,
    lastError: null,
  }
  s.events = [...s.events, event]
  log(s, 'outbox', `${eventType} ${event.id} written to the outbox table (PENDING) — key ${key}`)
  return event
}

/** Business transaction: lead status change + outbox row commit together, or not at all. */
export function approveLead(state: OutboxState, leadId: string): OutboxState {
  const s = clone(state)
  const lead = s.leads.find((l) => l.id === leadId)
  if (!lead) return state
  if (s.dbDown) {
    log(s, 'rejected', `Approve ${leadId} failed — database unavailable, transaction never started`)
    return s
  }
  if (lead.status === 'APPROVED') {
    log(s, 'rejected', `${leadId} is already approved`)
    return s
  }
  if (lead.status === 'UNAPPROVED') lead.cycle += 1
  lead.status = 'APPROVED'
  log(s, 'business', `BEGIN · ${leadId} → APPROVED (payout cycle ${lead.cycle})`)
  enqueue(s, lead, 'LeadApproved')
  log(s, 'business', 'COMMIT · lead status and outbox event are durable together')
  return s
}

export function unapproveLead(state: OutboxState, leadId: string): OutboxState {
  const s = clone(state)
  const lead = s.leads.find((l) => l.id === leadId)
  if (!lead) return state
  if (lead.status !== 'APPROVED') {
    log(s, 'rejected', `${leadId} must be APPROVED before it can be unapproved`)
    return s
  }
  lead.status = 'UNAPPROVED'
  log(s, 'business', `BEGIN · ${leadId} → UNAPPROVED (cycle ${lead.cycle})`)
  enqueue(s, lead, 'LeadUnapproved')
  log(s, 'business', 'COMMIT · reversal event persisted with the status change')
  return s
}

function applyBusiness(s: Draft, e: OutboxEvent): string {
  const { leadId, agentId, amount, payoutCycle } = e.payload
  if (e.eventType === 'LeadApproved') {
    const { ledger, result } = postEntry(s.ledger, {
      idempotencyKey: creditKey(e.payload, payoutCycle),
      entryClass: 'EARN',
      amount,
      referenceId: leadId,
    })
    s.ledger = ledger
    return result.kind === 'posted'
      ? `UpdateEarningsService credited ${agentId} (ledger #${result.entry.seq})`
      : `Ledger key ${creditKey(e.payload, payoutCycle)} already exists — no second credit`
  }
  const earned = s.ledger.entries.some((x) => x.idempotencyKey === creditKey(e.payload, payoutCycle))
  if (!earned) return `Nothing to reverse for ${leadId} cycle ${payoutCycle}`
  const { ledger, result } = postEntry(s.ledger, {
    idempotencyKey: reversalKey(leadId, agentId, payoutCycle),
    entryClass: 'REVERSAL',
    amount,
    referenceId: leadId,
  })
  s.ledger = ledger
  return result.kind === 'posted'
    ? `Reversal posted for ${agentId} (ledger #${result.entry.seq})`
    : `Reversal key already exists — reversal not applied twice`
}

/** One worker tick: reclaim stale → claim batch (SKIP LOCKED) → process sequentially. */
export function workerTick(state: OutboxState): OutboxState {
  const s = clone(state)
  s.clock += WORKER_INTERVAL_S
  log(s, 'worker', `Worker tick at t=${s.clock}s`)

  if (s.dbDown) {
    log(s, 'failure', 'Drain failed: database connection refused')
    s.alerts = [...s.alerts, `t=${s.clock}s Outbox drain failure`]
    log(s, 'alert', 'Critical alert raised: outbox drain failure')
    return s
  }

  for (const e of s.events) {
    if (e.status === 'PROCESSING' && s.clock - e.updatedAt >= STALE_RECLAIM_S) {
      e.status = 'PENDING'
      e.availableAt = s.clock
      e.updatedAt = s.clock
      e.lastError = `${e.lastError ? `${e.lastError} | ` : ''}reclaimed from PROCESSING`
      log(s, 'recovery', `${e.id} stuck in PROCESSING for ≥10 min → reclaimed to PENDING`)
      s.alerts = [...s.alerts, `t=${s.clock}s Outbox PROCESSING reclaim (${e.id})`]
    }
  }

  const claimed = s.events
    .filter((e) => e.status === 'PENDING' && e.availableAt <= s.clock)
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, BATCH_SIZE)
  if (!claimed.length) {
    const next = s.events.filter((e) => e.status === 'PENDING').sort((a, b) => a.availableAt - b.availableAt)[0]
    log(s, 'worker', next ? `Nothing claimable — ${next.id} available at t=${next.availableAt}s (backoff)` : 'Nothing to claim')
    return s
  }
  for (const e of claimed) {
    e.status = 'PROCESSING'
    e.updatedAt = s.clock
  }
  log(s, 'worker', `Claimed ${claimed.map((e) => e.id).join(', ')} with FOR UPDATE SKIP LOCKED → PROCESSING`)

  for (const e of claimed) {
    if (s.failMode !== 'none') {
      if (s.failMode === 'next') s.failMode = 'none'
      e.attempts += 1
      e.lastError = 'Simulated failure: wallet update rolled back'
      log(s, 'failure', `${e.id} attempt ${e.attempts} failed — transaction rolled back, no wallet change`)
      if (e.attempts >= MAX_ATTEMPTS) {
        e.status = 'FAILED'
        s.alerts = [...s.alerts, `t=${s.clock}s Outbox event FAILED (${e.id})`]
        log(s, 'alert', `${e.id} reached ${MAX_ATTEMPTS} attempts → FAILED, critical alert raised`)
      } else {
        e.status = 'PENDING'
        e.availableAt = s.clock + backoffSeconds(e.attempts)
        log(s, 'worker', `${e.id} back to PENDING, retry after ${backoffSeconds(e.attempts)}s`)
      }
      e.updatedAt = s.clock
      continue
    }

    const before = s.ledger.entries.length
    const outcome = applyBusiness(s, e)
    log(s, 'ledger', `${e.id}: ${outcome}${s.ledger.entries.length > before ? ' — business transaction committed' : ' (idempotent no-op)'}`)
    if (s.crashArmed) {
      s.crashArmed = false
      log(s, 'failure', `Worker crashed before marking ${e.id} DONE — row stays PROCESSING`)
      return s
    }
    e.status = 'DONE'
    e.processedAt = s.clock
    e.lastError = null
    e.updatedAt = s.clock
    log(s, 'outbox', `${e.id} → DONE`)
  }
  return s
}

export function advance(state: OutboxState, seconds: number): OutboxState {
  const s = clone(state)
  s.clock += seconds
  log(s, 'info', `Time advanced ${seconds >= 60 ? `${seconds / 60} min` : `${seconds}s`}`)
  return s
}

/** Advance to the earliest backoff deadline, then run one tick. */
export function retryNext(state: OutboxState): OutboxState {
  const next = state.events.filter((e) => e.status === 'PENDING').sort((a, b) => a.availableAt - b.availableAt)[0]
  if (!next) {
    const s = clone(state)
    log(s, 'rejected', 'No PENDING event to retry')
    return s
  }
  const wait = Math.max(0, next.availableAt - state.clock - WORKER_INTERVAL_S)
  return workerTick(wait ? advance(state, wait) : state)
}

/** Re-deliver a completed event (as an operator replay would). Idempotency must absorb it. */
export function replayCompleted(state: OutboxState, eventId?: string): OutboxState {
  const s = clone(state)
  const e = eventId ? s.events.find((x) => x.id === eventId) : [...s.events].reverse().find((x) => x.status === 'DONE')
  if (!e || e.status !== 'DONE') {
    log(s, 'rejected', 'Replay needs a DONE event')
    return s
  }
  e.status = 'PENDING'
  e.availableAt = s.clock
  e.updatedAt = s.clock
  log(s, 'info', `${e.id} re-delivered (status reset to PENDING) — testing at-least-once handling`)
  return s
}

export const setFailMode = (state: OutboxState, failMode: OutboxState['failMode']): OutboxState => ({ ...state, failMode })
export const armCrash = (state: OutboxState): OutboxState => {
  const s = clone(state)
  s.crashArmed = true
  log(s, 'info', 'Crash armed: the worker will die right after its next business commit')
  return s
}
export const setDbDown = (state: OutboxState, dbDown: boolean): OutboxState => {
  const s = clone(state)
  s.dbDown = dbDown
  log(s, dbDown ? 'failure' : 'recovery', dbDown ? 'Database connection lost' : 'Database connection restored')
  return s
}

/**
 * The worker claims a batch, then the database drops mid-batch: the claimed rows
 * stay PROCESSING until stale reclaim returns them to PENDING.
 */
export function dbFailureDuringBatch(state: OutboxState): OutboxState {
  const s = clone(state)
  s.clock += WORKER_INTERVAL_S
  const claimed = s.events.filter((e) => e.status === 'PENDING' && e.availableAt <= s.clock).slice(0, BATCH_SIZE)
  if (!claimed.length) {
    log(s, 'rejected', 'Create a PENDING event first — there is nothing to claim')
    return s
  }
  for (const e of claimed) {
    e.status = 'PROCESSING'
    e.updatedAt = s.clock
  }
  log(s, 'worker', `Worker tick at t=${s.clock}s claimed ${claimed.map((e) => e.id).join(', ')}`)
  s.dbDown = true
  log(s, 'failure', 'Database connection lost mid-batch — status updates cannot be written')
  s.alerts = [...s.alerts, `t=${s.clock}s Outbox drain failure`]
  log(s, 'alert', 'Critical alert raised; claimed rows stay PROCESSING until stale reclaim')
  return s
}
