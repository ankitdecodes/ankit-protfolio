// Agent redeem lifecycle, modelled on my AgentWalletService + WalletService:
// PENDING (hold) → APPROVED (confirm hold, no second debit) or REJECTED (release)
// → PAID (status change only — no external bank transfer is modelled).

import { emptyLedger, postEntry, type Ledger } from './ledger'
import type { Paise } from './money'
import type { TimelineItem } from './outbox'

export type RedeemStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'
export type Role = 'AGENT' | 'MIS' | 'FINANCE' | 'ADMIN'

export const ACTIVE_STATUSES: RedeemStatus[] = ['PENDING', 'APPROVED', 'PAID']

export interface RedeemRequest {
  id: string
  leadId: string
  agentId: string
  amount: Paise
  status: RedeemStatus
}

export interface RedeemState {
  agentId: string
  leadId: string
  ledger: Ledger
  requests: RedeemRequest[]
  timeline: TimelineItem[]
  step: number
}

export function initialRedeemState(opening: Paise): RedeemState {
  const { ledger } = postEntry(emptyLedger(), { idempotencyKey: 'seed:opening-earnings', entryClass: 'EARN', amount: opening, referenceId: 'LD-24017' })
  return {
    agentId: 'AG-1042',
    leadId: 'LD-24017',
    ledger,
    requests: [],
    timeline: [{ t: 0, kind: 'info', text: 'Agent AG-1042 has earned payouts in the wallet' }],
    step: 0,
  }
}

const push = (s: RedeemState, kind: TimelineItem['kind'], text: string): RedeemState => ({
  ...s,
  step: s.step + 1,
  timeline: [...s.timeline, { t: s.step + 1, kind, text }],
})

export const latestRequest = (s: RedeemState) => s.requests.at(-1) ?? null

export function createRedeem(state: RedeemState, amount: Paise, role: Role, actingAgent = state.agentId): RedeemState {
  let s = push(state, 'info', `Redeem request for ${amount / 100} points`)
  if (role !== 'AGENT' && role !== 'ADMIN') return push(s, 'rejected', 'Only the agent can create their redeem request')
  if (actingAgent !== state.agentId) return push(s, 'rejected', 'You cannot create redeem requests for another agent')
  s = push(s, 'business', `✓ Ownership: ${state.leadId} belongs to ${state.agentId}; wallet owner resolved`)
  const active = s.requests.find((r) => r.leadId === s.leadId && ACTIVE_STATUSES.includes(r.status))
  if (active) return push(s, 'rejected', `Redeem blocked: lead ${s.leadId} already has redeem ${active.id} status=${active.status}`)
  s = push(s, 'business', '✓ No active redeem request for this lead')
  if (amount <= 0) return push(s, 'rejected', 'Redeem points must be greater than zero')
  if (s.ledger.wallet.available < amount) return push(s, 'rejected', 'Insufficient available balance')
  s = push(s, 'business', '✓ Available balance covers the request')

  const id = `RR-${5001 + s.requests.length}`
  const held = postEntry(s.ledger, { idempotencyKey: `redeem-hold:${id}`, entryClass: 'HOLD', amount, referenceId: id })
  if (held.result.kind !== 'posted') return push(s, 'rejected', `Hold failed: ${held.result.kind === 'rejected' ? held.result.reason : 'duplicate'}`)
  s = { ...s, ledger: held.ledger, requests: [...s.requests, { id, leadId: s.leadId, agentId: s.agentId, amount, status: 'PENDING' }] }
  return push(s, 'ledger', `BEGIN · ${id} created PENDING + REDEEM_HOLD (key redeem-hold:${id}) · COMMIT — one transaction`)
}

function lockedRequest(s: RedeemState) {
  const req = latestRequest(s)
  return req ? { req, s: push(s, 'business', `SELECT ${req.id} … FOR UPDATE (pessimistic write lock)`) } : null
}

export function misApprove(state: RedeemState, role: Role): RedeemState {
  if (role !== 'MIS' && role !== 'ADMIN') return push(state, 'rejected', 'Only MIS team can approve redeem requests')
  const locked = lockedRequest(state)
  if (!locked) return push(state, 'rejected', 'No redeem request to approve')
  let { s } = locked
  const { req } = locked
  if (req.status !== 'PENDING') return push(s, 'rejected', `${req.id} is ${req.status} — only PENDING requests can be approved`)
  const confirmed = postEntry(s.ledger, { idempotencyKey: `redeem:${req.id}`, entryClass: 'REDEEM', amount: req.amount, referenceId: req.id })
  if (confirmed.result.kind === 'rejected') return push(s, 'rejected', confirmed.result.reason)
  s = { ...s, ledger: confirmed.ledger, requests: s.requests.map((r) => (r.id === req.id ? { ...r, status: 'APPROVED' } : r)) }
  return push(s, 'ledger', `Hold confirmed (key redeem:${req.id}): under-review → redeemed. Available is not debited again → APPROVED`)
}

export function misReject(state: RedeemState, role: Role): RedeemState {
  if (role !== 'MIS' && role !== 'ADMIN') return push(state, 'rejected', 'Only MIS team can reject redeem requests')
  const locked = lockedRequest(state)
  if (!locked) return push(state, 'rejected', 'No redeem request to reject')
  let { s } = locked
  const { req } = locked
  if (req.status !== 'PENDING') return push(s, 'rejected', `${req.id} is ${req.status} — only PENDING requests can be rejected`)
  const released = postEntry(s.ledger, { idempotencyKey: `redeem-release:${req.id}`, entryClass: 'RELEASE', amount: req.amount, referenceId: req.id })
  if (released.result.kind === 'rejected') return push(s, 'rejected', released.result.reason)
  s = { ...s, ledger: released.ledger, requests: s.requests.map((r) => (r.id === req.id ? { ...r, status: 'REJECTED' } : r)) }
  return push(s, 'ledger', `Hold released (key redeem-release:${req.id}): under-review → available → REJECTED`)
}

/** Replays the release for the latest request — the unique key makes it a no-op. */
export function replayRelease(state: RedeemState): RedeemState {
  const req = latestRequest(state)
  if (!req || req.status !== 'REJECTED') return push(state, 'rejected', 'Reject a request first, then replay its release')
  const again = postEntry(state.ledger, { idempotencyKey: `redeem-release:${req.id}`, entryClass: 'RELEASE', amount: req.amount, referenceId: req.id })
  return push(
    { ...state, ledger: again.ledger },
    again.result.kind === 'duplicate' ? 'ledger' : 'rejected',
    again.result.kind === 'duplicate' ? `Release replayed: key redeem-release:${req.id} exists → no second release` : 'Unexpected second release',
  )
}

export function financeMarkPaid(state: RedeemState, role: Role): RedeemState {
  if (role !== 'FINANCE' && role !== 'ADMIN') return push(state, 'rejected', 'Only Finance team can mark redeem requests as paid')
  const locked = lockedRequest(state)
  if (!locked) return push(state, 'rejected', 'No redeem request to mark as paid')
  let { s } = locked
  const { req } = locked
  if (req.status !== 'APPROVED') return push(s, 'rejected', 'Only MIS-approved redeem requests can be marked as paid')
  s = { ...s, requests: s.requests.map((r) => (r.id === req.id ? { ...r, status: 'PAID' } : r)) }
  return push(s, 'business', `${req.id} → PAID. A status transition only — no bank transfer is performed by this code`)
}
