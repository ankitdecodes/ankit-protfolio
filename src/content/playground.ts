// Copy for the Engineering Playground. Every claim about "my backend" was checked
// against the lead & payout platform source (OutboxService, OutboxWorkerService,
// UpdateEarningsService, WalletService, AgentWalletService — all authored by me).

export type Provenance = 'implemented' | 'simulated' | 'conceptual'

export const provenance: Record<Provenance, { label: string; detail: string }> = {
  implemented: { label: 'Implemented in my backend', detail: 'Mechanism exists in production code I wrote; the demo reproduces its rules.' },
  simulated: { label: 'Simulated from my architecture', detail: 'Deterministic frontend model of my real flow — not the real database or worker.' },
  conceptual: { label: 'Conceptual experiment', detail: 'A pattern I understand and can discuss; not claimed as existing in my code.' },
}

export const playgroundIntro =
  'I enjoy building systems that remain predictable when things go wrong. From financial transaction integrity to asynchronous processing and distributed workflows, I focus on correctness, reliability and observability.'

export const capabilities = ['Financial Systems Engineering', 'Event-Driven Architecture', 'Distributed Systems']

export const verifiedStack = ['NestJS', 'TypeScript', 'MySQL', 'TypeORM', 'Docker', 'Git', 'REST APIs']
export const exploredStack = [
  { name: 'BullMQ & Redis', note: 'used for MIS imports; shown here only as an alternative to the payout outbox' },
  { name: 'Saga orchestration', note: 'conceptual' },
  { name: 'Circuit breakers', note: 'conceptual' },
  { name: 'OpenTelemetry', note: 'trace format simulated' },
]

export interface Explanation {
  problem: string
  why: string
  solution: string
  diagram: string[]
  database: string[]
  failures: string[]
  tradeoffs: string[]
  realWorld: string
  implemented: string[]
  simulatedOnly: string[]
  pseudocode: string
}

export const financialExplanation: Explanation = {
  problem: 'A payout must reach an agent’s wallet exactly once, even though events can be delivered twice, workers can crash and two writers can touch the same wallet at the same time.',
  why: 'Asynchronous processing is at-least-once by nature: a worker can commit the money movement and die before recording that it did. Separately, two transactions that read-then-write the same balance can silently overwrite each other.',
  solution: 'Three independent layers: the outbox key stops duplicate events being created; the ledger’s unique idempotency key stops a re-delivered event from moving money twice; a pessimistic row lock on the wallet serialises concurrent writers. Redeem uses separate hold → confirm/release steps so money is reserved before anyone approves it.',
  diagram: ['Lead approval', 'Outbox row (same txn)', 'Polling worker', 'UpdateEarningsService', 'Wallet + ledger'],
  database: [
    'Lead status and the outbox row are written in one transaction, so neither exists without the other.',
    'updateEarnings checks the idempotency key, locks the wallet row (pessimistic_write), then checks the key again under the lock before writing.',
    'wallet_transaction.idempotency_key is declared unique, so a racing duplicate cannot insert a second ledger row.',
    'The wallet keeps separate buckets — available, under review, lifetime earned/reversed/redeemed — plus a version counter incremented on every entry.',
    'Credit keys are per beneficiary and per payout cycle: lead:{id}:{type}:{user}:c{cycle}.',
  ],
  failures: [
    'Failure before commit → the whole transaction rolls back; no partial balance change; the event is retried.',
    'Failure after commit but before DONE → the money moved, the event looks unfinished; reprocessing must be a no-op.',
    'Redeem rejected after a hold → the release has its own key, so it can’t be applied twice.',
  ],
  tradeoffs: [
    'Pessimistic locks are simple and correct but serialise writes to a hot wallet; fine at this volume, a sharding/ledger-batching concern at much higher scale.',
    'Holding funds at request time adds a state (under review) but means approval can never fail for lack of balance.',
  ],
  realWorld: 'The same shape appears in payment wallets, loyalty points, marketplace payouts and any system where “at least once” delivery meets “exactly once” money.',
  implemented: [
    'Transactional outbox with cycle-aware keys (LeadApproved / LeadUnapproved)',
    'Wallet buckets, version counter and unique ledger idempotency keys',
    'Pessimistic wallet lock with double-checked idempotency in updateEarnings',
    'Redeem: ownership checks, one active request per lead, hold / confirm / release keys, role checks, PAID only after APPROVED',
  ],
  simulatedOnly: [
    'Timing, IDs and amounts are fixed sample data',
    'The concurrency panel illustrates locking; it does not reproduce MySQL’s lock manager',
    'PAID is a status change — no bank transfer or payment gateway is involved',
  ],
  pseudocode: `async function updateEarnings(input: EarningsInput, manager: EntityManager) {
  // Fast path: already applied?
  const existing = await manager.findOne(WalletTransaction, { where: { idempotencyKey: input.key } })
  if (existing) return existing

  // Serialise writers on this wallet row
  const wallet = await manager.findOne(UserWallet, {
    where: { userId: input.userId },
    lock: { mode: 'pessimistic_write' },
  })

  // Re-check under the lock — another worker may have won the race
  const again = await manager.findOne(WalletTransaction, { where: { idempotencyKey: input.key } })
  if (again) return again

  const next = applyWalletEntry(wallet, input) // HOLD, REDEEM, RELEASE, EARN, REVERSAL…
  wallet.version += 1
  await manager.save([wallet, ledgerRow(next, input.key)]) // key is UNIQUE in the table
}`,
}

