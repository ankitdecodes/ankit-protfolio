import type { TimelineEntry } from './types'

// Roles, dates, education and certifications come from Ankit's resume; the
// highlights under each role are the work verified in the codebases.

export const timeline: TimelineEntry[] = [
  {
    id: 'finqy-fulltime',
    kind: 'work',
    period: 'May 2025 — Present',
    title: 'Full Stack Developer',
    organisation: 'Finqy · Mumbai · Full-time',
    summary:
      'Backend-focused full-stack work across Finqy’s FinTech products: lead and payout platform, Q Finance, partner apps and customer frontends.',
    highlights: [
      'Payout pipeline: transactional outbox + DB-polling worker (SKIP LOCKED, backoff, stale reclaim, alerts)',
      'Wallet ledger with row locks and idempotency keys; agent redeem hold → confirm / release → PAID',
      'Q Finance API: OTP auth, credit-report PDFs, CCAvenue payments, tested EMI calculators',
      'Unified multi-product MIS import on a BullMQ queue; Next.js admin upload flow',
      'Angular SSR website for Q Finance; FinqyHub & CashKey partner apps in Flutter',
      '40 Jest spec files across two NestJS codebases',
    ],
    stack: ['NestJS', 'TypeScript', 'MySQL', 'TypeORM', 'Redis', 'BullMQ', 'Angular', 'Next.js', 'Flutter', 'Docker'],
  },
  {
    id: 'finqy-intern',
    kind: 'work',
    period: 'Dec 2024 — Apr 2025',
    title: 'Full Stack Developer Intern',
    organisation: 'Finqy · Mumbai · Internship',
    summary: 'Built the Personal Finance Manager module and the lead APIs behind it, then moved onto production dashboards.',
    highlights: [
      'NestJS REST APIs for lead creation, assignment and status tracking',
      'Recommendation logic from income, expenses and eligibility inputs',
      'MySQL schemas for financial data, leads and transactions',
      'Auto-loan dashboard (Angular): tranche rules, report export, equipment-loan flow',
    ],
    stack: ['NestJS', 'MySQL', 'Angular'],
  },
  {
    id: 'finpilot',
    kind: 'project',
    period: '2026 — ongoing',
    title: 'FinPilot AI',
    organisation: 'Independent project',
    summary: 'Building a financial operations platform with anomaly detection and an evidence-grounded investigation assistant.',
    highlights: ['Java and Spring Boot backend', 'Evaluation-first approach to detection quality'],
    stack: ['Java', 'Spring Boot'],
  },
  {
    id: 'vocalize',
    kind: 'project',
    period: '2025',
    title: 'Vocalize — real-time speech translation',
    organisation: 'Independent project',
    summary: 'Speech-to-speech pipeline: audio capture → speech recognition → Transformer translation → speech synthesis.',
    highlights: ['ASR with wav2vec / DeepSpeech', 'Transformer-based multilingual translation'],
    stack: ['Python', 'TensorFlow', 'Transformers'],
  },
  {
    id: 'education',
    kind: 'education',
    period: '2021 — 2025',
    title: 'B.E. in Data Science',
    organisation: 'Lokmanya Tilak College of Engineering · Navi Mumbai',
    summary: 'Bachelor of Engineering with a Data Science specialisation. CGPA 7.4 / 10.',
    highlights: [],
  },
  {
    id: 'certifications',
    kind: 'milestone',
    period: '2023',
    title: 'Certifications',
    summary: 'Formal coursework alongside the degree.',
    highlights: [
      'Backend Development — PW Skills (Jul 2023)',
      'MySQL — HackerRank (Jun 2023)',
      'AI / Machine Learning (Data Science) — IBM (Dec 2023)',
    ],
  },
]
