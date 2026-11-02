import type { Contribution, Project } from './types'

// To add a project, append an entry. Leave `results` and `links` empty until real
// numbers and public URLs exist — the UI renders their absence honestly.
// Claims about team codebases were checked against commit history; never link a
// private repository (it 404s for visitors).

export const projects: Project[] = [
  {
    id: 'finpilot-ai',
    index: '01',
    name: 'FinPilot AI',
    tagline: 'Intelligent financial operations platform',
    summary:
      'A financial operations platform I’m building in Java and Spring Boot: transaction analytics, anomaly detection and an investigation assistant whose explanations point back to the records behind every alert.',
    status: { label: 'In progress', tone: 'progress' },
    context: 'Independent project · Java & Spring Boot',
    mode: 'design',
    problem:
      'Teams reviewing transaction flows face two problems at once: static rules miss patterns nobody wrote a rule for, while opaque model scores are hard to act on. FinPilot pairs anomaly detection with explanations that point back to concrete evidence, so every flag can be checked rather than trusted blindly.',
    role: 'Independent project: product definition, architecture and implementation.',
    contributions: [
      'Building the backend in Java and Spring Boot — a deliberate step beyond my day-to-day NestJS stack.',
      'Scoping the domain: accounts, transactions, alerts and investigations.',
      'Planning evaluation so detection quality is measured before it is trusted.',
    ],
    features: [
      { label: 'Financial transaction analytics', status: 'planned' },
      { label: 'ML-based anomaly detection', status: 'planned' },
      { label: 'AI-assisted investigation', status: 'planned' },
      { label: 'Evidence-grounded explanations', status: 'planned' },
      { label: 'Asynchronous transaction processing', status: 'planned' },
      { label: 'Secure, tenant-scoped access', status: 'planned' },
      { label: 'Model evaluation and monitoring', status: 'planned' },
    ],
    blueprint: [
      { area: 'Data flow', intent: 'Transactions are persisted on arrival, then scored asynchronously so ingestion never waits on the model.', status: 'planned' },
      { area: 'Database design', intent: 'Accounts, transactions, scores and alerts as relational tables, with each score stored beside the evidence that produced it.', status: 'planned' },
      { area: 'Anomaly detection', intent: 'Per-account baselines plus learned scoring, with every point of score attributable to a named signal.', status: 'planned' },
      { area: 'Investigation assistant', intent: 'Drafts explanations only from retrieved records and must cite them; insufficient evidence means no answer.', status: 'planned' },
      { area: 'Security', intent: 'Authentication and role checks with Spring Security, and a tenant boundary enforced on every query.', status: 'planned' },
      { area: 'Background processing', intent: 'Scoring and report jobs run off the request path, with idempotent handlers so retries are safe.', status: 'planned' },
      { area: 'Evaluation', intent: 'Precision and recall at the deployed threshold on a labelled, time-split holdout before any change ships.', status: 'planned' },
      { area: 'Observability', intent: 'Structured logs and alert outcomes tracked over time to catch drift.', status: 'planned' },
    ],
    decisions: [
      {
        title: 'Ingestion decoupled from scoring',
        detail: 'Each transaction is persisted immediately and scored by a background worker, so traffic spikes never sit on the request path.',
      },
      {
        title: 'Tenant boundary on every query',
        detail: 'Tenant scope comes from the authenticated session and is enforced in the data layer, not left to individual endpoints to remember.',
      },
      {
        title: 'Evidence before explanation',
        detail: 'Explanations are generated only from retrieved records and feature contributions, and must cite them. No evidence, no explanation.',
      },
      {
        title: 'Evaluation as a release gate',
        detail: 'A detection change ships only if precision and recall at the operating threshold hold up on labelled data.',
      },
    ],
    challenges: [
      {
        challenge: 'Where to set the alert threshold',
        solution: 'Treat it as a product decision: expose the precision/recall trade-off instead of hard-coding one global cut-off.',
      },
      {
        challenge: 'Keeping AI explanations grounded',
        solution: 'Constrain generation to retrieved context and reject answers that reference records outside it.',
      },
      {
        challenge: 'Retries without duplicate alerts',
        solution: 'Idempotency keys per transaction so a re-delivered job can never score or alert twice.',
      },
    ],
    stack: ['Java', 'Spring Boot'],
    testing: [
      'Planned: unit tests for scoring logic and API contracts.',
      'Planned: offline evaluation on a labelled, time-split holdout before any detection change is promoted.',
    ],
    repository: 'none',
    verification: 'Repository not yet published or reviewed. This case study shows intended design and scope — nothing here is claimed as finished.',
    results: [],
    resultsNote: 'Results will be published once there is a working build and labelled data to evaluate it on.',
    links: [],
    visual: { kind: 'finpilot' },
    visualNote: 'Concept interface — illustrative, not a product screenshot.',
  },
  {
    id: 'q-platform',
    index: '02',
    name: 'Q Finance',
    tagline: 'A consumer finance platform for credit reports, recommendations and payments',
    summary:
      'NestJS services behind Q, a consumer personal-finance product in India: OTP sign-in, credit-bureau reports rendered as PDFs, loan and credit-card recommendations, and payment collection — shared by the Q website and mobile app.',
    status: { label: 'Live product · team codebase', tone: 'live' },
    context: 'Finqy · API work Feb – Jul 2026 · website Feb – Jun 2026',
    mode: 'delivered',
    problem:
      'People want to understand their credit report and what they could save or qualify for. The platform has to fetch bureau data reliably, turn it into a readable report, recommend products using calculations that can be checked, and take payments — for a website and a mobile app that share one API.',
    role: 'Backend-focused contributor in a multi-engineer team: built several service modules of the q-india app in a NestJS monorepo, and bootstrapped and integrated the Angular customer website.',
    contributions: [
      'Built OTP/SMS authentication and profile APIs used by both the Q website and app.',
      'Created the credit-report module and PDF report generation from HTML templates, with matching email templates.',
      'Integrated the CCAvenue payment gateway, including payment-status handling.',
      'Wrote recommendation-engine calculators (EMI, interest, outstanding, savings, top-up, premium) and reworked credit-card recommendations for new and upgrade cases, backed by seeded master data.',
      'Built lead, product and dashboard APIs for the customer journey.',
      'Created the initial Angular SSR project for the Q website, set up its dev environment and integrated it with the backend APIs.',
    ],
    decisions: [
      {
        title: 'One API, two clients',
        detail: 'The website and mobile app share the same q-india NestJS service, so auth, reports and payments behave identically everywhere.',
      },
      {
        title: 'Monorepo of NestJS apps',
        detail: 'Several product APIs live side by side under apps/, sharing libraries for entities, database seeding, notifications and common utilities.',
      },
      {
        title: 'Workers for heavy jobs',
        detail: 'A separate worker entrypoint processes report jobs with BullMQ on Redis, keeping slow bureau and PDF work off the request path.',
      },
      {
        title: 'Calculations as pure functions',
        detail: 'Financial formulas such as EMI (PMT) live in small, framework-free functions with their own specs, separate from the services that call them.',
      },
    ],
    challenges: [
      {
        challenge: 'Credit-bureau calls can fail',
        solution: 'Retry handling around bureau requests, covered by a dedicated spec, plus a refresh path to regenerate a report.',
      },
      {
        challenge: 'Recommendations must be defensible',
        solution: 'Canonical, unit-tested calculators instead of arithmetic scattered through services, so every figure traces to one formula.',
      },
      {
        challenge: 'Reports must render consistently',
        solution: 'Server-side rendering of HTML templates to PDF, with sample-report fixtures to check layout before release.',
      },
    ],
    stack: ['NestJS', 'TypeScript', 'TypeORM', 'MySQL', 'BullMQ', 'Redis', 'Puppeteer', 'Jest', 'Angular', 'Angular SSR'],
    testing: [
      'Added 19 Jest spec files covering auth, payments, reports, credit reports, the dashboard and shared utilities.',
      'Calculator specs exercise the EMI and top-up formulas directly, independent of any service.',
      'A dedicated spec covers retry behaviour for credit-bureau requests.',
    ],
    repository: 'private',
    verification: 'Checked against commit history in the private finqyapi and Q_web_customer_india repositories. The live site is the team’s product, not a solo build.',
    results: [],
    resultsNote: 'No usage, revenue or performance figures are public, so none are shown.',
    links: [{ kind: 'demo', label: 'Live site', href: 'https://qfinance.in' }],
    visual: { kind: 'q-platform' },
    visualNote: 'Schematic of the q-india service — the codebase is private.',
  },
  {
    id: 'lead-payout-platform',
    index: '03',
    name: 'Lead & Payout Operations Platform',
    tagline: 'FinTech lead lifecycle, bulk data imports and agent payouts',
    summary:
      'Backend services and admin tooling for a FinTech platform that manages leads across financial products, imports partner MIS reports in bulk and tracks sales-agent wallets and payouts.',
    status: { label: 'Private · team codebase', tone: 'neutral' },
    context: 'FinTech · contributions Feb – Sep 2026',
    mode: 'delivered',
    problem:
      'Lead outcomes and payout data arrive from partners as spreadsheets whose shape differs by product. The platform has to reconcile those reports against existing leads, keep agent wallets consistent and give operations staff the tools to run it — without long uploads blocking the API.',
    role: 'Backend-focused full-stack contributor in a multi-engineer team: NestJS service modules and the matching Next.js admin screens.',
    contributions: [
      'Built the payout pipeline: a transactional outbox (LeadApproved / LeadUnapproved, cycle-aware keys) drained by a database-polling worker with FOR UPDATE SKIP LOCKED claiming, capped exponential backoff, stale-row reclaim and alerts.',
      'Built the wallet ledger: separate balance buckets, pessimistic row locks with double-checked idempotency keys, and the agent redeem lifecycle — hold, MIS confirm or release, Finance PAID — with role checks.',
      'Built a unified MIS import: one upload template across products, backed by an upsert service that creates or updates leads.',
      'Created the BullMQ queue processor so large imports run as background jobs on Redis instead of inside the request.',
      'Extended sales-agent wallet and redeem-request APIs to accept both lead and submission IDs while staying backward compatible.',
      'Worked across the lead-core, payout, dashboard and user-management modules of the v2 API.',
      'Added an SSO service for an external MIS utility.',
      'Built the MIS upload workflow in the Next.js admin application.',
    ],
    decisions: [
      {
        title: 'Modular NestJS services',
        detail:
          'Domains such as leads, payouts, wallets and dashboards each own their controllers, services and DTOs while sharing auth and persistence infrastructure.',
      },
      {
        title: 'Transactional outbox for payouts',
        detail:
          'Lead approval and its payout event commit in one transaction; a polling worker claims events with SKIP LOCKED, so payouts are never lost between the database and the worker.',
      },
      {
        title: 'Idempotent wallet ledger',
        detail:
          'Every money movement carries a unique idempotency key and runs under a wallet row lock, so retried or duplicated events can’t credit twice.',
      },
      {
        title: 'Queue-backed bulk processing',
        detail:
          'Imports are accepted quickly and handed to BullMQ workers on Redis, keeping API latency independent of file size.',
      },
      {
        title: 'Schema changes as code',
        detail: 'TypeORM migrations are versioned in the repository and applied per environment (dev, UAT).',
      },
      {
        title: 'Role and permission model',
        detail: 'JWT authentication via Passport, with dedicated role and permission modules guarding admin operations.',
      },
    ],
    challenges: [
      {
        challenge: 'Paying out exactly once under at-least-once delivery',
        solution: 'Outbox keys stop duplicate events; unique ledger keys checked under a pessimistic lock stop duplicate credits, even when a worker crashes after committing.',
      },
      {
        challenge: 'Partner reports differ by product',
        solution: 'A single import template with an upsert path, so one pipeline handles creates and updates for every product.',
      },
      {
        challenge: 'Long-running uploads',
        solution: 'Move parsing and persistence into a queued job; the request returns while a worker processes the file.',
      },
      {
        challenge: 'Evolving APIs that clients already use',
        solution:
          'Widen DTOs to accept both identifier types and resolve the acting user through one helper, so existing callers keep working.',
      },
    ],
    stack: [
      'NestJS',
      'TypeScript',
      'TypeORM',
      'MySQL',
      'BullMQ',
      'Redis',
      'Passport JWT',
      'Next.js',
      'React',
      'Tailwind CSS',
      'Docker',
    ],
    testing: [
      'Added 21 Jest spec files, including payout orchestration, payout-rule services, wallet entries and the import upsert utility.',
      'Changes moved through separate dev and UAT environments before release.',
    ],
    repository: 'private',
    verification: 'Checked against commit history in the private backend and admin-frontend repositories.',
    results: [],
    resultsNote: 'The codebase is private and no public metrics are available, so none are shown.',
    links: [],
    visual: { kind: 'lead-platform' },
    visualNote: 'Schematic of the import pipeline — the codebase itself is private.',
  },
  {
    id: 'partner-apps',
    index: '04',
    name: 'FinqyHub & CashKey',
    tagline: 'Flutter partner apps for leads, enquiries and payouts',
    summary:
      'Two branded Flutter apps on one shared architecture: OTP sign-in, lead submission, enquiry tracking, points and payout settings, credit-card listings, referrals and push notifications.',
    status: { label: 'Mobile · team codebase', tone: 'neutral' },
    context: 'Finqy · Flutter & Dart · 2026',
    mode: 'delivered',
    problem:
      'Sales partners work from their phones. They need to submit leads, follow each enquiry, see the points they have earned and set up payouts — without going through the web admin.',
    role: 'Flutter developer: screens, state management and API integration for both apps.',
    contributions: [
      'Built OTP sign-in and sign-up flows, profile and account-deletion screens.',
      'Built lead submission, enquiry tracking and a dashboard of partner activity.',
      'Built points-claimed and payout-settings screens, plus a credit-card listing.',
      'Integrated push notifications with Firebase Cloud Messaging and local notifications.',
      'Added referral sharing and Mixpanel analytics events.',
    ],
    decisions: [
      {
        title: 'Provider for state',
        detail: 'App-wide auth state lives in a Provider, keeping screens thin and the session in one place.',
      },
      {
        title: 'Repository over a shared HTTP client',
        detail: 'Screens call repositories; repositories call one configured Dio client, so headers, base URL and error handling live in a single layer.',
      },
      {
        title: 'Reusable widget kit',
        detail: 'Custom buttons, text fields, dropdowns, headers and app bars keep both apps visually consistent.',
      },
      {
        title: 'One structure, two brands',
        detail: 'FinqyHub and CashKey share the same module layout, so a fix or feature in one maps directly onto the other.',
      },
    ],
    challenges: [
      {
        challenge: 'Unreliable mobile networks',
        solution: 'Dedicated network-error and error screens instead of silent failures.',
      },
      {
        challenge: 'Two brands without duplicated design work',
        solution: 'Theme, colours and text styles isolated in a core module so branding changes stay local.',
      },
      {
        challenge: 'Account lifecycle requirements',
        solution: 'An in-app account-deletion flow alongside sign-up and profile management.',
      },
    ],
    stack: ['Flutter', 'Dart', 'Provider', 'Dio', 'Firebase Cloud Messaging', 'Mixpanel', 'REST APIs'],
    testing: [
      'Only the default Flutter widget test exists. Widget tests for the OTP and lead-submission flows are the first gap I would close.',
    ],
    repository: 'private',
    verification: 'Screens, structure and stack read from the app source in the private repositories.',
    results: [],
    resultsNote: 'No install or usage figures are public, so none are shown.',
    links: [],
    visual: { kind: 'mobile-apps' },
    visualNote: 'Screen map drawn from the app source — not a screenshot.',
  },
]

export const otherContributions: Contribution[] = [
  {
    id: 'auto-loan-dashboard',
    name: 'Auto-Loan Operations Dashboard',
    context: 'Finqy · Angular 17 · Mar 2025 and Nov 2025',
    summary: 'Internal dashboard for an auto-loan business covering leads, approvals, loan tranches and finance reporting.',
    contributions: [
      'Lead-status and RTO-status details in a popup view.',
      'Tranche-creation rule changes, including FCL validity dates and conditional link-loan fields.',
      'Finance and master report screens with export, plus fixes to the export API integration.',
      'A new-vehicle and machinery-equipment loan flow.',
    ],
    stack: ['Angular', 'TypeScript', 'CoreUI', 'Bootstrap'],
    verification: '11 commits in a large, private team codebase.',
    links: [],
  },
]
