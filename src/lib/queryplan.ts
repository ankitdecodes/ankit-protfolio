// A real (if tiny) query engine over a generated in-memory table. A full scan
// touches every row; an index is a sorted array of row ids searched with binary
// search — the same idea as a B-tree range lookup, without the pages.

export const STATUSES = ['paid', 'pending', 'failed', 'refunded'] as const
export type Status = (typeof STATUSES)[number]

export interface OrdersTable {
  rows: number
  customerId: Int32Array
  status: Uint8Array
  createdDay: Int16Array
  amount: Float32Array
}

export const CUSTOMERS = 20_000
export const DAYS = 365

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function generateOrders(rows = 200_000, seed = 7): OrdersTable {
  const r = rng(seed)
  const t: OrdersTable = {
    rows,
    customerId: new Int32Array(rows),
    status: new Uint8Array(rows),
    createdDay: new Int16Array(rows),
    amount: new Float32Array(rows),
  }
  for (let i = 0; i < rows; i++) {
    t.customerId[i] = Math.floor(r() * CUSTOMERS)
    const p = r()
    t.status[i] = p < 0.82 ? 0 : p < 0.94 ? 1 : p < 0.97 ? 2 : 3
    t.createdDay[i] = Math.floor(r() * DAYS)
    t.amount[i] = Math.round(r() * 50_000) / 10
  }
  return t
}

export type QueryId = 'by-customer' | 'recent-failed'
export type IndexId = 'idx_customer' | 'idx_status_created'

export interface QueryDef {
  id: QueryId
  sql: string
  index: IndexId
  indexDdl: string
}

export const QUERIES: QueryDef[] = [
  {
    id: 'by-customer',
    sql: 'SELECT * FROM orders WHERE customer_id = 4217;',
    index: 'idx_customer',
    indexDdl: 'CREATE INDEX idx_customer ON orders (customer_id);',
  },
  {
    id: 'recent-failed',
    sql: "SELECT * FROM orders WHERE status = 'failed' AND created_day >= 335;",
    index: 'idx_status_created',
    indexDdl: 'CREATE INDEX idx_status_created ON orders (status, created_day);',
  },
]

/** Composite key so a single sorted array can serve (status, created_day) ranges. */
const compositeKey = (status: number, day: number) => status * 1000 + day

export interface BuiltIndex {
  id: IndexId
  keys: Int32Array
  rowIds: Int32Array
  buildMs: number
}

export function buildIndex(t: OrdersTable, id: IndexId): BuiltIndex {
  const start = performance.now()
  const keyOf = id === 'idx_customer' ? (i: number) => t.customerId[i]! : (i: number) => compositeKey(t.status[i]!, t.createdDay[i]!)
  const ids = Array.from({ length: t.rows }, (_, i) => i).sort((a, b) => keyOf(a) - keyOf(b))
  const rowIds = Int32Array.from(ids)
  const keys = Int32Array.from(ids, keyOf)
  return { id, keys, rowIds, buildMs: performance.now() - start }
}

function lowerBound(keys: Int32Array, value: number): number {
  let lo = 0
  let hi = keys.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (keys[mid]! < value) lo = mid + 1
    else hi = mid
  }
  return lo
}

export interface PlanRow {
  type: 'ALL' | 'ref' | 'range'
  possibleKeys: string
  key: string
  rows: number
  extra: string
}

export interface ExecResult {
  rowsExamined: number
  rowsReturned: number
  ms: number
  plan: PlanRow
  sampleRowIds: number[]
}

const FAILED = STATUSES.indexOf('failed')

export function execute(t: OrdersTable, query: QueryId, index: BuiltIndex | null): ExecResult {
  const start = performance.now()
  const matches: number[] = []
  let examined = 0

  if (!index) {
    for (let i = 0; i < t.rows; i++) {
      examined++
      const hit = query === 'by-customer' ? t.customerId[i] === 4217 : t.status[i] === FAILED && t.createdDay[i]! >= 335
      if (hit) matches.push(i)
    }
  } else {
    const [from, to] =
      query === 'by-customer' ? [4217, 4218] : [compositeKey(FAILED, 335), compositeKey(FAILED, DAYS)]
    const lo = lowerBound(index.keys, from)
    const hi = lowerBound(index.keys, to)
    for (let p = lo; p < hi; p++) {
      examined++
      matches.push(index.rowIds[p]!)
    }
  }

  const ms = performance.now() - start
  const def = QUERIES.find((q) => q.id === query)!
  const plan: PlanRow = index
    ? {
        type: query === 'by-customer' ? 'ref' : 'range',
        possibleKeys: def.index,
        key: def.index,
        rows: examined,
        extra: query === 'by-customer' ? 'Using index lookup' : 'Using index range scan',
      }
    : { type: 'ALL', possibleKeys: 'NULL', key: 'NULL', rows: t.rows, extra: 'Using where (full table scan)' }

  return { rowsExamined: examined, rowsReturned: matches.length, ms, plan, sampleRowIds: matches.slice(0, 5) }
}
