import type { Transaction } from '../lib/anomaly'

// ---------------------------------------------------------------------------
// System architecture explorer — a generic reference architecture. Queue, worker
// and cache patterns mirror my work on Q and the lead & payout platform (which
// used MySQL); PostgreSQL and the AI service here are illustrative choices.
// ---------------------------------------------------------------------------

export type ArchNodeId = 'client' | 'api' | 'auth' | 'cache' | 'queue' | 'worker' | 'db' | 'ai'

export interface ArchNode {
  id: ArchNodeId
  label: string
  kind: string
  technologies: string[]
  responsibility: string
  inputs: string
  outputs: string
  tradeoff: string
}

export interface ArchEdge {
  id: string
  from: ArchNodeId
  to: ArchNodeId
  label: string
}

export interface ArchFlow {
  id: string
  label: string
  steps: { edge: string; description: string }[]
}

export const archNodes: ArchNode[] = [
  {
    id: 'client',
    label: 'Frontend',
    kind: 'Web & mobile',
    technologies: ['React', 'Next.js', 'Flutter'],
    responsibility: 'Web and mobile apps sharing one API, so business rules behave the same everywhere.',
    inputs: 'JSON responses and push notifications',
    outputs: 'HTTPS requests with a bearer token',
    tradeoff: 'One API for every client keeps behaviour consistent, but responses must serve several screen shapes.',
  },
  {
    id: 'api',
    label: 'API',
    kind: 'Service',
    technologies: ['NestJS', 'TypeScript'],
    responsibility: 'Validation, business rules and orchestration; hands slow work to the queue.',
    inputs: 'Client requests',
    outputs: 'Auth checks, cache reads, SQL, queue jobs, AI requests',
    tradeoff: 'A modular monolith: one deployable with module boundaries, split only when load or team structure requires it.',
  },
  {
    id: 'auth',
    label: 'Authentication',
    kind: 'Security',
    technologies: ['JWT', 'RBAC', 'OTP'],
    responsibility: 'Verifies tokens and resolves roles and permissions before any business logic runs.',
    inputs: 'Bearer tokens, OTP challenges',
    outputs: 'Authenticated principal with roles',
    tradeoff: 'Stateless JWTs scale easily but can’t be revoked instantly — short lifetimes plus refresh tokens close that gap.',
  },
  {
    id: 'cache',
    label: 'Redis',
    kind: 'Cache',
    technologies: ['Redis'],
    responsibility: 'Serves hot reads such as master data and dashboards without touching the database.',
    inputs: 'Cache-aside get/set from the API',
    outputs: 'Cached values or a miss',
    tradeoff: 'Faster reads in exchange for staleness — every cached value needs a TTL or an invalidation rule.',
  },
  {
    id: 'queue',
    label: 'Job queue',
    kind: 'Messaging',
    technologies: ['BullMQ', 'Redis'],
    responsibility: 'Buffers imports and report jobs, with retries and exponential backoff.',
    inputs: 'Jobs enqueued by the API',
    outputs: 'Jobs delivered to workers',
    tradeoff: 'At-least-once delivery is robust but means handlers must be idempotent.',
  },
  {
    id: 'worker',
    label: 'Workers',
    kind: 'Background',
    technologies: ['Node.js', 'Puppeteer'],
    responsibility: 'Parses uploads, upserts records and renders PDFs outside the request path.',
    inputs: 'Queue jobs',
    outputs: 'Database writes, generated files',
    tradeoff: 'A separate process isolates slow work but adds deployment and monitoring surface.',
  },
  {
    id: 'db',
    label: 'PostgreSQL',
    kind: 'Datastore',
    technologies: ['PostgreSQL', 'SQL'],
    responsibility: 'System of record, with schema changes versioned as migrations.',
    inputs: 'Writes from the API and workers',
    outputs: 'Query results and retrieval context',
    tradeoff: 'Relational integrity and joins first; indexes chosen from real query patterns rather than up front.',
  },
  {
    id: 'ai',
    label: 'AI service',
    kind: 'Illustrative',
    technologies: ['LLM API', 'RAG'],
    responsibility: 'Answers questions from retrieved records and cites them; refuses when evidence is missing.',
    inputs: 'Question plus scoped context from the API',
    outputs: 'Cited answer or refusal',
    tradeoff: 'Called on demand only, which bounds cost and latency and keeps people in the loop.',
  },
]