export const asyncExplanation: Explanation = {
  problem: 'Approving a lead must eventually pay its agents, but the payout work shouldn’t run inside the approval request — and it must never be lost if the process dies in between.',
  why: 'Writing to the database and then publishing to a queue is a dual write: a crash between the two loses the event or publishes one for data that was rolled back.',
  solution: 'The event is a row in the same database, written in the approval transaction (transactional outbox). A worker polls every 10s, claims up to 20 PENDING rows with FOR UPDATE SKIP LOCKED, processes them one by one, and marks them DONE. Failures retry with capped exponential backoff; rows stuck in PROCESSING are reclaimed; terminal failures raise alerts.',
  diagram: ['Business txn', 'Commit + outbox row', 'Poll (10s)', 'Claim SKIP LOCKED', 'Process', 'Ledger', 'DONE'],
  database: [
    'outbox.idempotency_key is unique; the writer also checks for an existing key before inserting.',
    'Claiming runs in its own transaction: SELECT … FOR UPDATE SKIP LOCKED, then UPDATE status = PROCESSING — parallel workers never claim the same row.',
    'An index on (status, available_at) supports the claim query.',
    'Business processing and marking DONE are separate writes — that gap is exactly why consumers must be idempotent.',
  ],
  failures: [
    'App crashes after commit → the PENDING row survives and is picked up on the next tick.',
    'Worker crashes after business processing → row stays PROCESSING, is reclaimed after 10 minutes, reprocessed, absorbed by ledger idempotency.',
    'Database drops mid-batch → drain fails, a critical alert fires, claimed rows wait for stale reclaim.',
    'Persistent failure → attempts++ with backoff min(3600, 2^n × 5)s; after 8 attempts the row is FAILED and alerted.',
  ],
  tradeoffs: [
    'Polling adds up to one interval of latency and some idle queries, in exchange for no extra infrastructure and transactional guarantees.',
    'A broker such as BullMQ/Redis gives push delivery and richer tooling, but publishing to it is again a dual write unless fed from an outbox.',
    'The outbox guarantees the event is persisted, not that it is processed exactly once.',
  ],
  realWorld: 'Order systems, payment webhooks, ledger postings and notification fan-out all use outbox + idempotent consumers to survive crashes without losing or duplicating work.',
  implemented: [
    'Outbox table with PENDING / PROCESSING / DONE / FAILED and a unique idempotency key',
    'Polling worker: 10s interval, batch of 20, FOR UPDATE SKIP LOCKED, sequential processing',
    'Retry with min(3600, 2^n × 5)s backoff, 8 max attempts, last_error recorded',
    'Stale PROCESSING reclaim (default 10 min, env-configurable), critical alerts and outbox gauges',
    'LeadUnapproved reversals with cycle-aware keys; reversal also releases pending redeem holds',
  ],
  simulatedOnly: [
    'The clock is simulated — “10 minutes” passes with one click',
    'Failures are injected deliberately; real failures come from the database or downstream code',
    'BullMQ comparison is conceptual for this flow',
  ],
  pseudocode: `@Interval('payout-outbox-drain', 10_000)
async drain() {
  await reclaimStaleProcessing() // PROCESSING older than N min → PENDING
  const batch = await dataSource.transaction(async (m) => {
    const rows = await m.query(\`SELECT * FROM v2_outbox_events
      WHERE status = 'PENDING' AND available_at <= NOW(6)
      ORDER BY created_at LIMIT 20
      FOR UPDATE SKIP LOCKED\`)
    await markProcessing(m, rows)
    return rows
  })
  for (const event of batch) {
    try {
      await dispatch(event) // idempotent: ledger keys are unique
      await markDone(event)
    } catch (err) {
      event.attempts += 1
      if (event.attempts >= 8) await markFailedAndAlert(event, err)
      else await reschedule(event, Math.min(3600, 2 ** event.attempts * 5))
    }
  }
}`,
}

