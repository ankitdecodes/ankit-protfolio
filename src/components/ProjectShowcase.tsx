import { useId, useState, type ReactNode } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ArrowUpRight, Check, ChevronDown, FileText, Globe, Lock } from 'lucide-react'
import { otherContributions, projects } from '../content/projects'
import type { Contribution, FeatureStatus, Project, ProjectLink } from '../content/types'
import { ProjectVisual } from './ProjectVisuals'
import { GithubIcon } from './ui/brand-icons'
import { Reveal, Section, SectionHeading, Tag, type TagTone } from './ui/primitives'

export function ProjectShowcase() {
  return (
    <Section id="projects" labelledBy="projects-title" className="border-t border-line">
      <SectionHeading
        eyebrow="Selected work"
        id="projects-title"
        title="Engineering case studies."
        intro="A flagship platform in progress, plus delivered work from private team codebases. Completed and planned work are labelled separately, and private code is described but never linked."
      />
      <div className="mt-16 space-y-24 md:mt-20 lg:space-y-32">
        {projects.map((project, i) => (
          <ProjectFeature key={project.id} project={project} reversed={i % 2 === 1} flagship={i === 0} />
        ))}
      </div>
      {otherContributions.length > 0 && <OtherContributions items={otherContributions} />}
    </Section>
  )
}

const statusTone: Record<Project['status']['tone'], TagTone> = { progress: 'ai', neutral: 'default', live: 'success' }

const featureStatusLabel: Record<FeatureStatus, string> = {
  completed: 'Completed',
  'in-progress': 'In progress',
  planned: 'Planned',
}
const featureTone: Record<FeatureStatus, TagTone> = { completed: 'success', 'in-progress': 'accent', planned: 'default' }

const repositoryLabel: Record<Project['repository'], string> = {
  private: 'Private repository',
  public: 'Public repository',
  none: 'No public build yet',
}

const linkIcon = (kind: ProjectLink['kind']) =>
  kind === 'repo' ? <GithubIcon className="size-4" /> : kind === 'demo' ? <Globe className="size-4" aria-hidden /> : <FileText className="size-4" aria-hidden />

