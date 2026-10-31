// Deterministic, rule-weighted anomaly scoring used by the AI Lab demo.
// It is intentionally transparent: every point of score maps to one named signal.
// This is an illustration of explainable scoring, not a trained model.

export interface Transaction {
  id: string
  merchant: string
  category: string
  amount: number
  /** Local time, HH:MM */
  time: string
  /** Account's 30-day mean and standard deviation for amount */
  baselineMean: number
  baselineStd: number
  newDevice: boolean
  locationMismatch: boolean
  txnsLastHour: number
  /** Synthetic ground-truth label, used only to compute evaluation metrics */
  label: 'anomalous' | 'normal'
}

export type SignalId = 'amount' | 'hours' | 'device' | 'location' | 'velocity'

export interface SignalDefinition {
  id: SignalId
  label: string
  weight: number
}

export const SIGNALS: SignalDefinition[] = [
  { id: 'amount', label: 'Amount deviation', weight: 0.35 },
  { id: 'location', label: 'Location mismatch', weight: 0.2 },
  { id: 'hours', label: 'Unusual hour', weight: 0.15 },
  { id: 'device', label: 'New device', weight: 0.15 },
  { id: 'velocity', label: 'Transaction velocity', weight: 0.15 },
]

export interface Contribution {
  signal: SignalId
  label: string
  /** Points added to the 0–1 score */
  value: number
  evidence: string
}

export interface ScoredTransaction {
  transaction: Transaction
  score: number
  contributions: Contribution[]
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export const formatMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: Number.isInteger(n) ? 0 : 2 })

function hourOf(time: string): number {
  return Number.parseInt(time.split(':')[0] ?? '0', 10)
}

/** Strength of each signal in [0, 1] together with the evidence behind it. */
function measure(tx: Transaction, signal: SignalId): { strength: number; evidence: string } {
  switch (signal) {
    case 'amount': {
      const z = (tx.amount - tx.baselineMean) / tx.baselineStd
      return {
        strength: clamp01((z - 1) / 4),
        evidence: `${formatMoney(tx.amount)} is ${z.toFixed(1)}σ from this account’s 30-day mean of ${formatMoney(tx.baselineMean)}.`,
      }
    }
    case 'hours': {
      const h = hourOf(tx.time)
      const unusual = h < 6
      return {
        strength: unusual ? 1 : 0,
        evidence: unusual
          ? `Initiated at ${tx.time}, inside the 00:00–05:59 window this account rarely uses.`
          : `Initiated at ${tx.time}, within normal activity hours.`,
      }
    }
    case 'device':
      return {
        strength: tx.newDevice ? 1 : 0,
        evidence: tx.newDevice ? 'First time this device has been seen on the account.' : 'Device previously seen on this account.',
      }
    case 'location':
      return {
        strength: tx.locationMismatch ? 1 : 0,
        evidence: tx.locationMismatch
          ? 'Location differs from the account’s usual country.'
          : 'Location matches the account’s usual country.',
      }
    case 'velocity':
      return {
        strength: clamp01((tx.txnsLastHour - 2) / 6),
        evidence: `${tx.txnsLastHour} transaction${tx.txnsLastHour === 1 ? '' : 's'} in the past hour (typical: 2 or fewer).`,
      }
  }
}

/** Raw strength of every signal in [0, 1], used as model input features. */
export function signalStrengths(tx: Transaction): Record<SignalId, number> {
  const out = {} as Record<SignalId, number>
  for (const s of SIGNALS) out[s.id] = measure(tx, s.id).strength
  return out
}

export function scoreTransaction(tx: Transaction, enabled: ReadonlySet<SignalId>): ScoredTransaction {
  const contributions = SIGNALS.filter((s) => enabled.has(s.id))
    .map((s) => {
      const { strength, evidence } = measure(tx, s.id)
      return { signal: s.id, label: s.label, value: strength * s.weight, evidence }
    })
    .sort((a, b) => b.value - a.value)

  const score = Math.round(contributions.reduce((sum, c) => sum + c.value, 0) * 1000) / 1000
  return { transaction: tx, score, contributions }
}

export interface Evaluation {
  truePositives: number
  falsePositives: number
  falseNegatives: number
  trueNegatives: number
  precision: number | null
  recall: number | null
}

export function evaluate(scored: ScoredTransaction[], threshold: number): Evaluation {
  let tp = 0
  let fp = 0
  let fn = 0
  let tn = 0
  for (const { transaction, score } of scored) {
    const flagged = score >= threshold
    const anomalous = transaction.label === 'anomalous'
    if (flagged && anomalous) tp++
    else if (flagged) fp++
    else if (anomalous) fn++
    else tn++
  }
  return {
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    trueNegatives: tn,
    precision: tp + fp === 0 ? null : tp / (tp + fp),
    recall: tp + fn === 0 ? null : tp / (tp + fn),
  }
}
