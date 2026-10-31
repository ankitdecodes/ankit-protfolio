import { describe, expect, it } from 'vitest'
import { sampleTransactions } from '../content/lab'
import { emi, parseEmiArgs, route, runAgent } from './agent'
import { signalStrengths, SIGNALS } from './anomaly'
import { forward, initNetwork, loss, train } from './nn'
import { buildIndex as buildDbIndex, execute, generateOrders } from './queryplan'
import { buildIndex, checkGroundedness, composeAnswer, projectPCA, retrieve, tokenize, type Chunk } from './rag'

const chunks: Chunk[] = [
  { id: 'a', source: 'Queue', sourceId: 'q', kind: 'decision', text: 'Imports run as background jobs on a BullMQ queue backed by Redis.' },
  { id: 'b', source: 'Reports', sourceId: 'r', kind: 'decision', text: 'Credit reports are rendered from HTML templates to PDF with Puppeteer.' },
  { id: 'c', source: 'Payments', sourceId: 'p', kind: 'decision', text: 'Payments use the CCAvenue gateway with payment status handling.' },
  { id: 'd', source: 'Bureau', sourceId: 'b', kind: 'challenge', text: 'Bureau requests retry on failure and a refresh path regenerates the report.' },
]

describe('retrieval', () => {
  const index = buildIndex(chunks)

  it('tokenises with stopwords removed and light stemming', () => {
    expect(tokenize('The imports are running on queues')).toEqual(['import', 'runn', 'queue'])
  })

  it('ranks the most relevant chunk first by cosine similarity', () => {
    const hits = retrieve(index, 'how are PDF reports generated?')
    expect(hits[0]!.chunk.id).toBe('b')
    expect(hits[0]!.score).toBeGreaterThan(0)
    expect(hits[0]!.score).toBeLessThanOrEqual(1 + 1e-9)
  })

  it('returns nothing for an unrelated query', () => {
    expect(retrieve(index, 'quantum chromodynamics')).toHaveLength(0)
  })

  it('composes an extractive answer with citations', () => {
    const hits = retrieve(index, 'background queue for imports', 1)
    const answer = composeAnswer(index, 'background queue for imports', hits)
    expect(answer[0]).toEqual({ text: chunks[0]!.text, citation: 1 })
  })

  it('projects vectors into two dimensions and places queries near similar documents', () => {
    const p = projectPCA(index.vectors)
    expect(p.points).toHaveLength(chunks.length)
    const q = p.project(index.vectors[1]!)
    expect(q.x).toBeCloseTo(p.points[1]!.x, 4)
    expect(q.y).toBeCloseTo(p.points[1]!.y, 4)
  })

  it('flags unsupported sentences in a groundedness check', () => {
    const result = checkGroundedness(
      'Bureau requests retry on failure. Responses are cached in MongoDB for thirty days.',
      chunks,
    )
    expect(result.map((r) => r.supported)).toEqual([true, false])
    expect(result[1]!.unsupportedTerms).toContain('mongodb')
  })
})

describe('tiny neural network', () => {
  const xs = sampleTransactions.map((tx) => SIGNALS.map((s) => signalStrengths(tx)[s.id]))
  const ys = sampleTransactions.map((tx) => (tx.label === 'anomalous' ? 1 : 0))

  it('produces probabilities from a forward pass', () => {
    const out = forward(initNetwork(5, 4), xs[0]!).output
    expect(out).toBeGreaterThan(0)
    expect(out).toBeLessThan(1)
  })

  it('reduces training loss deterministically', () => {
    const a = train(xs, ys)
    const b = train(xs, ys)
    expect(a.history.at(-1)!).toBeLessThan(a.history[0]!)
    expect(loss(a.net, xs, ys)).toBeCloseTo(loss(b.net, xs, ys), 12)
  })
})

describe('agent', () => {
  const deps = { index: buildIndex(chunks), transactions: sampleTransactions }

  it('computes EMI with the standard formula', () => {
    expect(Math.round(emi(500_000, 10, 60))).toBe(10624)
    expect(emi(1200, 0, 12)).toBe(100)
  })

  it('parses loan arguments including lakh and years', () => {
    expect(parseEmiArgs('EMI on 5 lakh at 10% for 5 years')).toEqual({ principal: 500_000, rate: 10, months: 60 })
  })

  it('routes requests to the right tool', () => {
    expect(route('score TX-1043')).toBe('score_transaction')
    expect(route('what is the EMI for 2 lakh')).toBe('calculate_emi')
    expect(route('how are reports rendered?')).toBe('search_portfolio')
  })

  it('asks for clarification instead of guessing missing arguments', () => {
    const steps = runAgent('What EMI should I expect?', deps)
    expect(steps.at(-1)!.kind).toBe('clarify')
  })

  it('returns a grounded tool result for transactions', () => {
    const steps = runAgent('Why was TX-1043 flagged?', deps)
    expect(steps.map((s) => s.kind)).toEqual(['plan', 'call', 'result', 'answer'])
    expect(steps.at(-1)!.body).toContain('0.90')
  })
})

describe('query engine', () => {
  const table = generateOrders(50_000)

  it('returns identical results with and without an index while examining far fewer rows', () => {
    for (const [query, idx] of [['by-customer', 'idx_customer'], ['recent-failed', 'idx_status_created']] as const) {
      const scan = execute(table, query, null)
      const indexed = execute(table, query, buildDbIndex(table, idx))
      expect(indexed.rowsReturned).toBe(scan.rowsReturned)
      expect(scan.rowsExamined).toBe(table.rows)
      expect(indexed.rowsExamined).toBe(indexed.rowsReturned)
      expect(indexed.plan.type).not.toBe('ALL')
    }
  })
})