function ProjectFeature({ project, reversed, flagship }: { project: Project; reversed: boolean; flagship: boolean }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const design = project.mode === 'design'

  return (
    <article id={project.id} aria-labelledby={`${project.id}-title`}>
      <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
        <Reveal className={`min-w-0 lg:col-span-7 ${reversed ? 'lg:order-2' : ''}`}>
          <figure>
            <div className="theme-dark group relative overflow-hidden rounded-3xl bg-surface shadow-lift ring-1 ring-black/5 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1">
              <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
                <span className="size-2.5 rounded-full bg-[#ff927a]" aria-hidden />
                <span className="size-2.5 rounded-full bg-[#f5c86b]" aria-hidden />
                <span className="size-2.5 rounded-full bg-[#5fd3a4]" aria-hidden />
                <span className="ml-3 truncate text-sm text-subtle">{project.name}</span>
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 right-0 h-64 w-96 rounded-full bg-[#526bff]/25 blur-3xl"
              />
              <div className="relative flex min-h-[320px] items-center sm:min-h-[400px] lg:min-h-[460px]">
                <ProjectVisual visual={project.visual} />
              </div>
            </div>
            <figcaption className="mt-3 text-sm text-subtle">{project.visualNote}</figcaption>
          </figure>
        </Reveal>

        <Reveal className={`min-w-0 lg:col-span-5 ${reversed ? 'lg:order-1' : ''}`} delay={0.08}>
          <div className="flex flex-wrap items-center gap-2">
            {flagship && <Tag tone="accent">Flagship</Tag>}
            <Tag tone={statusTone[project.status.tone]}>{project.status.label}</Tag>
            <span className="inline-flex items-center gap-1.5 text-sm text-subtle">
              {project.repository === 'private' && <Lock className="size-3.5" aria-hidden />}
              {repositoryLabel[project.repository]}
            </span>
          </div>
          <h3 id={`${project.id}-title`} className="mt-5 text-4xl font-semibold tracking-tight text-fg md:text-5xl">
            {project.name}
          </h3>
          <p className="mt-3 text-xl leading-snug text-fg">{project.tagline}</p>
          <p className="mt-2 text-sm text-subtle">{project.context}</p>
          <p className="mt-5 leading-relaxed text-muted">{project.summary}</p>

          <h4 className="eyebrow mt-8">{design ? 'Current focus' : 'My contribution'}</h4>
          <ul className="mt-3 space-y-3">
            {project.contributions.slice(0, 3).map((c) => (
              <li key={c} className="flex gap-3 leading-relaxed text-fg">
                <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-accent-dim text-accent-strong">
                  <Check className="size-3" aria-hidden />
                </span>
                {c}
              </li>
            ))}
          </ul>

          <ul className="mt-8 flex flex-wrap gap-2" aria-label={`${project.name} technologies`}>
            {project.stack.map((tech) => (
              <li key={tech}>
                <Tag>{tech}</Tag>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-12 items-center gap-2 rounded-lg bg-fg px-5 font-medium text-white shadow-sm transition-colors hover:bg-accent active:scale-[0.98]"
            >
              {open ? 'Hide case study' : 'Read full case study'}
              <ChevronDown className={`size-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            {project.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center gap-2 rounded-lg border border-line-strong bg-surface px-5 font-medium text-fg shadow-sm transition-colors hover:border-accent/50 hover:text-accent"
              >
                {linkIcon(link.kind)} {link.label}
                <span className="sr-only">(opens in a new tab)</span>
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
            ))}
          </div>
        </Reveal>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            id={panelId}
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <CaseStudy project={project} design={design} />
          </m.div>
        )}
      </AnimatePresence>
    </article>
  )
}

function CaseStudy({ project, design }: { project: Project; design: boolean }) {
  return (
    <div className="mt-10 rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-10 lg:p-12">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Block title="The problem">
          <p>{project.problem}</p>
        </Block>
        <Block title="My role">
          <p>{project.role}</p>
        </Block>
      </div>

      <Divider />
      <Block title={design ? 'Current focus' : 'Everything I contributed'}>
        <ul className="grid gap-x-12 gap-y-3 md:grid-cols-2">
          {project.contributions.map((c) => (
            <li key={c} className="flex gap-3">
              <Check className="mt-1 size-4 shrink-0 text-accent" aria-hidden />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </Block>

      {project.blueprint && (
        <>
          <Divider />
          <Block title="System blueprint" aside={`${project.blueprint.filter((a) => a.status === 'completed').length} of ${project.blueprint.length} areas completed`}>
            <ol className="grid gap-x-12 gap-y-6 md:grid-cols-2">
              {project.blueprint.map((a) => (
                <li key={a.area}>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-fg">{a.area}</span>
                    <Tag tone={featureTone[a.status]}>{featureStatusLabel[a.status]}</Tag>
                  </div>
                  <p className="mt-1.5">{a.intent}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-base">
              Concept demos you can run now:{' '}
              <a href="#lab" className="font-medium text-accent hover:underline">
                anomaly scoring and grounded retrieval in the AI Lab
              </a>{' '}
              — illustrations of the approach, not FinPilot’s code.
            </p>
          </Block>
        </>
      )}

      {project.features && !project.blueprint && (
        <>
          <Divider />
          <Block title="Feature scope">
            <ul className="flex flex-wrap gap-2">
              {project.features.map((f) => (
                <li key={f.label}>
                  <Tag tone={featureTone[f.status]}>
                    {f.label} · {featureStatusLabel[f.status]}
                  </Tag>
                </li>
              ))}
            </ul>
          </Block>
        </>
      )}

      <Divider />
      <Block title={design ? 'Planned architecture' : 'Architecture & engineering decisions'}>
        <div className="grid gap-x-12 gap-y-7 md:grid-cols-2">
          {project.decisions.map((d, i) => (
            <div key={d.title} className="border-l-2 border-accent/40 pl-5">
              <p className="text-sm font-semibold text-accent">0{i + 1}</p>
              <h5 className="mt-1 text-lg font-semibold text-fg">{d.title}</h5>
              <p className="mt-1.5">{d.detail}</p>
            </div>
          ))}
        </div>
      </Block>

      <Divider />
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <Block title={design ? 'Open design questions' : 'Challenges & solutions'}>
          <ol className="space-y-5">
            {project.challenges.map((c) => (
              <li key={c.challenge}>
                <p className="font-semibold text-fg">{c.challenge}</p>
                <p className="mt-1">{c.solution}</p>
              </li>
            ))}
          </ol>
        </Block>
        <div className="space-y-10">
          <Block title={design ? 'Testing plan' : 'Testing & reliability'}>
            <ul className="space-y-3">
              {project.testing.map((t) => (
                <li key={t} className="flex gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Block>
          <Block title="Verified results">
            {project.results.length > 0 ? (
              <ul className="space-y-2">
                {project.results.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : (
              <p>{project.resultsNote ?? 'No measured results published yet.'}</p>
            )}
          </Block>
        </div>
      </div>

      <p className="mt-10 rounded-xl bg-surface-2 px-5 py-4 text-sm leading-relaxed text-muted">
        <span className="font-semibold text-fg">How this was verified: </span>
        {project.verification}
      </p>
    </div>
  )
}

function Divider() {
  return <hr className="my-10 border-line" />
}

function Block({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-lg font-semibold text-fg">{title}</h4>
        {aside && <span className="text-sm text-subtle">{aside}</span>}
      </div>
      <div className="leading-relaxed text-muted">{children}</div>
    </section>
  )
}

function OtherContributions({ items }: { items: Contribution[] }) {
  return (
    <Reveal className="mt-24 border-t border-line pt-12 lg:mt-32">
      <h3 className="text-2xl font-semibold tracking-tight text-fg">More work</h3>
      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border border-line bg-surface p-7 shadow-card">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h4 className="text-xl font-semibold tracking-tight text-fg">{item.name}</h4>
              {item.private && (
                <span className="inline-flex items-center gap-1.5 text-sm text-subtle">
                  <Lock className="size-3.5" aria-hidden /> Private
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-subtle">{item.context}</p>
            <p className="mt-4 leading-relaxed text-muted">{item.summary}</p>
            <ul className="mt-4 space-y-2 text-muted">
              {item.contributions.map((c) => (
                <li key={c} className="flex gap-3">
                  <Check className="mt-1 size-4 shrink-0 text-accent" aria-hidden />
                  {c}
                </li>
              ))}
            </ul>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label={`${item.name} technologies`}>
              {item.stack.map((t) => (
                <li key={t}>
                  <Tag>{t}</Tag>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-subtle">{item.verification}</p>
          </li>
        ))}
      </ul>
    </Reveal>
  )
}
