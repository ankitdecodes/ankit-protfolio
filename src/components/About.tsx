import { principles } from '../content/capabilities'
import { profile } from '../content/site'
import { Reveal, Section } from './ui/primitives'

export function About() {
  return (
    <Section id="about" labelledBy="about-title" className="border-t border-line">
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <Reveal className="lg:sticky lg:top-28">
            <p className="text-sm font-semibold text-accent">About</p>
            <h2 id="about-title" className="mt-3 text-headline font-semibold text-fg">
              Software that holds up, <span className="serif text-accent">from schema to screen.</span>
            </h2>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-muted">
              <p className="text-fg">{profile.statement}</p>
              <p>
                I build FinTech products at Finqy: NestJS services for Q Finance, a live personal-finance product, and for a
                lead and payout platform — plus the Next.js and Angular frontends on top of them, and Flutter apps for the
                partners who use them.
              </p>
              <p>
                Backend is my centre of gravity; full-stack is how I make sure it serves real screens. Alongside work I’m
                building FinPilot AI in Java and Spring Boot, because I want AI features that can be measured and checked,
                not just demoed.
              </p>
              {profile.location && <p className="text-base text-subtle">Based in {profile.location}</p>}
            </div>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <Reveal>
            <p className="eyebrow">How I engineer</p>
          </Reveal>
          <ol className="mt-6 grid gap-x-10 sm:grid-cols-2">
            {principles.map((p, i) => (
              <li key={p.title} className="border-t border-line-strong py-8">
                <Reveal delay={(i % 2) * 0.06}>
                  <span className="block text-5xl font-semibold tracking-tight text-accent/75 tabular-nums" aria-hidden>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-fg">{p.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{p.detail}</p>
                  <p className="mt-4 text-sm text-subtle">
                    <span className="font-semibold text-fg">In practice — </span>
                    {p.example}
                  </p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  )
}
