import type { TimelineEntry } from './types'

// Periods come from Ankit's commit history in each codebase. Add job titles and
// education entries here once confirmed — the timeline renders whatever is present.

export const timeline: TimelineEntry[] = [
  {
    id: 'finpilot',
    kind: 'project',
    period: '2026 — ongoing',
    title: 'FinPilot AI',
    summary: 'Building a financial operations platform with anomaly detection and an evidence-grounded investigation assistant.',
    highlights: ['Java and Spring Boot backend', 'Evaluation-first approach to detection quality'],
    stack: ['Java', 'Spring Boot'],
  },
  {
    id: 'lead-platform',
    kind: 'work',
    period: 'Feb 2026 — Sep 2026',
    title: 'Lead & payout operations platform',
    organisation: 'Finqy',
    summary: 'NestJS modules and Next.js admin screens for a FinTech platform covering leads, payouts, wallets and bulk imports.',
    highlights: [
      'Transactional outbox + polling worker for payouts; idempotent wallet ledger',
      'Unified MIS import with upsert, processed by a BullMQ queue',
      'Backward-compatible wallet and redeem-request APIs',
      '21 Jest spec files across payout, wallet and import code',
    ],
    stack: ['NestJS', 'TypeORM', 'MySQL', 'BullMQ', 'Next.js'],
    source: 'Commit history',
  },
  {
    id: 'q-platform',
    kind: 'work',
    period: 'Feb 2026 — Jul 2026',
    title: 'Q personal finance platform',
    organisation: 'Finqy',
    summary: 'Service modules for the API behind the Q website and app, and the initial setup of the Angular SSR website.',
    highlights: [
      'OTP auth, credit-report PDFs and CCAvenue payments',
      'Tested recommendation-engine calculators',
      '19 Jest spec files across the modules I worked on',
    ],
    stack: ['NestJS', 'MySQL', 'BullMQ', 'Puppeteer', 'Angular SSR'],
    source: 'Commit history',
  },
  {
    id: 'partner-apps',
    kind: 'work',
    period: '2026',
    title: 'FinqyHub & CashKey partner apps',
    organisation: 'Finqy',
    summary: 'Flutter apps for sales partners: OTP sign-in, lead submission, enquiry tracking, points and payouts.',
    highlights: ['Provider state with a repository + Dio API layer', 'Firebase Cloud Messaging push notifications'],
    stack: ['Flutter', 'Dart', 'Firebase'],
  },
  {
    id: 'customer-frontend',
    kind: 'work',
    period: 'Mar 2026 — May 2026',
    title: 'Customer web frontend · environments & attribution',
    organisation: 'Finqy',
    summary: 'Environment configuration and submission-tracking changes on a customer-facing Angular application.',
    highlights: ['Environment and deployment configuration', 'UTM-linked submission identifiers'],
    stack: ['Angular', 'TypeScript'],
    source: 'Commit history',
  },
  {
    id: 'auto-loan',
    kind: 'work',
    period: 'Mar 2025 — Nov 2025',
    title: 'Auto-loan operations dashboard',
    organisation: 'Finqy',
    summary: 'Features and fixes in an Angular dashboard for auto-loan operations.',
    highlights: ['Tranche rules, report export and a machinery-equipment loan flow'],
    stack: ['Angular', 'CoreUI'],
    source: 'Commit history',
  },
]
