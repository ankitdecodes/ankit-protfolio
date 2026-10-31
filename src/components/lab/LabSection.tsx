import { useRef, useState, type KeyboardEvent } from 'react'
import { Section, SectionHeading } from '../ui/primitives'
import { AgentExplorer } from './AgentExplorer'
import { AnomalyExplorer } from './AnomalyExplorer'
import { EvaluationExplorer } from './EvaluationExplorer'
import { InferenceExplorer } from './InferenceExplorer'
import { RetrievalExplorer } from './RetrievalExplorer'

type Kind = 'real' | 'simulated' | 'model'

const LEGEND: { kind: Kind; label: string; detail: string }[] = [
  { kind: 'real', label: 'Real computation', detail: 'Actual maths running in your browser: TF-IDF, cosine similarity, PCA, gradient descent, precision and recall.' },
  { kind: 'simulated', label: 'Simulated', detail: 'Deterministic stand-ins for a model’s decisions, such as the agent’s tool router.' },
  { kind: 'model', label: 'Needs a model in production', detail: 'Where a real system would call an LLM or a trained detector — named, never faked.' },
]

const KIND_DOT: Record<Kind, string> = { real: 'bg-[#34d399]', simulated: 'bg-[#ff927a]', model: 'bg-ai' }

const TABS = [
  { id: 'retrieval', label: 'RAG & embeddings', kinds: ['real', 'model'] as Kind[], render: () => <RetrievalExplorer /> },
  { id: 'evaluation', label: 'AI evaluation', kinds: ['real', 'model'] as Kind[], render: () => <EvaluationExplorer /> },
  { id: 'agents', label: 'Tool calling', kinds: ['simulated', 'real'] as Kind[], render: () => <AgentExplorer /> },
  { id: 'inference', label: 'Neural network', kinds: ['real'] as Kind[], render: () => <InferenceExplorer /> },
  { id: 'anomaly', label: 'Anomaly detection', kinds: ['real', 'simulated'] as Kind[], render: () => <AnomalyExplorer /> },
] as const

type TabId = (typeof TABS)[number]['id']

export default function LabSection() {
  const [active, setActive] = useState<TabId>('retrieval')
  const refs = useRef<Partial<Record<TabId, HTMLButtonElement | null>>>({})

  const onKeyDown = (e: KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === active)
    const next =
      e.key === 'ArrowRight' ? (i + 1) % TABS.length
      : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? TABS.length - 1
      : -1
    if (next < 0) return
    e.preventDefault()
    const id = TABS[next]!.id
    setActive(id)
    refs.current[id]?.focus()
  }

  const tab = TABS.find((t) => t.id === active)!

  return (
    <Section id="lab" labelledBy="lab-title" tone="dark" className="border-t border-line">
      <SectionHeading
        eyebrow="Applied AI lab"
        id="lab-title"
        title={
          <>
            Applied AI, <span className="serif text-ai">without the black box.</span>
          </>
        }
        intro="Interactive explanations of how AI systems work — retrieval, evaluation, tool calling, inference and anomaly detection. No paid APIs, and nothing presented as a production model."
      />

      <dl className="mt-10 grid gap-3 sm:grid-cols-3">
        {LEGEND.map((l) => (
          <div key={l.kind} className="rounded-xl bg-surface px-4 py-3">
            <dt className="flex items-center gap-2 font-semibold text-fg">
              <span className={`size-2 rounded-full ${KIND_DOT[l.kind]}`} aria-hidden />
              {l.label}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-muted">{l.detail}</dd>
          </div>
        ))}
      </dl>

      <div
        role="tablist"
        aria-label="AI Lab demonstrations"
        onKeyDown={onKeyDown}
        className="mt-12 flex flex-wrap gap-2"
      >
        {TABS.map((t, i) => {
          const selected = t.id === active
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el
              }}
              role="tab"
              id={`lab-tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`lab-panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.id)}
              className={`inline-flex h-11 items-center gap-2.5 rounded-full border px-4 text-[0.9375rem] font-medium whitespace-nowrap transition-colors ${
                selected ? 'border-transparent bg-fg text-[#101827]' : 'border-line-strong text-muted hover:border-accent/60 hover:text-fg'
              }`}
            >
              <span className="text-sm tabular-nums opacity-60">0{i + 1}</span>
              {t.label}
              <span className="flex gap-1" aria-hidden>
                {t.kinds.map((k) => (
                  <span key={k} className={`size-1.5 rounded-full ${KIND_DOT[k]}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`lab-panel-${tab.id}`} aria-labelledby={`lab-tab-${tab.id}`} className="mt-6">
        {tab.render()}
      </div>
    </Section>
  )
}
