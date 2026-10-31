import { useMemo, useState, type CSSProperties } from 'react'
import { sampleTransactions } from '../../content/lab'
import { SIGNALS, signalStrengths } from '../../lib/anomaly'
import { forward, train } from '../../lib/nn'
import { LabFrame } from './LabFrame'

type Stage = 'input' | 'hidden' | 'output'

const W = 560
const H = 300
const col = { input: 70, hidden: 280, output: 490 }

export function InferenceExplorer() {
  const data = useMemo(() => {
    const xs = sampleTransactions.map((tx) => SIGNALS.map((s) => signalStrengths(tx)[s.id]))
    const ys = sampleTransactions.map((tx) => (tx.label === 'anomalous' ? 1 : 0))
    return { xs, ys, ...train(xs, ys) }
  }, [])

  const [txIndex, setTxIndex] = useState(1)
  const [inputs, setInputs] = useState<number[]>(() => data.xs[1]!)
  const [stage, setStage] = useState<Stage>('hidden')
  const trace = forward(data.net, inputs)

  const choose = (i: number) => {
    setTxIndex(i)
    setInputs(data.xs[i]!)
  }

  const inY = (i: number) => 40 + i * 55
  const hidY = (j: number) => 67 + j * 55
  const maxW1 = Math.max(...data.net.w1.flat().map(Math.abs))
  const maxW2 = Math.max(...data.net.w2.map(Math.abs))
  const maxHidden = Math.max(1e-6, ...trace.hidden)

  return (
    <LabFrame
      name="inference.explorer"
      badge="Trained in your browser on 15 synthetic samples"
      note="A 5 → 4 → 1 network trained with gradient descent when this tab opened. It makes inference visible; with this little data it is not a useful model."
    >
      <div className="grid lg:grid-cols-12">
        <div className="space-y-5 border-b border-line p-4 sm:p-6 lg:col-span-4 lg:border-r lg:border-b-0">
          <label className="block text-sm font-medium text-fg">
            Start from a sample transaction
            <select
              value={txIndex}
              onChange={(e) => choose(Number(e.target.value))}
              className="mt-2 h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm text-fg focus:border-accent/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent"
            >
              {sampleTransactions.map((tx, i) => (
                <option key={tx.id} value={i}>
                  {tx.id} · {tx.merchant} ({tx.label})
                </option>
              ))}
            </select>
          </label>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-fg">Input features — drag to ask “what if?”</legend>
            {SIGNALS.map((s, i) => (
              <div key={s.id}>
                <div className="flex justify-between text-xs">
                  <label htmlFor={`in-${s.id}`} className="text-muted">
                    {s.label}
                  </label>
                  <span className="font-mono text-fg">{inputs[i]!.toFixed(2)}</span>
                </div>
                <input
                  id={`in-${s.id}`}
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={inputs[i]}
                  onChange={(e) => setInputs((prev) => prev.map((v, k) => (k === i ? Number(e.target.value) : v)))}
                  className="range h-8 w-full"
                  style={{ '--fill': `${inputs[i]! * 100}%` } as CSSProperties}
                />
              </div>
            ))}
          </fieldset>
        </div>

        <div className="p-4 sm:p-6 lg:col-span-8">
          <div role="group" aria-label="Inference stage" className="flex flex-wrap gap-1.5">
            {(['input', 'hidden', 'output'] as const).map((s, i) => (
              <button
                key={s}
                type="button"
                aria-pressed={stage === s}
                onClick={() => setStage(s)}
                className="h-9 rounded-md border border-line px-3 text-sm text-muted transition-colors hover:text-fg aria-pressed:border-ai/50 aria-pressed:bg-ai-dim aria-pressed:text-fg"
              >
                {i + 1}. {s === 'input' ? 'Inputs' : s === 'hidden' ? 'Hidden layer' : 'Output'}
              </button>
            ))}
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label={`Network activations. Output probability ${trace.output.toFixed(2)}.`}>
            {data.net.w1.map((row, j) =>
              row.map((w, i) => (
                <line
                  key={`a${i}${j}`}
                  x1={col.input}
                  y1={inY(i)}
                  x2={col.hidden}
                  y2={hidY(j)}
                  stroke={w >= 0 ? 'var(--color-accent)' : 'var(--color-ai)'}
                  strokeWidth={0.5 + (Math.abs(w) / maxW1) * 3}
                  opacity={0.12 + Math.min(1, Math.abs(w * inputs[i]!) / maxW1) * (stage === 'output' ? 0.25 : 0.8)}
                />
              )),
            )}
            {data.net.w2.map((w, j) => (
              <line
                key={`b${j}`}
                x1={col.hidden}
                y1={hidY(j)}
                x2={col.output}
                y2={H / 2}
                stroke={w >= 0 ? 'var(--color-accent)' : 'var(--color-ai)'}
                strokeWidth={0.5 + (Math.abs(w) / maxW2) * 3}
                opacity={0.12 + Math.min(1, Math.abs(w * trace.hidden[j]!) / maxW2) * (stage === 'input' ? 0.25 : 0.8)}
              />
            ))}
            {SIGNALS.map((s, i) => (
              <g key={s.id}>
                <circle cx={col.input} cy={inY(i)} r={12} fill="var(--color-bg)" stroke="var(--color-line-strong)" />
                <circle cx={col.input} cy={inY(i)} r={2 + inputs[i]! * 9} fill="var(--color-fg)" opacity={stage === 'input' ? 1 : 0.6} />
                <text x={col.input - 20} y={inY(i) + 4} textAnchor="end" className="fill-muted" fontSize={11}>
                  {s.label.split(' ')[0]}
                </text>
              </g>
            ))}
            {trace.hidden.map((h, j) => (
              <g key={j}>
                <circle cx={col.hidden} cy={hidY(j)} r={14} fill="var(--color-bg)" stroke="var(--color-line-strong)" />
                <circle cx={col.hidden} cy={hidY(j)} r={2 + (h / maxHidden) * 11} fill="var(--color-ai)" opacity={stage === 'hidden' ? 1 : 0.55} />
                <text x={col.hidden} y={hidY(j) - 20} textAnchor="middle" className="fill-subtle font-mono" fontSize={10}>
                  {h.toFixed(2)}
                </text>
              </g>
            ))}
            <circle cx={col.output} cy={H / 2} r={30} fill="var(--color-bg)" stroke={trace.output >= 0.5 ? 'var(--color-ai)' : 'var(--color-line-strong)'} strokeWidth={1.5} />
            <text x={col.output} y={H / 2 + 6} textAnchor="middle" className="fill-fg font-mono" fontSize={17} fontWeight={600}>
              {trace.output.toFixed(2)}
            </text>
            <text x={col.output} y={H / 2 + 50} textAnchor="middle" className="fill-subtle" fontSize={11}>
              P(anomalous)
            </text>
          </svg>

          <div className="mt-4 rounded-lg border border-line bg-bg/40 p-4 text-sm leading-relaxed" aria-live="polite">
            {stage === 'input' && (
              <p className="text-muted">
                Each input is a signal strength in [0, 1] — the same features the anomaly explorer scores. Input vector:{' '}
                <code className="font-mono text-fg">[{inputs.map((v) => v.toFixed(2)).join(', ')}]</code>
              </p>
            )}
            {stage === 'hidden' && (
              <p className="text-muted">
                Each hidden unit computes <code className="font-mono text-fg">ReLU(w·x + b)</code>. Activations:{' '}
                <code className="font-mono text-fg">[{trace.hidden.map((v) => v.toFixed(2)).join(', ')}]</code>. Lime
                connections are positive weights, violet negative; brightness shows each connection’s contribution right now.
              </p>
            )}
            {stage === 'output' && (
              <p className="text-muted">
                The output unit computes <code className="font-mono text-fg">σ(w·h + b)</code> ={' '}
                <code className="font-mono text-fg">σ({trace.outputPre.toFixed(2)})</code> ={' '}
                <span className="text-fg">{trace.output.toFixed(3)}</span> — {trace.output >= 0.5 ? 'classified anomalous' : 'classified normal'} at
                a 0.5 cut-off.
              </p>
            )}
          </div>

          <LossCurve history={data.history} />
        </div>
      </div>
    </LabFrame>
  )
}

function LossCurve({ history }: { history: number[] }) {
  const max = Math.max(...history)
  const points = history.map((v, i) => `${(i / (history.length - 1)) * 200},${40 - (v / max) * 36}`).join(' ')
  return (
    <div className="mt-4 flex items-center gap-4">
      <svg viewBox="0 0 200 42" className="h-10 w-40 shrink-0" aria-hidden>
        <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
      <p className="font-mono text-xs text-subtle">
        training loss {history[0]!.toFixed(3)} → {history.at(-1)!.toFixed(3)} · 600 epochs · binary cross-entropy
      </p>
    </div>
  )
}
