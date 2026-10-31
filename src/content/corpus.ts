import type { Chunk } from '../lib/rag'
import { otherContributions, projects } from './projects'

// The AI Lab retrieves over this portfolio's own case studies, so every answer
// can be checked against the project cards above it.
export const corpus: Chunk[] = [
  ...projects.flatMap((p) => [
    { id: `${p.id}:summary`, source: p.name, sourceId: p.id, kind: 'Summary', text: p.summary },
    { id: `${p.id}:problem`, source: p.name, sourceId: p.id, kind: 'Problem', text: p.problem },
    ...p.decisions.map((d, i) => ({ id: `${p.id}:decision:${i}`, source: p.name, sourceId: p.id, kind: 'Decision', text: `${d.title}. ${d.detail}` })),
    ...p.challenges.map((c, i) => ({ id: `${p.id}:challenge:${i}`, source: p.name, sourceId: p.id, kind: 'Challenge', text: `${c.challenge}. ${c.solution}` })),
    ...p.contributions.map((c, i) => ({ id: `${p.id}:contribution:${i}`, source: p.name, sourceId: p.id, kind: 'Contribution', text: c })),
    ...p.testing.map((t, i) => ({ id: `${p.id}:testing:${i}`, source: p.name, sourceId: p.id, kind: 'Testing', text: t })),
  ]),
  ...otherContributions.flatMap((o) =>
    o.contributions.map((c, i) => ({ id: `${o.id}:${i}`, source: o.name, sourceId: o.id, kind: 'Contribution', text: c })),
  ),
]

export const sampleQuestions = [
  'How are slow imports kept off the request path?',
  'How are credit bureau failures handled?',
  'How do the Flutter apps handle push notifications?',
  'How will FinPilot keep AI explanations grounded?',
]

/** Candidate answers for the evaluation demo — deliberately mixed quality. */
export const evaluationCase = {
  question: 'How does the Q platform handle credit-bureau failures?',
  candidates: [
    {
      id: 'grounded',
      label: 'Answer A',
      text: 'Bureau requests retry on failure, and a dedicated spec covers the retry behaviour. A refresh path can regenerate a report.',
    },
    {
      id: 'partial',
      label: 'Answer B',
      text: 'Bureau requests retry on failure. Failed requests are replayed later from a Kafka topic.',
    },
    {
      id: 'hallucinated',
      label: 'Answer C',
      text: 'Responses are cached in MongoDB for thirty days. When the primary bureau is down, the platform switches to a backup bureau automatically.',
    },
  ],
}
