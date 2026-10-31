import type { ProjectVisual as Visual } from '../content/types'

export function ProjectVisual({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case 'finpilot':
      return <FinPilotConcept />
    case 'lead-platform':
      return <ImportPipelineSchematic />
    case 'q-platform':
      return <QPlatformSchematic />
    case 'mobile-apps':
      return <MobileScreenMap />
    case 'image':
      return (
        <img
          src={visual.src}
          alt={visual.alt}
          width={visual.width}
          height={visual.height}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      )
  }
}

const alerts = [
  { id: 'TX-1043', label: 'Electronics · new device', score: 0.9 },
  { id: 'TX-1049', label: 'Crypto exchange · 04:05', score: 0.7 },
  { id: 'TX-1045', label: 'Gift cards · velocity', score: 0.6 },
  { id: 'TX-1051', label: 'Electronics · new device', score: 0.53 },
]

const series = [22, 24, 21, 26, 25, 27, 24, 29, 26, 28, 52, 30, 27, 31, 29, 33, 30, 46, 32, 34]

function FinPilotConcept() {
  const max = 60
  const w = 300
  const h = 70
  const step = w / (series.length - 1)
  const points = series.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * h).toFixed(1)}`).join(' ')

  return (
    <div className="flex w-full flex-col gap-3 p-4 text-left sm:p-6" aria-hidden>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md bg-accent-dim font-mono text-xs text-accent">FP</span>
          <span className="text-sm font-medium text-fg">Transaction monitor</span>
        </div>
        <span className="rounded-md border border-line px-2 py-0.5 font-mono text-xs text-subtle">tenant: demo</span>
      </div>

      <div className="grid items-start gap-3 sm:grid-cols-5">
        <div className="flex flex-col gap-3 sm:col-span-3">
          <div className="rounded-xl border border-line bg-bg/60 p-3">
            <div className="flex items-baseline justify-between font-mono text-xs text-subtle">
              <span>volume · last 20 intervals</span>
              <span className="text-ai">2 spikes</span>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-16 w-full" preserveAspectRatio="none">
              <polyline points={points} fill="none" stroke="var(--color-accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              {series.map((v, i) =>
                v > 40 ? <circle key={i} cx={i * step} cy={h - (v / max) * h} r="3" fill="var(--color-ai)" /> : null,
              )}
            </svg>
          </div>
          <ul className="divide-y divide-line rounded-xl border border-line bg-bg/60">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                <span className="font-mono text-xs text-muted">{a.id}</span>
                <span className="hidden truncate text-xs text-subtle md:inline">{a.label}</span>
                <span className="ml-auto h-1 w-14 overflow-hidden rounded-full bg-line">
                  <span className="block h-full rounded-full bg-ai" style={{ width: `${a.score * 100}%` }} />
                </span>
                <span className="w-7 text-right font-mono text-xs text-fg">{a.score.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="hidden rounded-xl border border-accent/25 bg-accent-dim/40 p-3 sm:col-span-2 sm:flex sm:flex-col">
          <span className="font-mono text-xs text-accent">explanation · TX-1043</span>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Amount is far above this account’s baseline, on a device not seen before, from an unusual location.
          </p>
          <span className="mt-3 font-mono text-xs text-subtle">evidence</span>
          <ul className="mt-1.5 space-y-1.5 font-mono text-xs text-muted">
            <li className="rounded border border-line bg-bg/60 px-2 py-1">amount_z = 20.9</li>
            <li className="rounded border border-line bg-bg/60 px-2 py-1">device.first_seen = true</li>
            <li className="rounded border border-line bg-bg/60 px-2 py-1">geo.mismatch = true</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

const pipeline = [
  { label: 'Partner MIS reports', meta: 'xlsx · per product' },
  { label: 'Unified template', meta: 'one format' },
  { label: 'Upload API', meta: 'NestJS' },
  { label: 'Job queue', meta: 'BullMQ · Redis', highlight: true },
  { label: 'Upsert worker', meta: 'create or update', highlight: true },
  { label: 'Leads · wallets · payouts', meta: 'MySQL · TypeORM' },
]

function ImportPipelineSchematic() {
  return (
    <div className="w-full p-5 sm:p-8" aria-hidden>
      <div className="mb-5 flex items-baseline justify-between gap-3 font-mono text-xs">
        <span className="text-muted">mis-import.pipeline</span>
        <span className="text-subtle">01 → 06</span>
      </div>
      <ol className="relative grid w-full grid-cols-2 gap-3 sm:grid-cols-3">
        {pipeline.map((step, i) => (
          <li
            key={step.label}
            className={`relative rounded-xl border p-3 ${
              step.highlight ? 'border-ai/30 bg-ai-dim/50' : 'border-line bg-bg/60'
            }`}
          >
            <span className="font-mono text-xs text-subtle">{String(i + 1).padStart(2, '0')}</span>
            <p className="mt-1 text-sm font-medium leading-snug text-fg">{step.label}</p>
            <p className={`mt-1 font-mono text-xs ${step.highlight ? 'text-ai' : 'text-muted'}`}>{step.meta}</p>
          </li>
        ))}
      </ol>
      <p className="mt-5 border-t border-line pt-4 font-mono text-xs leading-relaxed text-subtle">
        The request returns after <span className="text-muted">03</span>; parsing and persistence continue in{' '}
        <span className="text-ai">04–05</span> as a background job.
      </p>
    </div>
  )
}

// Modules marked `mine` are ones Ankit created or co-created (verified via git history).
const qClients = [
  { label: 'Q website', meta: 'Angular SSR' },
  { label: 'Q mobile app', meta: 'same API' },
]
const qModules = [
  { label: 'Auth · OTP', mine: true },
  { label: 'Credit report', mine: true },
  { label: 'PDF reports', mine: true },
  { label: 'Payments', mine: true },
  { label: 'Calculators', mine: true },
  { label: 'Dashboard', mine: true },
  { label: 'Recommendations', mine: false },
  { label: 'Leads & products', mine: false },
]
const qIntegrations = [
  { label: 'Credit bureau', meta: 'retry + refresh' },
  { label: 'CCAvenue', meta: 'payment gateway' },
  { label: 'BullMQ worker', meta: 'report jobs' },
  { label: 'MySQL', meta: 'TypeORM' },
]

function QPlatformSchematic() {
  return (
    <div className="w-full p-5 sm:p-8" aria-hidden>
      <div className="mb-5 flex items-baseline justify-between gap-3 font-mono text-xs">
        <span className="text-muted">q-india.service</span>
        <span className="flex items-center gap-1.5 text-subtle">
          <span className="size-1.5 rounded-full bg-ai" /> modules I built or co-built
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1.6fr_1fr] sm:items-center">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-1">
          {qClients.map((c) => (
            <li key={c.label} className="rounded-xl border border-line bg-bg/60 p-3">
              <p className="text-sm font-medium text-fg">{c.label}</p>
              <p className="mt-0.5 font-mono text-xs text-muted">{c.meta}</p>
            </li>
          ))}
        </ul>
        <div className="relative rounded-xl border border-accent/30 bg-accent-dim/30 p-3">
          <p className="font-mono text-xs text-accent">NestJS API · shared by both clients</p>
          <ul className="mt-2.5 grid grid-cols-2 gap-1.5">
            {qModules.map((mod) => (
              <li
                key={mod.label}
                className={`rounded-md border px-2 py-1.5 text-xs ${
                  mod.mine ? 'border-ai/35 bg-ai-dim/60 text-fg' : 'border-line bg-bg/60 text-muted'
                }`}
              >
                {mod.label}
              </li>
            ))}
          </ul>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-1">
          {qIntegrations.map((c) => (
            <li key={c.label} className="rounded-xl border border-line bg-bg/60 px-3 py-2">
              <p className="text-sm font-medium text-fg">{c.label}</p>
              <p className="font-mono text-xs text-muted">{c.meta}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

const screenGroups = [
  { label: 'Onboarding', screens: ['Splash', 'Get started', 'Sign in', 'Sign up', 'Verify OTP'] },
  { label: 'Work', screens: ['Dashboard', 'Submit lead', 'Enquiries', 'Credit cards'] },
  { label: 'Rewards', screens: ['Points claimed', 'Payout settings'] },
  { label: 'Account', screens: ['Profile', 'Support', 'Delete account'] },
]

function Phone({ brand, accent }: { brand: string; accent: boolean }) {
  return (
    <div className="w-[9.5rem] shrink-0 rounded-[1.6rem] border border-line-strong bg-bg p-2 shadow-card sm:w-40">
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line-strong" />
      <div className="space-y-1.5 rounded-[1.1rem] border border-line bg-surface p-2.5">
        <p className={`font-mono text-xs ${accent ? 'text-accent' : 'text-ai'}`}>{brand}</p>
        <div className="rounded-md bg-surface-2 p-2">
          <p className="text-xs text-subtle">Points</p>
          <p className="text-sm font-semibold text-fg">— —</p>
        </div>
        {['Submit lead', 'Enquiries', 'Payouts'].map((x) => (
          <div key={x} className="flex items-center justify-between rounded-md border border-line px-2 py-1.5 text-xs text-muted">
            {x} <span aria-hidden>›</span>
          </div>
        ))}
        <div className={`rounded-md py-1.5 text-center text-xs font-medium text-bg ${accent ? 'bg-accent' : 'bg-ai'}`}>New lead</div>
      </div>
    </div>
  )
}

function MobileScreenMap() {
  return (
    <div className="flex w-full flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-8" aria-hidden>
      <div className="flex justify-center gap-3">
        <Phone brand="FinqyHub" accent />
        <Phone brand="CashKey" accent={false} />
      </div>
      <div className="grid flex-1 grid-cols-2 gap-3">
        {screenGroups.map((g) => (
          <div key={g.label}>
            <p className="font-mono text-xs text-subtle">{g.label}</p>
            <ul className="mt-1.5 space-y-1">
              {g.screens.map((s) => (
                <li key={s} className="text-xs text-muted">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
