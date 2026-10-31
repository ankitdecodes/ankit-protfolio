import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { sampleTransactions } from '../../content/lab'
import { TOOL_SCHEMAS, runAgent, type ToolName, type TraceStep } from '../../lib/agent'
import { LabFrame } from './LabFrame'
import { labIndex } from './labIndex'

const PROMPTS = [
  'What is the EMI on 5 lakh at 10% for 5 years?',
  'Why was TX-1043 flagged?',
  'How are credit bureau failures handled?',
  'What EMI should I expect?',
]

const kindStyle: Record<TraceStep['kind'], string> = {
  plan: 'text-muted',
  call: 'text-ai',
  result: 'text-accent',
  answer: 'text-fg',
  clarify: 'text-ai',
}

export function AgentExplorer() {
  const [draft, setDraft] = useState(PROMPTS[0]!)
  const [steps, setSteps] = useState<TraceStep[]>(() => runAgent(PROMPTS[0]!, { index: labIndex, transactions: sampleTransactions }))
  const run = (prompt: string) => setSteps(runAgent(prompt, { index: labIndex, transactions: sampleTransactions }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (draft.trim()) run(draft.trim())
  }

  const calledTool = steps.find((s) => s.kind === 'call')?.title as ToolName | undefined

  return (
    <LabFrame
      name="agent.trace"
      badge="Rule-based router · real tools"
      note="A keyword router stands in for the model’s tool choice so every trace is reproducible and free. The tools themselves run for real: retrieval over the case studies, the EMI formula, and the anomaly scorer."
    >
      <form onSubmit={submit} className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:p-6">
        <label htmlFor="agent-q" className="sr-only">
          Ask the agent
        </label>
        <input
          id="agent-q"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-11 flex-1 rounded-lg border border-line bg-bg px-4 text-sm text-fg focus:border-accent/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
        />
        <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fg px-4 text-sm font-medium text-bg hover:bg-accent">
          <Send className="size-4" aria-hidden /> Run agent
        </button>
      </form>
      <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3 sm:px-6">
        {PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setDraft(p)
              run(p)
            }}
            className="rounded-md border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-line-strong hover:text-fg"
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-12">
        <div className="border-b border-line p-4 sm:p-6 lg:col-span-4 lg:border-r lg:border-b-0">
          <p className="eyebrow">Tool registry</p>
          <ul className="mt-3 space-y-2">
            {(Object.keys(TOOL_SCHEMAS) as ToolName[]).map((name) => (
              <li
                key={name}
                className={`rounded-lg border p-3 transition-colors ${name === calledTool ? 'border-ai/50 bg-ai-dim' : 'border-line'}`}
              >
                <p className="font-mono text-xs text-fg">{name}()</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">{TOOL_SCHEMAS[name].description}</p>
                <p className="mt-1.5 font-mono text-xs text-subtle">
                  {Object.entries(TOOL_SCHEMAS[name].parameters)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ')}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <ol className="relative space-y-4 p-4 sm:p-6 lg:col-span-8" aria-live="polite">
          {steps.map((s, i) => (
            <li key={`${s.kind}-${i}`} className="grid grid-cols-[1.75rem_1fr] gap-x-2">
              <span className="font-mono text-xs text-subtle">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className={`font-mono text-xs uppercase tracking-wider ${kindStyle[s.kind]}`}>
                  {s.kind} · {s.title}
                </p>
                {s.kind === 'call' || s.kind === 'result' ? (
                  <pre className="mt-1.5 overflow-x-auto rounded-lg border border-line bg-bg/60 p-3 font-mono text-xs leading-relaxed text-fg">
                    {s.body}
                  </pre>
                ) : (
                  <p className={`mt-1 text-sm leading-relaxed ${s.kind === 'answer' ? 'text-fg' : 'text-muted'}`}>{s.body}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </LabFrame>
  )
}
