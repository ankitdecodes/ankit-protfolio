import { timeline } from '../content/experience'
import type { TimelineEntry } from '../content/types'
import { Reveal, Section, SectionHeading } from './ui/primitives'

const kindLabel: Record<TimelineEntry['kind'], string> = {
  work: 'Team project',
  project: 'Independent project',
  education: 'Education',
  milestone: 'Milestone',
}

export function ExperienceTimeline() {
  return (
    <Section id="experience" labelledBy="experience-title" className="border-t border-line">
      <SectionHeading
        eyebrow="Experience"
        id="experience-title"
        title="Recent work, in order."
        intro="Periods reflect my contribution history in each codebase. Team projects are shared codebases; independent projects are my own."
      />

      <ol className="relative mt-16">
        {timeline.map((entry) => (
          <li key={entry.id} className="grid gap-4 border-t border-line py-10 first:border-t-0 lg:grid-cols-12 lg:gap-10">
            <Reveal className="lg:col-span-3">
              <p className="text-base font-semibold text-fg tabular-nums">{entry.period}</p>
              {entry.organisation && <p className="mt-1 text-muted">{entry.organisation}</p>}
              <span
                className={`mt-3 inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium ${
                  entry.kind === 'project' ? 'bg-ai-dim text-ai-strong' : 'bg-accent-dim text-accent-strong'
                }`}
              >
                {kindLabel[entry.kind]}
              </span>
            </Reveal>
            <Reveal className="lg:col-span-9" delay={0.05}>
              <h3 className="text-2xl font-semibold tracking-tight text-fg">{entry.title}</h3>
              <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted">{entry.summary}</p>
              <ul className="mt-5 grid gap-x-8 gap-y-2 md:grid-cols-2">
                {entry.highlights.map((h) => (
                  <li key={h} className="flex gap-3 text-fg">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
              {entry.stack && (
                <ul className="mt-5 flex flex-wrap gap-2" aria-label="Technologies">
                  {entry.stack.map((t) => (
                    <li key={t} className="rounded-md bg-surface-2 px-2.5 py-1 text-sm font-medium text-muted">
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  )
}