export const archEdges: ArchEdge[] = [
  { id: 'client-api', from: 'client', to: 'api', label: 'HTTPS' },
  { id: 'api-auth', from: 'api', to: 'auth', label: 'verify' },
  { id: 'api-cache', from: 'api', to: 'cache', label: 'get / set' },
  { id: 'api-db', from: 'api', to: 'db', label: 'SQL' },
  { id: 'api-queue', from: 'api', to: 'queue', label: 'enqueue' },
  { id: 'queue-worker', from: 'queue', to: 'worker', label: 'job' },
  { id: 'worker-db', from: 'worker', to: 'db', label: 'upsert' },
  { id: 'api-ai', from: 'api', to: 'ai', label: 'ask' },
  { id: 'ai-db', from: 'ai', to: 'db', label: 'retrieve' },
]

export const archFlows: ArchFlow[] = [
  {
    id: 'request-lifecycle',
    label: 'Request lifecycle',
    steps: [
      { edge: 'client-api', description: 'Request arrives; rate limiting and DTO validation run before anything else.' },
      { edge: 'api-auth', description: 'The JWT is verified and the user’s roles and permissions resolved.' },
      { edge: 'api-cache', description: 'Cache-aside: look the key up in Redis. This time it’s a miss.' },
      { edge: 'api-db', description: 'Query PostgreSQL, scoped to what this user may see.' },
      { edge: 'api-cache', description: 'Write the result back with a TTL, then return the response.' },
    ],
  },
  {
    id: 'bulk-import',
    label: 'Bulk import',
    steps: [
      { edge: 'client-api', description: 'An operator uploads a report; the API validates it and returns at once.' },
      { edge: 'api-queue', description: 'An import job is enqueued with an idempotency key.' },
      { edge: 'queue-worker', description: 'A worker picks it up; failures retry with exponential backoff.' },
      { edge: 'worker-db', description: 'Rows are upserted — created or updated — so re-running a file is safe.' },
    ],
  },
  {
    id: 'grounded-answer',
    label: 'Grounded AI answer',
    steps: [
      { edge: 'client-api', description: 'A user asks a question about their data.' },
      { edge: 'api-auth', description: 'Their scope is resolved, so the AI can only see what they can see.' },
      { edge: 'api-ai', description: 'The API passes the question and that scope to the AI service.' },
      { edge: 'ai-db', description: 'Relevant records are retrieved within scope.' },
      { edge: 'api-ai', description: 'The answer returns with citations, or a refusal if evidence is insufficient.' },
    ],
  },
]

type Point = { x: number; y: number }

export const archLayouts: Record<'wide' | 'narrow', { width: number; height: number; nodes: Record<ArchNodeId, Point> }> = {
  wide: {
    width: 1000,
    height: 440,
    nodes: {
      client: { x: 80, y: 220 },
      api: { x: 320, y: 220 },
      auth: { x: 320, y: 60 },
      cache: { x: 590, y: 60 },
      queue: { x: 590, y: 220 },
      ai: { x: 590, y: 380 },
      worker: { x: 890, y: 220 },
      db: { x: 890, y: 380 },
    },
  },
  narrow: {
    width: 360,
    height: 660,
    nodes: {
      client: { x: 180, y: 45 },
      api: { x: 80, y: 170 },
      auth: { x: 280, y: 170 },
      cache: { x: 280, y: 300 },
      queue: { x: 80, y: 320 },
      ai: { x: 280, y: 430 },
      worker: { x: 80, y: 470 },
      db: { x: 280, y: 600 },
    },
  },
}

// ---------------------------------------------------------------------------
// AI Decision Explorer — synthetic sample transactions.
// ---------------------------------------------------------------------------

