import { ArrowRight, FileText, Mail } from 'lucide-react'
import { m, type Variants } from 'motion/react'
import { contactLinks, heroTechnologies, profile } from '../content/site'
import { HeroScene } from './hero/HeroScene'
import { GithubIcon, LinkedinIcon } from './ui/brand-icons'
import { ButtonLink, MissingConfig } from './ui/primitives'

// The headline and intro render immediately (LCP candidates); secondary elements fade in.
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

const socialLink =
  'inline-flex min-h-10 items-center gap-2 rounded-lg font-medium text-muted transition-colors hover:text-accent'

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] bg-[radial-gradient(60%_55%_at_70%_20%,rgb(37_99_235/0.10),transparent_70%),radial-gradient(40%_40%_at_10%_10%,rgb(16_185_129/0.06),transparent_70%)]"
      />
      <div className="container-page grid items-center gap-12 pt-36 pb-20 md:pt-44 lg:grid-cols-12 lg:gap-10 lg:pb-28">
        <div className="min-w-0 lg:col-span-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-muted shadow-sm">
            <span className="size-2 rounded-full bg-[#10b981]" aria-hidden />
            {profile.roles.join(' · ')}
          </p>

          <h1 id="hero-title" className="mt-7 text-display font-semibold text-fg">
            Building intelligent software{' '}
            <span className="serif text-accent">for a better digital world.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted md:text-xl">
            I’m Ankit Pal, a full-stack software engineer focused on robust backend systems, modern applications and
            practical AI-powered products.
          </p>

          <m.div variants={container} initial="hidden" animate="show">
            <m.div variants={item} className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink href="#projects" icon={<ArrowRight className="size-4" aria-hidden />}>
                Explore My Work
              </ButtonLink>
              {contactLinks.resume ? (
                <ButtonLink href={contactLinks.resume} variant="secondary" target="_blank" rel="noreferrer">
                  <FileText className="size-4" aria-hidden /> View Resume
                </ButtonLink>
              ) : (
                <MissingConfig label="View Resume" variable="VITE_RESUME_URL" />
              )}
              <ButtonLink href="#contact" variant="ghost">
                Let’s Connect
              </ButtonLink>
            </m.div>

            <m.div variants={item} className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.9375rem]">
              <span className="text-subtle">Find me on</span>
              {contactLinks.github && (
                <a href={contactLinks.github} target="_blank" rel="noreferrer" className={socialLink}>
                  <GithubIcon className="size-[1.125rem]" /> GitHub
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
              {contactLinks.linkedin && (
                <a href={contactLinks.linkedin} target="_blank" rel="noreferrer" className={socialLink}>
                  <LinkedinIcon className="size-[1.125rem]" /> LinkedIn
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
              {contactLinks.email && (
                <a href={`mailto:${contactLinks.email}`} className={socialLink}>
                  <Mail className="size-[1.125rem]" aria-hidden /> Email
                </a>
              )}
            </m.div>

            <m.div variants={item} className="mt-12">
              <p className="eyebrow">Selected stack</p>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="Selected technologies">
                {heroTechnologies.map((tech) => (
                  <li key={tech} className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-fg shadow-sm">
                    {tech}
                  </li>
                ))}
              </ul>
            </m.div>
          </m.div>
        </div>

        <m.figure
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative min-w-0 lg:col-span-6"
        >
          <div className="relative h-[300px] overflow-hidden rounded-3xl border border-line bg-[linear-gradient(160deg,#ffffff,#eef2f8)] shadow-lift sm:h-[420px] lg:h-[560px]">
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(to_right,rgb(15_23_42/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(15_23_42/0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]"
            />
            <div className="absolute inset-0 p-4 sm:p-6">
              <HeroScene />
            </div>
          </div>
          <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-subtle">
            <span>The system stack I build with — hover a component.</span>
            <a href="#playground" className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline">
              Explore it interactively <ArrowRight className="size-3.5" aria-hidden />
            </a>
          </figcaption>
        </m.figure>
      </div>
    </section>
  )
}
