import { describe, expect, it } from 'vitest'
import { sampleTransactions } from '../content/lab'
import { SIGNALS, evaluate, scoreTransaction, type SignalId, type Transaction } from './anomaly'

const all = new Set<SignalId>(SIGNALS.map((s) => s.id))

const base: Transaction = {
  id: 'T',
  merchant: 'M',
  category: 'C',
  amount: 50,
  time: '12:00',
  baselineMean: 50,
  baselineStd: 10,
  newDevice: false,
  locationMismatch: false,
  txnsLastHour: 1,
  label: 'normal',
}

describe('scoreTransaction', () => {
  it('scores an ordinary transaction as zero', () => {
    expect(scoreTransaction(base, all).score).toBe(0)
  })

  it('weights sum to one so scores stay within [0, 1]', () => {
    expect(SIGNALS.reduce((s, x) => s + x.weight, 0)).toBeCloseTo(1)
    const extreme = { ...base, amount: 10_000, time: '03:00', newDevice: true, locationMismatch: true, txnsLastHour: 20 }
    expect(scoreTransaction(extreme, all).score).toBeCloseTo(1)
  })

  it('attributes each point of score to a named signal with evidence', () => {
    const tx = { ...base, newDevice: true, time: '02:10' }
    const { score, contributions } = scoreTransaction(tx, all)
    expect(score).toBeCloseTo(0.3)
    const active = contributions.filter((c) => c.value > 0).map((c) => c.signal)
    expect(active.sort()).toEqual(['device', 'hours'])
    expect(contributions.find((c) => c.signal === 'hours')?.evidence).toContain('02:10')
  })

  it('orders contributions from largest to smallest', () => {
    const tx = { ...base, amount: 120, locationMismatch: true }
    const values = scoreTransaction(tx, all).contributions.map((c) => c.value)
    expect(values).toEqual([...values].sort((a, b) => b - a))
  })

  it('ignores disabled signals', () => {
    const tx = { ...base, newDevice: true }
    const result = scoreTransaction(tx, new Set<SignalId>(['amount']))
    expect(result.score).toBe(0)
    expect(result.contributions.map((c) => c.signal)).toEqual(['amount'])
  })
})

describe('evaluate', () => {
  const scored = sampleTransactions.map((tx) => scoreTransaction(tx, all))

  it('produces a confusion matrix that covers every record', () => {
    const m = evaluate(scored, 0.5)
    expect(m.truePositives + m.falsePositives + m.falseNegatives + m.trueNegatives).toBe(sampleTransactions.length)
  })

  it('trades precision for recall as the threshold drops', () => {
    const strict = evaluate(scored, 0.85)
    const loose = evaluate(scored, 0.15)
    expect(loose.recall!).toBeGreaterThanOrEqual(strict.recall!)
    expect(loose.falsePositives).toBeGreaterThan(strict.falsePositives)
  })

  it('returns null precision when nothing is flagged', () => {
    expect(evaluate(scored, 2).precision).toBeNull()
  })
})
