// Wallet + ledger model mirroring the semantics of my backend's applyWalletEntry /
// updateEarnings: separate balance buckets, a version counter, and a ledger whose
// idempotency keys are unique — re-posting a key returns the original entry.

import { assertPaise, type Paise } from './money'

export interface Wallet {
  available: Paise
  underReview: Paise
  lifetimeEarned: Paise
  lifetimeReversed: Paise
  lifetimeRedeemed: Paise
  lifetimeClawedBack: Paise
  version: number
}

export type EntryClass = 'EARN' | 'REVERSAL' | 'HOLD' | 'RELEASE' | 'REDEEM'

export interface LedgerEntry {
  seq: number
  idempotencyKey: string
  entryClass: EntryClass
  type: 'Add' | 'Subtract'
  amount: Paise
  referenceId: string
  availableBefore: Paise
  availableAfter: Paise
  underReviewAfter: Paise
}

export interface Ledger {
  wallet: Wallet
  entries: LedgerEntry[]
}

export type PostResult =
  | { kind: 'posted'; entry: LedgerEntry }
  | { kind: 'duplicate'; entry: LedgerEntry }
  | { kind: 'rejected'; reason: string }

export const emptyWallet = (): Wallet => ({
  available: 0,
  underReview: 0,
  lifetimeEarned: 0,
  lifetimeReversed: 0,
  lifetimeRedeemed: 0,
  lifetimeClawedBack: 0,
  version: 0,
})

export const emptyLedger = (): Ledger => ({ wallet: emptyWallet(), entries: [] })

export interface PostInput {
  idempotencyKey: string
  entryClass: EntryClass
  amount: Paise
  referenceId: string
}

const typeOf: Record<EntryClass, 'Add' | 'Subtract'> = {
  EARN: 'Add',
  RELEASE: 'Add',
  REVERSAL: 'Subtract',
  HOLD: 'Subtract',
  REDEEM: 'Subtract',
}

/** Pure: returns the next ledger and what happened. The input ledger is never mutated. */
export function postEntry(ledger: Ledger, input: PostInput): { ledger: Ledger; result: PostResult } {
  assertPaise(input.amount)
  if (input.amount <= 0) return { ledger, result: { kind: 'rejected', reason: 'Amount must be greater than zero' } }

  // Unique idempotency key: a replay returns the original entry and changes nothing.
  const existing = ledger.entries.find((e) => e.idempotencyKey === input.idempotencyKey)
  if (existing) return { ledger, result: { kind: 'duplicate', entry: existing } }

  const w = { ...ledger.wallet }
  const before = w.available
  const amt = input.amount
  switch (input.entryClass) {
    case 'EARN':
      w.available += amt
      w.lifetimeEarned += amt
      break
    case 'REVERSAL':
      w.available -= amt
      w.lifetimeReversed += amt
      break
    case 'HOLD':
      if (w.available < amt) return { ledger, result: { kind: 'rejected', reason: 'Insufficient available balance' } }
      w.available -= amt
      w.underReview += amt
      break
    case 'RELEASE':
      if (w.underReview < amt) return { ledger, result: { kind: 'rejected', reason: 'Nothing under review to release' } }
      w.available += amt
      w.underReview -= amt
      break
    case 'REDEEM':
      // Confirming a hold moves under-review → redeemed. Available is NOT debited again.
      if (w.underReview < amt) return { ledger, result: { kind: 'rejected', reason: 'No matching hold to confirm' } }
      w.underReview -= amt
      w.lifetimeRedeemed += amt
      break
  }
  w.version += 1

  const entry: LedgerEntry = {
    seq: ledger.entries.length + 1,
    idempotencyKey: input.idempotencyKey,
    entryClass: input.entryClass,
    type: typeOf[input.entryClass],
    amount: amt,
    referenceId: input.referenceId,
    availableBefore: before,
    availableAfter: w.available,
    underReviewAfter: w.underReview,
  }
  return { ledger: { wallet: w, entries: [...ledger.entries, entry] }, result: { kind: 'posted', entry } }
}

/** Sum of the ledger must always reproduce the wallet's available + under-review. */
export function ledgerIsConsistent(ledger: Ledger): boolean {
  let available = 0
  let underReview = 0
  for (const e of ledger.entries) {
    if (e.entryClass === 'EARN') available += e.amount
    if (e.entryClass === 'REVERSAL') available -= e.amount
    if (e.entryClass === 'HOLD') {
      available -= e.amount
      underReview += e.amount
    }
    if (e.entryClass === 'RELEASE') {
      available += e.amount
      underReview -= e.amount
    }
    if (e.entryClass === 'REDEEM') underReview -= e.amount
  }
  return available === ledger.wallet.available && underReview === ledger.wallet.underReview
}
