// Conceptual distributed-systems laboratory: saga orchestration with compensation,
// timeouts, retries, circuit breakers and an OpenTelemetry-style trace.
// Deterministic — durations derive from fixed base latencies plus injected faults.
// None of this is claimed as existing production code.

export type ServiceId = 'gateway' | 'lead' | 'payout' | 'wallet' | 'notification' | 'broker' | 'mysql'
export type Health = 'up' | 'down'
export type BreakerState = 'closed' | 'open' | 'half-open'

export interface ServiceNode {
  id: ServiceId
  label: string
  baseMs: number
  health: Health
  extraLatencyMs: number
  breaker: BreakerState
  consecutiveFailures: number
}

export const TIMEOUT_MS = 1500
export const MAX_ATTEMPTS = 3
export const BREAKER_THRESHOLD = 3
const retryDelay = (attempt: number) => 100 * 2 ** (attempt - 1)

export type StepId = 'create-lead' | 'validate' | 'reserve' | 'wallet' | 'notify'

export interface WorkflowStep {
  id: StepId
  label: string
  service: ServiceId
  critical: boolean
  compensation?: string
  status: 'pending' | 'done' | 'failed' | 'compensated' | 'skipped' | 'deferred'
  detail?: string
}

export const STEP_DEFS: Omit<WorkflowStep, 'status'>[] = [
  { id: 'create-lead', label: 'Create lead', service: 'lead', critical: true, compensation: 'Mark lead payout as failed' },
  { id: 'validate', label: 'Validate eligibility', service: 'payout', critical: true },
  { id: 'reserve', label: 'Reserve financial credit', service: 'payout', critical: true, compensation: 'Release reservation' },
  { id: 'wallet', label: 'Update wallet', service: 'wallet', critical: true },
  { id: 'notify', label: 'Send notification', service: 'notification', critical: false },
]

export interface Span {
  spanId: string
  parentId: string | null
  service: ServiceId
  operation: string
  start: number
  end: number
  status: 'ok' | 'error'
  note?: string
}

export interface WorkflowRun {
  traceId: string
  outcome: 'completed' | 'completed-with-warnings' | 'compensated'
  steps: WorkflowStep[]
  spans: Span[]
  log: string[]
}

export interface LabState {
  services: Record<ServiceId, ServiceNode>
  runs: WorkflowRun[]
}

export function initialLab(): LabState {
  const mk = (id: ServiceId, label: string, baseMs: number): ServiceNode => ({
    id,
    label,
    baseMs,
    health: 'up',
    extraLatencyMs: 0,
    breaker: 'closed',
    consecutiveFailures: 0,
  })
  return {
    services: {
      gateway: mk('gateway', 'API Gateway', 12),
      lead: mk('lead', 'Lead Service', 40),
      payout: mk('payout', 'Payout Service', 55),
      wallet: mk('wallet', 'Wallet Service', 35),
      notification: mk('notification', 'Notification Service', 25),
      broker: mk('broker', 'Event Transport', 6),
      mysql: mk('mysql', 'MySQL', 8),
    },
    runs: [],
  }
}

const update = (s: LabState, id: ServiceId, patch: Partial<ServiceNode>): LabState => ({
  ...s,
  services: { ...s.services, [id]: { ...s.services[id], ...patch } },
})

export const injectFailure = (s: LabState, id: ServiceId) => update(s, id, { health: 'down' })
export const addLatency = (s: LabState, id: ServiceId, ms = 400) => update(s, id, { extraLatencyMs: s.services[id].extraLatencyMs + ms })
export const triggerTimeout = (s: LabState, id: ServiceId) => update(s, id, { extraLatencyMs: TIMEOUT_MS + 500 })
/** Recovery: healthy again; an open breaker moves to half-open and lets one trial call through. */
export const recoverService = (s: LabState, id: ServiceId) =>
  update(s, id, {
    health: 'up',
    extraLatencyMs: 0,
    breaker: s.services[id].breaker === 'open' ? 'half-open' : s.services[id].breaker,
  })