export const sampleTransactions: Transaction[] = [
  { id: 'TX-1042', merchant: 'Fresh Market', category: 'Groceries', amount: 64.2, time: '14:05', baselineMean: 58, baselineStd: 20, newDevice: false, locationMismatch: false, txnsLastHour: 1, label: 'normal' },
  { id: 'TX-1043', merchant: 'Voltix Store', category: 'Electronics', amount: 1899, time: '02:47', baselineMean: 120, baselineStd: 85, newDevice: true, locationMismatch: true, txnsLastHour: 4, label: 'anomalous' },
  { id: 'TX-1044', merchant: 'Skyline Air', category: 'Travel', amount: 940, time: '10:20', baselineMean: 210, baselineStd: 160, newDevice: false, locationMismatch: false, txnsLastHour: 1, label: 'normal' },
  { id: 'TX-1045', merchant: 'CardHub', category: 'Gift cards', amount: 500, time: '23:41', baselineMean: 45, baselineStd: 30, newDevice: true, locationMismatch: false, txnsLastHour: 6, label: 'anomalous' },
  { id: 'TX-1046', merchant: 'Bean & Co', category: 'Coffee', amount: 4.5, time: '08:12', baselineMean: 6, baselineStd: 2, newDevice: false, locationMismatch: false, txnsLastHour: 1, label: 'normal' },
  { id: 'TX-1047', merchant: 'Parcel Point', category: 'Online retail', amount: 230, time: '01:15', baselineMean: 95, baselineStd: 60, newDevice: false, locationMismatch: false, txnsLastHour: 1, label: 'normal' },
  { id: 'TX-1048', merchant: 'Northway Fuel', category: 'Fuel', amount: 72, time: '18:40', baselineMean: 65, baselineStd: 25, newDevice: false, locationMismatch: true, txnsLastHour: 1, label: 'normal' },
  { id: 'TX-1049', merchant: 'CoinGate', category: 'Crypto exchange', amount: 2400, time: '04:05', baselineMean: 300, baselineStd: 200, newDevice: false, locationMismatch: true, txnsLastHour: 2, label: 'anomalous' },
  { id: 'TX-1050', merchant: 'StreamBox', category: 'Subscription', amount: 15.99, time: '09:00', baselineMean: 16, baselineStd: 1, newDevice: true, locationMismatch: false, txnsLastHour: 1, label: 'normal' },
  { id: 'TX-1051', merchant: 'Voltix Store', category: 'Electronics', amount: 640, time: '12:30', baselineMean: 150, baselineStd: 90, newDevice: true, locationMismatch: false, txnsLastHour: 3, label: 'normal' },
  { id: 'TX-1052', merchant: 'Swift Transfer', category: 'Wire transfer', amount: 310, time: '03:55', baselineMean: 280, baselineStd: 150, newDevice: true, locationMismatch: true, txnsLastHour: 1, label: 'anomalous' },
  { id: 'TX-1053', merchant: 'Harbour Grill', category: 'Restaurant', amount: 88, time: '21:10', baselineMean: 40, baselineStd: 18, newDevice: false, locationMismatch: true, txnsLastHour: 1, label: 'normal' },
  { id: 'TX-1054', merchant: 'CardHub', category: 'Gift cards', amount: 150, time: '02:20', baselineMean: 45, baselineStd: 30, newDevice: false, locationMismatch: false, txnsLastHour: 8, label: 'anomalous' },
  { id: 'TX-1055', merchant: 'CityCare', category: 'Pharmacy', amount: 26, time: '17:25', baselineMean: 30, baselineStd: 12, newDevice: false, locationMismatch: false, txnsLastHour: 1, label: 'normal' },
  { id: 'TX-1056', merchant: 'Parcel Point', category: 'Online retail', amount: 120, time: '13:00', baselineMean: 95, baselineStd: 60, newDevice: true, locationMismatch: true, txnsLastHour: 2, label: 'anomalous' },
]

export const evaluationSteps = [
  { title: 'Define the decision', detail: 'What action does a flag trigger, and what does a miss or a false alarm cost?' },
  { title: 'Hold out labelled data', detail: 'Evaluate on records the model never saw, split by time to mimic production.' },
  { title: 'Measure at the operating point', detail: 'Precision and recall at the threshold you will actually deploy, not just AUC.' },
  { title: 'Monitor after release', detail: 'Track score distributions and alert outcomes to catch drift early.' },
]
