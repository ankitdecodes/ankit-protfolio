// Skills are tiered by evidence, not self-rated with percentages.
//   production   — used in professional team codebases (backed by commit history)
//   hands-on     — used in own projects and practice (self-reported)
//   foundational — learning; fundamentals only
// Adjust a level here whenever it changes; the UI derives everything from this file.

export type SkillLevel = 'production' | 'hands-on' | 'foundational'

export interface Skill {
  name: string
  level: SkillLevel
  note?: string
}

export interface SkillGroup {
  id: string
  title: string
  track: 'primary' | 'secondary'
  lead: string
  summary: string
  skills: Skill[]
  evidence: string[]
}

export const levelLabel: Record<SkillLevel, string> = {
  production: 'Production',
  'hands-on': 'Hands-on',
  foundational: 'Foundational',
}

export const levelDescription: Record<SkillLevel, string> = {
  production: 'Used in professional team codebases',
  'hands-on': 'Used in projects and practice',
  foundational: 'Learning the fundamentals',
}

export const skillGroups: SkillGroup[] = [
  {
    id: 'backend',
    title: 'Backend',
    track: 'primary',
    lead: 'NestJS',
    summary: 'My primary specialisation: modular services, explicit contracts and background processing.',
    skills: [
      { name: 'NestJS', level: 'production' },
      { name: 'Node.js', level: 'production' },
      { name: 'REST APIs', level: 'production' },
      { name: 'Authentication (JWT, OTP)', level: 'production' },
      { name: 'Authorization (RBAC)', level: 'production' },
      { name: 'BullMQ', level: 'production' },
      { name: 'Testing with Jest', level: 'production' },
      { name: 'Microservices', level: 'hands-on' },
      { name: 'Kafka', level: 'hands-on' },
    ],
    evidence: [
      'Transactional outbox, polling worker and idempotent wallet ledger for lead payouts',
      'OTP auth, credit-report, payment and dashboard modules for the Q Finance API',
      '40 Jest spec files added across two NestJS codebases',
    ],
  },
  {
    id: 'frontend',
    title: 'Frontend',
    track: 'primary',
    lead: 'React & Next.js',
    summary: 'Typed, component-driven interfaces wired to real APIs.',
    skills: [
      { name: 'React', level: 'production' },
      { name: 'Next.js', level: 'production' },
      { name: 'TypeScript', level: 'production' },
      { name: 'JavaScript', level: 'production' },
      { name: 'Angular', level: 'production' },
      { name: 'Tailwind CSS', level: 'production' },
    ],
    evidence: ['Next.js admin upload workflow · Angular SSR website for Q Finance · this portfolio'],
  },
  {
    id: 'data',
    title: 'Data',
    track: 'primary',
    lead: 'MySQL',
    summary: 'Relational models shaped by access patterns, with caching where it pays.',
    skills: [
      { name: 'MySQL', level: 'production' },
      { name: 'TypeORM', level: 'production' },
      { name: 'Redis', level: 'production' },
      { name: 'SQL optimisation', level: 'hands-on' },
      { name: 'PostgreSQL', level: 'hands-on' },
      { name: 'MongoDB', level: 'hands-on' },
    ],
    evidence: ['Unified MIS upsert across products · seeded master data for recommendations'],
  },
  {
    id: 'ai',
    title: 'AI',
    track: 'primary',
    lead: 'RAG',
    summary: 'LLM-backed features that stay grounded, measurable and honest about their limits.',
    skills: [
      { name: 'Python', level: 'hands-on' },
      { name: 'scikit-learn', level: 'hands-on' },
      { name: 'LLM integration', level: 'hands-on' },
      { name: 'RAG', level: 'hands-on' },
      { name: 'Embeddings & vector search', level: 'hands-on' },
      { name: 'AI evaluation', level: 'hands-on' },
      { name: 'LangChain / LlamaIndex', level: 'hands-on' },
      { name: 'TensorFlow', level: 'hands-on' },
      { name: 'Transformers (BERT, GPT)', level: 'hands-on' },
      { name: 'NumPy & Pandas', level: 'hands-on' },
    ],
    evidence: [
      'Retrieval, evaluation, agent and anomaly demos in the AI Lab — computed live in the browser',
      'Vocalize: speech-to-speech translation with TensorFlow and Transformers',
    ],
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    track: 'primary',
    lead: 'Docker',
    summary: 'Containerised services and pipelines that make delivery repeatable.',
    skills: [
      { name: 'Docker', level: 'production' },
      { name: 'AWS S3', level: 'production' },
      { name: 'AWS', level: 'hands-on' },
      { name: 'GitHub Actions & CI/CD', level: 'hands-on' },
      { name: 'Linux', level: 'hands-on' },
      { name: 'Nginx', level: 'hands-on' },
      { name: 'Kubernetes', level: 'hands-on' },
      { name: 'Azure', level: 'hands-on' },
    ],
    evidence: ['S3 service in the Q Finance API · Dockerised services through dev and UAT'],
  },
  {
    id: 'mobile',
    title: 'Mobile',
    track: 'primary',
    lead: 'Flutter',
    summary: 'Cross-platform apps with clean state and API layers.',
    skills: [
      { name: 'Flutter', level: 'production' },
      { name: 'Dart', level: 'production' },
      { name: 'Provider', level: 'production' },
      { name: 'REST integration (Dio)', level: 'production' },
      { name: 'Firebase push notifications', level: 'production' },
    ],
    evidence: ['FinqyHub and CashKey partner apps'],
  },
  {
    id: 'java',
    title: 'Java',
    track: 'secondary',
    lead: 'Spring Boot',
    summary: 'A secondary track I’m building through FinPilot AI. No professional Java experience yet.',
    skills: [
      { name: 'Spring Boot', level: 'hands-on', note: 'beginner, project-level' },
      { name: 'Java & Core Java', level: 'foundational' },
      { name: 'Data structures & algorithms', level: 'hands-on' },
      { name: 'OOP & Collections', level: 'foundational' },
      { name: 'Spring Data JPA & Hibernate', level: 'foundational' },
      { name: 'Spring Security', level: 'foundational' },
      { name: 'Maven', level: 'foundational' },
    ],
    evidence: ['FinPilot AI (in progress) is built with Java and Spring Boot'],
  },
]

