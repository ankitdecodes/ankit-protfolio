// In-browser retrieval over this portfolio's own project content.
// Vectors are TF-IDF (not neural embeddings); answers are extractive (no LLM).
// Everything here is real computation and deterministic.

export interface Chunk {
  id: string
  source: string
  sourceId: string
  kind: string
  text: string
}

export type SparseVector = Map<string, number>

const STOPWORDS = new Set(
  `a an and are as at be by for from has have how i in is it its of on or so that the their them then these this to was
  were what when where which who why will with without into over per via than not no our out up can do does did my me you
  your we they he she across both each every only more most other same such own just also using used use uses`.split(/\s+/),
)

/** Lower-case, strip punctuation, drop stopwords and apply a light suffix stemmer. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem)
}

function stem(t: string): string {
  if (t.length > 5 && t.endsWith('ing')) return t.slice(0, -3)
  if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y'
  if (t.length > 4 && t.endsWith('ed')) return t.slice(0, -2)
  if (t.endsWith('sses')) return t.slice(0, -2)
  if (t.length > 4 && /(ches|shes|xes)$/.test(t)) return t.slice(0, -2)
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') && !t.endsWith('us')) return t.slice(0, -1)
  return t
}

export function dot(a: SparseVector, b: SparseVector): number {
  const [small, large] = a.size < b.size ? [a, b] : [b, a]
  let sum = 0
  for (const [k, v] of small) sum += v * (large.get(k) ?? 0)
  return sum
}

function normalise(v: SparseVector): SparseVector {
  const norm = Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0))
  if (norm === 0) return v
  return new Map([...v].map(([k, x]) => [k, x / norm]))
}

export interface Index {
  chunks: Chunk[]
  vectors: SparseVector[]
  idf: Map<string, number>
}

export function buildIndex(chunks: Chunk[]): Index {
  const docs = chunks.map((c) => tokenize(c.text))
  const df = new Map<string, number>()
  for (const tokens of docs) for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1)
  const n = chunks.length
  const idf = new Map([...df].map(([t, f]) => [t, Math.log((1 + n) / (1 + f)) + 1]))
  const vectors = docs.map((tokens) => vectorise(tokens, idf))
  return { chunks, vectors, idf }
}

function vectorise(tokens: string[], idf: Map<string, number>): SparseVector {
  const tf = new Map<string, number>()
  for (const t of tokens) if (idf.has(t)) tf.set(t, (tf.get(t) ?? 0) + 1)
  return normalise(new Map([...tf].map(([t, f]) => [t, (1 + Math.log(f)) * idf.get(t)!])))
}

export function embedQuery(index: Index, query: string): SparseVector {
  return vectorise(tokenize(query), index.idf)
}

export interface Hit {
  chunk: Chunk
  index: number
  score: number
  /** Query terms that contributed to the match */
  matched: string[]
}

export function retrieve(index: Index, query: string, k = 3): Hit[] {
  const q = embedQuery(index, query)
  return index.vectors
    .map((v, i) => ({
      chunk: index.chunks[i]!,
      index: i,
      score: dot(q, v),
      matched: [...q.keys()].filter((t) => v.has(t)),
    }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

/** Extractive "generation": the best-matching sentence of each hit, with a citation. */
export function composeAnswer(index: Index, query: string, hits: Hit[]): { text: string; citation: number }[] {
  const q = embedQuery(index, query)
  return hits.map((hit, i) => {
    const sentences = hit.chunk.text.split(/(?<=[.!?])\s+/).filter(Boolean)
    const best = sentences
      .map((s) => ({ s, score: dot(q, vectorise(tokenize(s), index.idf)) }))
      .sort((a, b) => b.score - a.score)[0]
    return { text: best?.s ?? hit.chunk.text, citation: i + 1 }
  })
}

// ---------------------------------------------------------------------------
// 2-D projection (PCA via the centred Gram matrix and power iteration)
// ---------------------------------------------------------------------------

export interface Projection {
  points: { x: number; y: number }[]
  project: (v: SparseVector) => { x: number; y: number }
  explained: [number, number]
}

export function projectPCA(vectors: SparseVector[]): Projection {
  const n = vectors.length
  const mean: SparseVector = new Map()
  for (const v of vectors) for (const [k, x] of v) mean.set(k, (mean.get(k) ?? 0) + x / n)
  const mm = dot(mean, mean)
  const vm = vectors.map((v) => dot(v, mean))
  const gram = vectors.map((a, i) => vectors.map((b, j) => dot(a, b) - vm[i]! - vm[j]! + mm))
  const trace = gram.reduce((s, row, i) => s + row[i]!, 0)

  const components: { vec: number[]; value: number }[] = []
  const deflated = gram.map((row) => [...row])
  for (let c = 0; c < 2; c++) {
    let vec = Array.from({ length: n }, (_, i) => Math.sin(i + 1 + c * 7))
    let value = 0
    for (let iter = 0; iter < 600; iter++) {
      const next = deflated.map((row) => row.reduce((s, x, j) => s + x * vec[j]!, 0))
      const norm = Math.hypot(...next) || 1
      value = norm
      vec = next.map((x) => x / norm)
    }
    components.push({ vec, value })
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) deflated[i]![j]! -= value * vec[i]! * vec[j]!
  }

  const points = vectors.map((_, i) => ({
    x: Math.sqrt(components[0]!.value) * components[0]!.vec[i]!,
    y: Math.sqrt(components[1]!.value) * components[1]!.vec[i]!,
  }))

  // Project a new vector onto the same axes: q·u where u = Xcᵀ v / √λ
  const project = (q: SparseVector) => {
    const qm = dot(q, mean)
    const coords = components.map(({ vec, value }) => {
      if (value === 0) return 0
      let s = 0
      for (let i = 0; i < n; i++) s += vec[i]! * (dot(q, vectors[i]!) - qm - vm[i]! + mm)
      return s / Math.sqrt(value)
    })
    return { x: coords[0]!, y: coords[1]! }
  }

  return {
    points,
    project,
    explained: [components[0]!.value / (trace || 1), components[1]!.value / (trace || 1)],
  }
}

// ---------------------------------------------------------------------------
// Groundedness check (lexical proxy for hallucination detection)
// ---------------------------------------------------------------------------

export interface SentenceSupport {
  sentence: string
  support: number
  supported: boolean
  bestSource: string | null
  unsupportedTerms: string[]
}

/**
 * For each answer sentence, the share of its content terms found in the best
 * single context chunk. Real evaluators use NLI models or LLM judges; this is a
 * transparent stand-in that shows the method.
 */
export function checkGroundedness(answer: string, context: Chunk[], threshold = 0.6): SentenceSupport[] {
  const contextTerms = context.map((c) => ({ chunk: c, terms: new Set(tokenize(c.text)) }))
  return answer
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim())
    .map((sentence) => {
      const terms = [...new Set(tokenize(sentence))]
      let best = { support: 0, source: null as string | null, missing: terms }
      for (const { chunk, terms: ct } of contextTerms) {
        const missing = terms.filter((t) => !ct.has(t))
        const support = terms.length ? (terms.length - missing.length) / terms.length : 0
        if (support > best.support) best = { support, source: chunk.source, missing }
      }
      return {
        sentence,
        support: best.support,
        supported: best.support >= threshold,
        bestSource: best.source,
        unsupportedTerms: best.missing,
      }
    })
}
