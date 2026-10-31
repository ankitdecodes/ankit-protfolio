// A deterministic tool-calling loop. A keyword router stands in for the model's
// tool choice so the trace is reproducible and needs no API; the tools themselves
// do real work (retrieval, EMI maths, anomaly scoring).

import { SIGNALS, scoreTransaction, type SignalId, type Transaction } from './anomaly'
import { retrieve, type Index } from './rag'

export type ToolName = 'search_portfolio' | 'calculate_emi' | 'score_transaction'

export interface TraceStep {
  kind: 'plan' | 'call' | 'result' | 'answer' | 'clarify'
  title: string
  body: string
}

export const TOOL_SCHEMAS: Record<ToolName, { description: string; parameters: Record<string, string> }> = {
  search_portfolio: {
    description: 'Retrieve the most relevant passages from Ankit’s project case studies.',
    parameters: { query: 'string' },
  },
  calculate_emi: {
    description: 'Monthly instalment for a loan using the standard PMT formula.',
    parameters: { principal: 'number', annual_rate_pct: 'number', tenure_months: 'number' },
  },
  score_transaction: {
    description: 'Score a sample transaction from the AI Lab dataset and return its evidence.',
    parameters: { transaction_id: 'string (TX-####)' },
  },
}

/** Standard amortised-loan instalment (PMT). */
export function emi(principal: number, annualRatePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  const r = annualRatePct / 100 / 12
  if (r === 0) return principal / months
  const f = Math.pow(1 + r, months)
  return (principal * r * f) / (f - 1)
}

function parseAmount(text: string): number | null {
  const m = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(lakh|lac|l\b|k\b|thousand|crore|cr\b)?(?!\s*(?:%|percent|month|mo\b|year|yr))/i)
  if (!m) return null
  const n = Number.parseFloat(m[1]!.replace(/,/g, ''))
  const unit = m[2]?.toLowerCase()
  if (!unit) return n
  if (unit.startsWith('l')) return n * 100_000
  if (unit.startsWith('c')) return n * 10_000_000
  return n * 1_000
}

export function parseEmiArgs(text: string): { principal: number | null; rate: number | null; months: number | null } {
  const rate = text.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/i)
  const months = text.match(/(\d+)\s*(month|mo\b|year|yr)/i)
  const tenure = months ? Number(months[1]) * (/^y/i.test(months[2]!) ? 12 : 1) : null
  return { principal: parseAmount(text), rate: rate ? Number(rate[1]) : null, months: tenure }
}

export function route(prompt: string): ToolName {
  if (/\bTX-\d{4}\b/i.test(prompt)) return 'score_transaction'
  if (/\b(emi|instal+ment|monthly payment|repay)/i.test(prompt)) return 'calculate_emi'
  return 'search_portfolio'
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`

export function runAgent(prompt: string, deps: { index: Index; transactions: Transaction[] }): TraceStep[] {
  const tool = route(prompt)
  const steps: TraceStep[] = [
    {
      kind: 'plan',
      title: 'Choose a tool',
      body: `Router matched this request to \`${tool}\` — ${TOOL_SCHEMAS[tool].description}`,
    },
  ]

  if (tool === 'calculate_emi') {
    const args = parseEmiArgs(prompt)
    const missing = Object.entries({ principal: args.principal, annual_rate_pct: args.rate, tenure_months: args.months })
      .filter(([, v]) => v === null)
      .map(([k]) => k)
    if (missing.length) {
      steps.push({ kind: 'clarify', title: 'Missing arguments', body: `Cannot call the tool without: ${missing.join(', ')}. Ask the user instead of guessing.` })
      return steps
    }
    const call = { principal: args.principal!, annual_rate_pct: args.rate!, tenure_months: args.months! }
    steps.push({ kind: 'call', title: 'calculate_emi', body: JSON.stringify(call, null, 2) })
    const monthly = emi(call.principal, call.annual_rate_pct, call.tenure_months)
    const total = monthly * call.tenure_months
    steps.push({ kind: 'result', title: 'Tool result', body: JSON.stringify({ emi: Math.round(monthly), total_payable: Math.round(total), total_interest: Math.round(total - call.principal) }, null, 2) })
    steps.push({
      kind: 'answer',
      title: 'Answer',
      body: `The monthly instalment is ${inr(monthly)} over ${call.tenure_months} months — ${inr(total)} in total, of which ${inr(total - call.principal)} is interest.`,
    })
    return steps
  }

  if (tool === 'score_transaction') {
    const id = prompt.match(/TX-\d{4}/i)![0].toUpperCase()
    steps.push({ kind: 'call', title: 'score_transaction', body: JSON.stringify({ transaction_id: id }, null, 2) })
    const tx = deps.transactions.find((t) => t.id === id)
    if (!tx) {
      steps.push({ kind: 'result', title: 'Tool error', body: JSON.stringify({ error: `No sample transaction ${id}` }, null, 2) })
      steps.push({ kind: 'answer', title: 'Answer', body: `I couldn’t find ${id} in the sample dataset, so I won’t guess a score.` })
      return steps
    }
    const all = new Set<SignalId>(SIGNALS.map((s) => s.id))
    const scored = scoreTransaction(tx, all)
    const top = scored.contributions.filter((c) => c.value > 0).slice(0, 2)
    steps.push({
      kind: 'result',
      title: 'Tool result',
      body: JSON.stringify({ score: scored.score, top_signals: top.map((c) => ({ signal: c.signal, points: Number(c.value.toFixed(2)) })) }, null, 2),
    })
    steps.push({
      kind: 'answer',
      title: 'Answer',
      body: top.length
        ? `${id} scores ${scored.score.toFixed(2)}. Main evidence: ${top.map((c) => c.evidence).join(' ')}`
        : `${id} scores ${scored.score.toFixed(2)} — no risk signals are active.`,
    })
    return steps
  }

  steps.push({ kind: 'call', title: 'search_portfolio', body: JSON.stringify({ query: prompt }, null, 2) })
  const hits = retrieve(deps.index, prompt, 2)
  steps.push({
    kind: 'result',
    title: 'Tool result',
    body: JSON.stringify(hits.map((h) => ({ source: h.chunk.source, score: Number(h.score.toFixed(3)) })), null, 2),
  })
  steps.push({
    kind: 'answer',
    title: 'Answer',
    body: hits.length
      ? hits.map((h, i) => `${h.chunk.text} [${i + 1}: ${h.chunk.source}]`).join(' ')
      : 'Nothing in the case studies matches that, so I have no grounded answer.',
  })
  return steps
}
