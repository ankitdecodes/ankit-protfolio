import { levelDescription, levelLabel, skillGroups, targetRoles, type SkillLevel } from '../content/capabilities'
import { Reveal, Section, SectionHeading } from './ui/primitives'

const LEVELS: SkillLevel[] = ['production', 'hands-on', 'foundational']

const chipStyle: Record<SkillLevel, string> = {
  production: 'border-accent/25 bg-accent-dim text-accent-strong',
  'hands-on': 'border-line-strong bg-surface text-fg',
  foundational: 'border-dashed border-line-strong bg-transparent text-muted',
}

export function SkillsSection() {
  return (
    <Section id="skills" labelledBy="skills-title">
      <SectionHeading
        eyebrow="Skills"
        id="skills-title"
        title={
          <>
            Capabilities, <span className="serif text-accent">grounded in evidence.</span>
          </>
        }
        intro="No percentages or self-ratings. Each skill is marked by where I’ve actually used it — professional production code, my own projects, or areas I’m still learning."
      />

      <Reveal className="mt-12 flex flex-wrap gap-x-8 gap-y-3 rounded-2xl bg-surface px-6 py-5 shadow-card ring-1 ring-line">
        {LEVELS.map((l) => (
          <div key={l} className="flex items-center gap-3">
            <span className={`inline-flex h-7 items-center rounded-full border px-3 text-sm font-medium ${chipStyle[l]}`}>
              {levelLabel[l]}
            </span>
            <span className="text-sm text-muted">{levelDescription[l]}</span>
          </div>
        ))}
      </Reveal>

      <ul className="mt-10 divide-y divide-line border-y border-line">
        {skillGroups.map((group) => (
          <li key={group.id}>
            <Reveal className="grid gap-6 py-9 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-2xl font-semibold tracking-tight text-fg">{group.title}</h3>
                  {group.track === 'secondary' && (
                    <span className="rounded-full bg-ai-dim px-2.5 py-0.5 text-sm font-medium text-ai">Secondary track</span>
                  )}
                </div>
                <p className="mt-2 leading-relaxed text-muted">{group.summary}</p>
              </div>
              <div className="lg:col-span-8">
                <ul className="flex flex-wrap gap-2" aria-label={`${group.title} skills`}>
                  {group.skills.map((s) => (
                    <li
                      key={s.name}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-[0.9375rem] font-medium ${chipStyle[s.level]}`}
                    >
                      {s.name}
                      {s.note && <span className="text-sm opacity-75">· {s.note}</span>}
                      <span className="sr-only">({levelLabel[s.level]})</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm leading-relaxed text-subtle">
                  <span className="font-semibold text-fg">Where it shows up — </span>
                  {group.evidence.join(' · ')}
                </p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>

      <Reveal className="mt-20 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h3 className="text-2xl font-semibold tracking-tight text-fg">Roles I’m targeting</h3>
          <p className="mt-3 leading-relaxed text-muted">
            In priority order. Java is a secondary track: project-level experience through FinPilot AI, not professional
            experience.
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:col-span-8">
          {targetRoles.map((r, i) => (
            <li key={r.title} className="rounded-2xl bg-surface p-5 shadow-card ring-1 ring-line">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-accent tabular-nums">0{i + 1}</span>
                {r.track === 'secondary' && <span className="text-sm font-medium text-ai">Secondary</span>}
              </div>
              <p className="mt-2 text-lg font-semibold text-fg">{r.title}</p>
              <p className="mt-1 text-sm text-muted">{r.stack}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </Section>
  )
}
