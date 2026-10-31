import { useState, type CSSProperties } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { evaluationCase } from '../../content/corpus'
import { evaluationSteps } from '../../content/lab'
import { checkGroundedness, retrieve } from '../../lib/rag'
import { LabFrame } from './LabFrame'
import { labIndex } from './labIndex'

export function EvaluationExplorer() {
  const [threshold, setThreshold] = useState(0.6)
  const [selected, setSelected] = useState(evaluationCase.candidates[1]!.id)

  const context = retrieve(labIndex, evaluationCase.question, 4).map((h) => h.chunk)
  const results = evaluationCase.candidates.map((c) => {
    const sentences = checkGroundedness(c.text, context, threshold)
    const supported = sentences.filter((s) => s.supported).length
    return { ...c, sentences, supported, pass: supported === sentences.length }
  })
  const active = results.find((r) => r.id === selected)!

  return (
    <LabFrame
      name="groundedness.eval"
      badge="Lexical support check"
      note="Support is measured as the share of a sentence’s content words found in one retrieved chunk. Production evaluators use NLI models or LLM judges plus human review; this proxy shows the method, not a benchmark."
    >
      <div className="grid gap-5 border-b border-line p-4 sm:p-6 md:grid-cols-12">
        <div className="md:col-span-8">
          <p className="eyebrow">Question</p>
          <p className="mt-1.5 text-lg text-fg">{evaluationCase.question}</p>
        </div>
        <div className="md:col-span-4">
          <div className="flex items-baseline justify-between">
            <label htmlFor="support" className="text-sm font-medium text-fg">
              Support threshold
            </label>
            <output htmlFor="support" className="font-mono text-ai">
              {threshold.toFixed(2)}
            </output>
          </div>
          <input
            id="support"
            type="range"
            min={0.3}
            max={0.9}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="range w-full"
            style={{ '--fill': `${((threshold - 0.3) / 0.6) * 100}%` } as CSSProperties}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-12">
        <div className="border-b border-line p-4 sm:p-6 lg:col-span-7 lg:border-r lg:border-b-0">
          <div role="radiogroup" aria-label="Candidate answers" className="grid gap-2 sm:grid-cols-3">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={r.id === selected}
                onClick={() => setSelected(r.id)}
                className="rounded-lg border border-line p-3 text-left transition-colors hover:border-line-strong aria-checked:border-ai/50 aria-checked:bg-ai-dim"
              >
                <span className="flex items-center justify-between text-sm font-medium text-fg">
                  {r.label}
                  {r.pass ? <CheckCircle2 className="size-4 text-accent" aria-hidden /> : <XCircle className="size-4 text-ai" aria-hidden />}
                </span>
                <span className="mt-1 block font-mono text-xs text-muted">
                  {r.supported}/{r.sentences.length} sentences supported
                </span>
                <span className="sr-only">{r.pass ? 'passes' : 'fails'}</span>
              </button>
            ))}
          </div>

          <ol className="mt-5 space-y-3" aria-live="polite">
            {active.sentences.map((s, i) => (
              <li key={i} className={`rounded-lg border p-3 ${s.supported ? 'border-accent/30' : 'border-ai/40 bg-ai-dim/40'}`}>
                <p className="text-sm leading-relaxed text-fg">{s.sentence}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs">
                  <span className={s.supported ? 'text-accent' : 'text-ai'}>
                    {s.supported ? 'supported' : 'unsupported'} · {(s.support * 100).toFixed(0)}%
                  </span>
                  {s.bestSource && <span className="text-subtle">best source: {s.bestSource}</span>}
                  {s.unsupportedTerms.length > 0 && (
                    <span className="text-subtle">not in context: {s.unsupportedTerms.join(', ')}</span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="p-4 sm:p-6 lg:col-span-5">
          <p className="eyebrow">Retrieved context ({context.length} chunks)</p>
          <ul className="mt-2 space-y-2">
            {context.map((c) => (
              <li key={c.id} className="rounded-lg border border-line bg-bg/40 p-3 text-xs leading-relaxed text-muted">
                <span className="font-mono text-subtle">{c.source} · {c.kind}</span>
                <span className="mt-1 block text-fg/90">{c.text}</span>
              </li>
            ))}
          </ul>
          <p className="eyebrow mt-6">How I’d evaluate a real model</p>
          <ol className="mt-2 space-y-2">
            {evaluationSteps.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[1.75rem_1fr] text-xs leading-relaxed">
                <span className="font-mono text-ai">0{i + 1}</span>
                <span>
                  <span className="text-fg">{s.title}.</span> <span className="text-muted">{s.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </LabFrame>
  )
}
