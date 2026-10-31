import { useRef, useState, type KeyboardEvent } from 'react'
import { capabilities, exploredStack, playgroundIntro, provenance, verifiedStack, type Provenance } from '../../content/playground'
import { ArchitectureExplorer } from '../lab/ArchitectureExplorer'
import { Reveal, Section, SectionHeading } from '../ui/primitives'
import { DistributedLab } from './DistributedLab'
import { FinancialIntegrity } from './FinancialIntegrity'
import { QueryExplorer } from './QueryExplorer'
import { ReliableAsync } from './ReliableAsync'
import { ProvenanceBadge } from './ui'

const EXPERIENCES = [
  {
    id: 'financial',
    index: '01',
    title: 'Financial Transaction Integrity',
    heading: 'Money moves once. Even when systems fail.',
    subtitle: 'How the wallet is protected against duplicate processing, concurrent requests and partial failures — modelled on the payout and redeem services I built.',
    oneLine: 'Duplicate events, concurrent writers and crashes can’t move money twice.',
    kinds: ['implemented', 'simulated'] as Provenance[],
    render: () => <FinancialIntegrity />,
  },
  {
    id: 'async',
    index: '02',
    title: 'Reliable Asynchronous Architecture',
    heading: 'Retries are easy. Reliable delivery is engineering.',
    subtitle: 'How a transactional outbox and a database-polling worker keep payout events from being lost — with retries, stale-row recovery and alerts.',
    oneLine: 'Events are committed with the business data and survive any crash.',
    kinds: ['implemented', 'simulated'] as Provenance[],
    render: () => <ReliableAsync />,
  },
  {
    id: 'distributed',
    index: '03',
    title: 'Distributed Systems Laboratory',
    heading: 'Distributed systems are defined by their failure modes.',
    subtitle: 'Service communication, saga compensation, circuit breakers and tracing — a conceptual laboratory, not a claim about my production code.',
    oneLine: 'Inject failures into services and watch the workflow compensate.',
    kinds: ['conceptual'] as Provenance[],
    render: () => <DistributedLab />,
  },
] as const

type ExperienceId = (typeof EXPERIENCES)[number]['id']

export default function PlaygroundSection() {
  const [active, setActive] = useState<ExperienceId>('financial')
  const refs = useRef<Partial<Record<ExperienceId, HTMLButtonElement | null>>>({})
  const current = EXPERIENCES.find((e) => e.id === active)!

  const onKeyDown = (e: KeyboardEvent) => {
    const i = EXPERIENCES.findIndex((x) => x.id === active)
    const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % EXPERIENCES.length : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i - 1 + EXPERIENCES.length) % EXPERIENCES.length : -1
    if (next < 0) return
    e.preventDefault()
    const id = EXPERIENCES[next]!.id
    setActive(id)
    refs.current[id]?.focus()
  }

  return (
    <Section id="playground" labelledBy="playground-title" tone="dark">
      <SectionHeading
        eyebrow="Engineering playground"
        id="playground-title"
        title={
          <>
            How I design systems <span className="serif text-accent">that hold up under failure.</span>
          </>
        }
        intro="Explore how I design reliable systems, handle failures and engineer financial workflows."
      />

      <Reveal className="mt-12 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="text-xl leading-relaxed text-fg">{playgroundIntro}</p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {capabilities.map((c) => (
              <li key={c} className="rounded-full bg-accent-dim px-4 py-2 text-[0.9375rem] font-medium text-fg ring-1 ring-accent/30">
                {c}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-surface p-5 ring-1 ring-line lg:col-span-5">
          <p className="text-sm font-semibold text-subtle">Production stack behind these demos</p>
          <p className="mt-2 font-mono text-[0.9375rem] leading-relaxed text-fg">{verifiedStack.join(' · ')}</p>
          <p className="mt-4 text-sm font-semibold text-subtle">Explored or simulated here</p>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            {exploredStack.map((x) => (
              <li key={x.name}>
                <span className="text-fg">{x.name}</span> — {x.note}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      <Reveal className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
        {(Object.keys(provenance) as Provenance[]).map((k) => (
          <span key={k} className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <ProvenanceBadge kind={k} />
            <span className="hidden xl:inline">{provenance[k].detail}</span>
          </span>
        ))}
      </Reveal>

      <div role="tablist" aria-label="Engineering experiences" onKeyDown={onKeyDown} className="mt-12 grid gap-3 md:grid-cols-3">
        {EXPERIENCES.map((x) => {
          const selected = x.id === active
          return (
            <button
              key={x.id}
              ref={(el) => {
                refs.current[x.id] = el
              }}
              role="tab"
              id={`exp-tab-${x.id}`}
              aria-selected={selected}
              aria-controls={`exp-panel-${x.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(x.id)}
              className={`rounded-2xl p-5 text-left ring-1 transition-[background-color,box-shadow] duration-300 ${
                selected ? 'bg-surface-2 shadow-glow ring-accent/60' : 'bg-surface ring-line hover:ring-accent/40'
              }`}
            >
              <span className={`text-sm font-semibold ${selected ? 'text-accent' : 'text-subtle'}`}>{x.index}</span>
              <span className="mt-1 block text-lg font-semibold text-fg">{x.title}</span>
              <span className="mt-1 block text-sm leading-relaxed text-muted">{x.oneLine}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`exp-panel-${current.id}`} aria-labelledby={`exp-tab-${current.id}`} className="mt-10">
        <div className="mb-8 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h3 className="text-3xl font-semibold tracking-tight text-fg md:text-4xl">{current.heading}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {current.kinds.map((k) => (
                <ProvenanceBadge key={k} kind={k} />
              ))}
            </div>
          </div>
          <p className="text-lg leading-relaxed text-muted lg:col-span-5">{current.subtitle}</p>
        </div>
        {current.render()}
      </div>

      <div className="mt-24 border-t border-line pt-16">
        <h3 className="text-2xl font-semibold tracking-tight text-fg">More from the playground</h3>
        <p className="mt-2 max-w-2xl text-muted">A system architecture explorer and a real in-browser query engine comparing a full table scan with an index.</p>
        <div className="mt-10 space-y-16">
          <div>
            <p className="mb-4 text-sm font-semibold text-accent">System architecture</p>
            <ArchitectureExplorer />
          </div>
          <div>
            <p className="mb-4 text-sm font-semibold text-accent">Database indexing</p>
            <QueryExplorer />
          </div>
        </div>
      </div>
    </Section>
  )
}