export const targetRoles = [
  { title: 'Backend Developer', stack: 'NestJS · Node.js · TypeScript · MySQL · Redis', track: 'primary' },
  { title: 'Full Stack Developer', stack: 'Next.js + NestJS', track: 'primary' },
  { title: 'Software Engineer', stack: 'TypeScript / Java · APIs · SQL · system design', track: 'primary' },
  { title: 'Java Backend Developer (junior)', stack: 'Java + Spring Boot', track: 'secondary' },
  { title: 'Flutter Developer', stack: 'Flutter · Dart · Firebase', track: 'primary' },
  { title: 'Cloud / DevOps Engineer', stack: 'AWS · Docker · Kubernetes · CI/CD', track: 'primary' },
  { title: 'GenAI Software Engineer', stack: 'Python · LLMs · RAG · APIs', track: 'primary' },
] as const

/** Engineering principles for the About section, each tied to real work. */
export const principles = [
  {
    title: 'Reliable architecture',
    detail: 'Modular services with clear boundaries, so a change in one domain doesn’t ripple through the rest.',
    example: 'Lead, payout and wallet modules in a NestJS v2 API',
  },
  {
    title: 'Secure data handling',
    detail: 'Authentication and permissions decided centrally, and every query scoped to what the caller may see.',
    example: 'OTP authentication; JWT with role and permission modules',
  },
  {
    title: 'Explicit business logic',
    detail: 'Anything that handles money lives in small, pure, tested functions — not scattered through services.',
    example: 'Unit-tested EMI and top-up calculators in Q Finance',
  },
  {
    title: 'Asynchronous processing',
    detail: 'Slow or bursty work goes on a queue, with retries and handlers that are safe to run twice.',
    example: 'BullMQ import processor with an upsert path',
  },
  {
    title: 'Measurable AI quality',
    detail: 'Evaluate at the threshold you’ll actually deploy, and ground every answer in evidence.',
    example: 'FinPilot’s evaluation plan; groundedness demo in the AI Lab',
  },
  {
    title: 'Observability & maintainability',
    detail: 'Tests where mistakes are expensive, meaningful errors, and schema changes versioned as code.',
    example: '40 Jest spec files across two NestJS codebases',
  },
]
