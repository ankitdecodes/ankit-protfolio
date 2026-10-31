import { useRef, useState } from 'react'
import { Database, Play } from 'lucide-react'
import {
  QUERIES,
  buildIndex,
  execute,
  generateOrders,
  type BuiltIndex,
  type ExecResult,
  type IndexId,
  type OrdersTable,
  type QueryId,
} from '../../lib/queryplan'
import { Tag } from '../ui/primitives'

const ROWS = 200_000

export function QueryExplorer() {
  const tableRef = useRef<OrdersTable | null>(null)
  const indexes = useRef<Partial<Record<IndexId, BuiltIndex>>>({})
  const [queryId, setQueryId] = useState<QueryId>('by-customer')
  const [useIndex, setUseIndex] = useState(false)
  const [busy, setBusy] = useState(false)
  const [buildMs, setBuildMs] = useState<number | null>(null)
  const [results, setResults] = useState<Partial<Record<string, ExecResult>>>({})

  const query = QUERIES.find((q) => q.id === queryId)!
  const key = (q: QueryId, indexed: boolean) => `${q}:${indexed ? 'index' : 'scan'}`
  const current = results[key(queryId, useIndex)]
  const scan = results[key(queryId, false)]
  const indexed = results[key(queryId, true)]

  const run = () => {
    setBusy(true)
    // Yield a frame so the busy state paints before the synchronous work.
    requestAnimationFrame(() => {
      tableRef.current ??= generateOrders(ROWS)
      let idx: BuiltIndex | null = null
      if (useIndex) {
        idx = indexes.current[query.index] ??= buildIndex(tableRef.current, query.index)
        setBuildMs(idx.buildMs)
      }
      const result = execute(tableRef.current, queryId, idx)
      setResults((r) => ({ ...r, [key(queryId, useIndex)]: result }))
      setBusy(false)
    })
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
        <Database className="size-4 text-accent" aria-hidden />
        <span className="font-mono text-xs text-muted">query.explorer</span>
        <Tag>{ROWS.toLocaleString()} generated rows · runs in your browser</Tag>
      </div>

      <div className="grid lg:grid-cols-12">
        <div className="space-y-5 border-b border-line p-4 sm:p-6 lg:col-span-5 lg:border-r lg:border-b-0">
          <fieldset>
            <legend className="text-sm font-medium text-fg">Query</legend>
            <div className="mt-2 grid gap-2">
              {QUERIES.map((q) => (
                <label
                  key={q.id}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent ${
                    q.id === queryId ? 'border-accent/50 bg-accent-dim' : 'border-line hover:border-line-strong'
                  }`}
                >
                  <input
                    type="radio"
                    name="query"
                    className="sr-only"
                    checked={q.id === queryId}
                    onChange={() => setQueryId(q.id)}
                  />
                  <code className="block font-mono text-xs leading-relaxed break-words text-fg">{q.sql}</code>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 has-focus-visible:outline-2 has-focus-visible:outline-accent">
            <input
              type="checkbox"
              checked={useIndex}
              onChange={(e) => setUseIndex(e.target.checked)}
              className="mt-0.5 size-4 accent-[var(--color-accent)]"
            />
            <span>
              <span className="block text-sm text-fg">Use an index</span>
              <code className="mt-1 block font-mono text-xs break-words text-subtle">{query.indexDdl}</code>
            </span>
          </label>

          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-fg px-4 text-sm font-medium text-bg transition-colors hover:bg-accent disabled:opacity-60"
          >
            <Play className="size-4" aria-hidden /> {busy ? 'Running…' : 'Run query'}
          </button>
        </div>

        <div className="p-4 sm:p-6 lg:col-span-7" aria-live="polite">
          {current ? (
            <>
              <p className="eyebrow">EXPLAIN</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[30rem] text-left font-mono text-xs">
                  <thead className="text-subtle">
                    <tr>
                      {['type', 'possible_keys', 'key', 'rows', 'Extra'].map((h) => (
                        <th key={h} className="border-b border-line py-2 pr-4 font-normal">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-fg">
                    <tr>
                      <td className={`py-2 pr-4 ${current.plan.type === 'ALL' ? 'text-ai' : 'text-accent'}`}>{current.plan.type}</td>
                      <td className="py-2 pr-4">{current.plan.possibleKeys}</td>
                      <td className="py-2 pr-4">{current.plan.key}</td>
                      <td className="py-2 pr-4">{current.plan.rows.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-muted">{current.plan.extra}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3">
                <Stat label="Rows examined" value={current.rowsExamined.toLocaleString()} />
                <Stat label="Rows returned" value={current.rowsReturned.toLocaleString()} />
                <Stat label="Measured time" value={`${current.ms.toFixed(2)} ms`} />
              </dl>
            </>
          ) : (
            <p className="text-sm text-muted">
              Run the query to execute it against a generated <code className="font-mono text-fg">orders</code> table. Then
              enable the index and run it again to compare.
            </p>
          )}

          <div className="mt-6 border-t border-line pt-5">
            <p className="eyebrow">Rows examined, scan vs index</p>
            <div className="mt-3 space-y-3">
              <Bar label="Full scan" value={scan?.rowsExamined} max={ROWS} tone="ai" ms={scan?.ms} />
              <Bar label="Index" value={indexed?.rowsExamined} max={ROWS} tone="accent" ms={indexed?.ms} />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-subtle">
              Both plans return identical rows. The index isn’t free: building it took{' '}
              {buildMs === null ? '— (run with the index)' : `${buildMs.toFixed(0)} ms`} here, and every insert must keep it
              sorted. Timings are real but vary by device.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-bg/40 p-3">
      <dt className="font-mono text-xs text-subtle">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tracking-tight text-fg tabular-nums sm:text-xl">{value}</dd>
    </div>
  )
}

function Bar({ label, value, max, tone, ms }: { label: string; value?: number; max: number; tone: 'ai' | 'accent'; ms?: number }) {
  const pct = value === undefined ? 0 : Math.max(0.4, (value / max) * 100)
  return (
    <div>
      <div className="flex justify-between font-mono text-xs">
        <span className="text-muted">{label}</span>
        <span className="text-fg tabular-nums">
          {value === undefined ? 'not run' : `${value.toLocaleString()} rows · ${ms!.toFixed(2)} ms`}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-line" aria-hidden>
        <div className={`h-full rounded-full transition-[width] duration-500 ${tone === 'ai' ? 'bg-ai' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
