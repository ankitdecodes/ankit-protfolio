import { useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { archEdges, archFlows, archLayouts, archNodes, type ArchNodeId } from '../../content/lab'
import { useMediaQuery } from '../../lib/hooks'
import { Tag } from '../ui/primitives'

export function ArchitectureExplorer() {
  const wide = useMediaQuery('(min-width: 1024px)')
  const layout = archLayouts[wide ? 'wide' : 'narrow']
  const [selected, setSelected] = useState<ArchNodeId>('api')
  const [flowId, setFlowId] = useState<string | null>(null)
  const [step, setStep] = useState(0)

  const flow = archFlows.find((f) => f.id === flowId) ?? null
  const activeEdges = new Set(flow ? flow.steps.slice(0, step + 1).map((s) => s.edge) : [])
  const currentEdge = flow?.steps[step]?.edge
  const node = archNodes.find((n) => n.id === selected)!
  const connected = new Set(archEdges.filter((e) => e.from === selected || e.to === selected).map((e) => e.id))

  const pct = (x: number, y: number) => ({ left: `${(x / layout.width) * 100}%`, top: `${(y / layout.height) * 100}%` })

  const selectFlow = (id: string) => {
    if (flowId === id) {
      setFlowId(null)
      return
    }
    setFlowId(id)
    setStep(0)
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
        <span className="font-mono text-xs text-muted">architecture.explorer</span>
        <Tag>Reference architecture</Tag>
        <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto" role="group" aria-label="Trace a request flow">
          {archFlows.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={flowId === f.id}
              onClick={() => selectFlow(f.id)}
              className="h-9 rounded-full border border-line-strong px-3.5 text-sm text-muted transition-colors hover:text-fg aria-pressed:border-ai/50 aria-pressed:bg-ai-dim aria-pressed:text-ai"
            >
              Trace: {f.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="relative border-b border-line p-4 sm:p-6 lg:px-10 lg:py-8">
          <div className="relative mx-auto w-full" style={{ aspectRatio: `${layout.width} / ${layout.height}`, maxWidth: wide ? undefined : 420 }}>
            <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="absolute inset-0 size-full" aria-hidden>
              {archEdges.map((edge) => {
                const a = layout.nodes[edge.from]
                const b = layout.nodes[edge.to]
                const inFlow = activeEdges.has(edge.id)
                const isCurrent = edge.id === currentEdge
                const highlighted = flow ? inFlow : connected.has(edge.id)
                return (
                  <g key={edge.id}>
                    <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--color-line-strong)" strokeWidth={1} />
                    {highlighted && (
                      <line
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        className="edge-flow"
                        stroke={flow ? 'var(--color-ai)' : 'var(--color-accent)'}
                        strokeWidth={isCurrent ? 2 : 1.5}
                        opacity={flow && !isCurrent ? 0.55 : 1}
                      />
                    )}
                    {wide && (
                      <text
                        x={(a.x + b.x) / 2 + (a.x === b.x ? 10 : 0)}
                        y={(a.y + b.y) / 2 - (a.x === b.x ? -4 : 8)}
                        textAnchor={a.x === b.x ? 'start' : 'middle'}
                        className="fill-subtle font-mono"
                        fontSize={12}
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                )
              })}
            </svg>

            {archNodes.map((n) => {
              const pos = layout.nodes[n.id]
              const isSelected = n.id === selected
              return (
                <button
                  key={n.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelected(n.id)
                    setFlowId(null)
                  }}
                  style={pct(pos.x, pos.y)}
                  className={`absolute w-[7.25rem] -translate-x-1/2 -translate-y-1/2 rounded-xl border px-2.5 py-2 text-left transition-[border-color,background-color,box-shadow] duration-200 sm:w-36 sm:px-3 sm:py-2.5 ${
                    isSelected
                      ? 'border-accent/70 bg-surface-2 shadow-glow'
                      : 'border-line-strong bg-surface hover:border-accent/40'
                  }`}
                >
                  <span className="block font-mono text-xs tracking-wider text-subtle uppercase">{n.kind}</span>
                  <span className="mt-0.5 block text-[0.8rem] leading-tight font-medium text-fg sm:text-sm">{n.label}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-4 text-center font-mono text-xs text-subtle">Select a component, or trace a request flow.</p>
        </div>

        <div className="min-h-[22rem] p-6 sm:p-8 lg:px-10">
          <p className="sr-only" role="status" aria-live="polite">
            {flow
              ? `${flow.label}, step ${step + 1} of ${flow.steps.length}: ${flow.steps[step]?.description ?? ''}`
              : `Showing ${node.label}`}
          </p>
          <AnimatePresence mode="wait" initial={false}>
            {flow ? (
              <m.div key={`flow-${flow.id}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-3xl">
                <p className="eyebrow">Request trace</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-fg">{flow.label}</h3>
                <ol className="mt-5 space-y-1">
                  {flow.steps.map((s, i) => (
                    <li key={s.edge + i}>
                      <button
                        type="button"
                        onClick={() => setStep(i)}
                        aria-current={i === step ? 'step' : undefined}
                        className={`grid w-full grid-cols-[2rem_1fr] rounded-lg px-2 py-2.5 text-left text-sm transition-colors ${
                          i === step ? 'bg-ai-dim text-fg' : i < step ? 'text-muted' : 'text-subtle hover:text-muted'
                        }`}
                      >
                        <span className={`font-mono text-xs ${i <= step ? 'text-ai' : ''}`}>{String(i + 1).padStart(2, '0')}</span>
                        <span>{s.description}</span>
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0}
                    className="h-10 rounded-full border border-line-strong px-4 text-sm text-fg transition-colors hover:bg-surface-2 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep((s) => Math.min(flow.steps.length - 1, s + 1))}
                    disabled={step === flow.steps.length - 1}
                    className="h-10 rounded-full bg-fg px-4 text-sm font-medium text-bg transition-colors hover:bg-ai disabled:opacity-40"
                  >
                    Next step
                  </button>
                </div>
              </m.div>
            ) : (
              <m.div key={node.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-3xl">
                <p className="eyebrow">{node.kind}</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-fg">{node.label}</h3>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {node.technologies.map((t) => (
                    <li key={t}>
                      <Tag tone="accent">{t}</Tag>
                    </li>
                  ))}
                </ul>
                <dl className="mt-6 grid gap-5 text-sm leading-relaxed sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="eyebrow mb-1.5">Responsibility</dt>
                    <dd className="text-muted">{node.responsibility}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow mb-1.5">Data in</dt>
                    <dd className="text-muted">{node.inputs}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow mb-1.5">Data out</dt>
                    <dd className="text-muted">{node.outputs}</dd>
                  </div>
                  <div className="rounded-xl border border-line bg-bg/40 p-4 sm:col-span-2">
                    <dt className="eyebrow mb-1.5 text-accent">Trade-off</dt>
                    <dd className="text-muted">{node.tradeoff}</dd>
                  </div>
                </dl>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