/** Runs the payout saga once. Pure: returns the new lab state including the run. */
export function startWorkflow(state: LabState): LabState {
  const services = Object.fromEntries(Object.entries(state.services).map(([k, v]) => [k, { ...v }])) as LabState['services']
  const traceId = `4bf92f3577b34da6a3ce929d0e0e${String(4736 + state.runs.length).padStart(4, '0')}`
  let spanSeq = 0
  const newSpan = () => `00f067aa0ba9${String(++spanSeq).padStart(4, '0')}`
  const spans: Span[] = []
  const log: string[] = []
  let clock = 0

  const root: Span = { spanId: newSpan(), parentId: null, service: 'gateway', operation: 'POST /v1/payouts', start: 0, end: 0, status: 'ok' }
  spans.push(root)
  clock += services.gateway.baseMs

  /** One remote call with timeout, retries and the service's circuit breaker. */
  const call = (serviceId: ServiceId, operation: string, parentId: string): { ok: boolean; reason?: string } => {
    const svc = services[serviceId]
    if (svc.breaker === 'open') {
      spans.push({ spanId: newSpan(), parentId, service: serviceId, operation, start: clock, end: clock + 1, status: 'error', note: 'circuit open — failed fast' })
      clock += 1
      log.push(`${svc.label}: circuit OPEN → failed fast without calling`)
      return { ok: false, reason: 'circuit open' }
    }
    const attempts = svc.breaker === 'half-open' ? 1 : MAX_ATTEMPTS
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const latency = svc.baseMs + svc.extraLatencyMs
      const timedOut = latency > TIMEOUT_MS
      const failed = svc.health === 'down' || timedOut
      const duration = svc.health === 'down' ? 5 : Math.min(latency, TIMEOUT_MS)
      const spanId = newSpan()
      spans.push({
        spanId,
        parentId,
        service: serviceId,
        operation: attempts > 1 ? `${operation} (attempt ${attempt})` : `${operation} (half-open trial)`,
        start: clock,
        end: clock + duration,
        status: failed ? 'error' : 'ok',
        note: svc.health === 'down' ? 'connection refused' : timedOut ? `timeout after ${TIMEOUT_MS}ms` : undefined,
      })
      if (!failed && (serviceId === 'lead' || serviceId === 'wallet' || serviceId === 'payout')) {
        const db = services.mysql
        const dbSpan: Span = {
          spanId: newSpan(),
          parentId: spanId,
          service: 'mysql',
          operation: 'SQL transaction',
          start: clock + 2,
          end: clock + 2 + db.baseMs + db.extraLatencyMs,
          status: db.health === 'down' ? 'error' : 'ok',
          note: db.health === 'down' ? 'database unavailable' : undefined,
        }
        spans.push(dbSpan)
        if (db.health === 'down') {
          const parent = spans.find((sp) => sp.spanId === spanId)!
          parent.status = 'error'
          parent.note = 'database unavailable'
          clock += duration
          svc.consecutiveFailures += 1
          log.push(`${svc.label}: database unavailable (attempt ${attempt})`)
          if (attempt < attempts) clock += retryDelay(attempt)
          continue
        }
      }
      clock += duration
      if (!failed) {
        svc.consecutiveFailures = 0
        if (svc.breaker === 'half-open') {
          svc.breaker = 'closed'
          log.push(`${svc.label}: half-open trial succeeded → circuit CLOSED`)
        }
        return { ok: true }
      }
      svc.consecutiveFailures += 1
      log.push(`${svc.label}: ${svc.health === 'down' ? 'unavailable' : `timed out after ${TIMEOUT_MS}ms`} (attempt ${attempt}/${attempts})`)
      if (attempt < attempts) clock += retryDelay(attempt)
    }
    if (svc.consecutiveFailures >= BREAKER_THRESHOLD || svc.breaker === 'half-open') {
      svc.breaker = 'open'
      log.push(`${svc.label}: ${svc.consecutiveFailures} consecutive failures → circuit OPEN`)
    }
    return { ok: false, reason: svc.health === 'down' ? 'unavailable' : 'timeout' }
  }

  const steps: WorkflowStep[] = STEP_DEFS.map((d) => ({ ...d, status: 'pending' }))
  let outcome: WorkflowRun['outcome'] = 'completed'

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!
    const stepSpan: Span = { spanId: newSpan(), parentId: root.spanId, service: step.service, operation: step.label, start: clock, end: clock, status: 'ok' }
    spans.push(stepSpan)
    const res = call(step.service, step.id === 'notify' ? 'publish notification' : step.label.toLowerCase(), stepSpan.spanId)
    stepSpan.end = clock
    if (res.ok) {
      step.status = 'done'
      continue
    }
    stepSpan.status = 'error'
    step.detail = res.reason

    if (!step.critical) {
      step.status = 'deferred'
      step.detail = `${res.reason} → queued for later delivery (fallback)`
      outcome = 'completed-with-warnings'
      log.push('Notification is non-critical: fallback queues it instead of failing the payout')
      break
    }

    step.status = 'failed'
    outcome = 'compensated'
    log.push(`${step.label} failed → running compensations for completed steps, newest first`)
    for (let j = i - 1; j >= 0; j--) {
      const done = steps[j]!
      if (!done.compensation) continue
      const start = clock
      clock += services[done.service].baseMs
      spans.push({ spanId: newSpan(), parentId: root.spanId, service: done.service, operation: `compensate: ${done.compensation}`, start, end: clock, status: 'ok' })
      done.status = 'compensated'
      done.detail = done.compensation
    }
    for (let k = i + 1; k < steps.length; k++) steps[k]!.status = 'skipped'
    break
  }

  root.end = clock + services.gateway.baseMs
  root.status = outcome === 'compensated' ? 'error' : 'ok'
  const run: WorkflowRun = { traceId, outcome, steps, spans, log }
  return { services, runs: [...state.runs, run] }
}