export const distributedExplanation: Explanation = {
  problem: 'Once a workflow spans services, there is no single database transaction to roll back — and any hop can be slow, down or half-finished.',
  why: 'Each service commits locally. A failure at step four leaves steps one to three committed elsewhere, and a slow dependency can exhaust every caller’s threads.',
  solution: 'A saga records workflow state and runs compensating actions for completed steps when a later step fails. Calls get timeouts and bounded retries; a circuit breaker stops hammering a failing dependency; non-critical steps degrade gracefully; distributed tracing shows exactly which hop failed.',
  diagram: ['Gateway', 'Lead', 'Payout', 'Wallet', 'Notification'],
  database: [
    'A database rollback undoes uncommitted work inside one transaction.',
    'Compensation is a new business operation (e.g. “release reservation”) that semantically reverses a committed one — not a time machine.',
    'Compensations must themselves be idempotent, because they can be retried too.',
  ],
  failures: [
    'Wallet down after credit is reserved → reservation released, lead marked failed.',
    'Slow payout service → calls time out at 1.5s, retry with backoff, breaker opens after 3 failures.',
    'Notification down → payout still succeeds; the message is queued for later (fallback).',
    'Database down → spans show the SQL span failing under the service that called it.',
  ],
  tradeoffs: [
    'Orchestrated sagas are easy to reason about but centralise workflow logic; choreography spreads it across services.',
    'Retries improve success rates but multiply load on a struggling dependency — hence breakers and backoff.',
  ],
  realWorld: 'Travel bookings, order fulfilment and cross-service payouts use sagas; breakers and tracing are standard in any microservice platform.',
  implemented: ['The database-backed outbox shown in the previous experience is the only part here that exists in my code'],
  simulatedOnly: [
    'Saga orchestration, compensations, circuit breakers and retries across services are conceptual',
    'Traces follow the OpenTelemetry shape (trace/span/parent IDs) but are generated in the browser',
  ],
  pseudocode: `async function runPayoutSaga(ctx: SagaContext) {
  const done: Step[] = []
  for (const step of [createLead, validate, reserveCredit, updateWallet]) {
    try {
      await withBreaker(step.service, () => retry(() => timeout(step.run(ctx), 1500), 3))
      done.push(step)
    } catch (err) {
      for (const s of done.reverse()) await s.compensate?.(ctx) // idempotent compensations
      return { status: 'COMPENSATED', failedAt: step.name }
    }
  }
  await notify(ctx).catch(() => queueForLater(ctx)) // non-critical: degrade, don't compensate
  return { status: 'COMPLETED' }
}`,
}
