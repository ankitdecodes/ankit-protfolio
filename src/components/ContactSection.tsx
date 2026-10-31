import { useState, type FormEvent } from 'react'
import { ArrowUpRight, Check, Copy, Mail } from 'lucide-react'
import { contactLinks, type ContactLinks } from '../content/site'
import { buildChannels, type Channel } from './channels'
import { MissingConfig, Reveal } from './ui/primitives'

const linkVariables: { key: keyof ContactLinks; label: string; variable: string }[] = [
  { key: 'email', label: 'Email', variable: 'VITE_CONTACT_EMAIL' },
  { key: 'linkedin', label: 'LinkedIn', variable: 'VITE_LINKEDIN_URL' },
  { key: 'github', label: 'GitHub', variable: 'VITE_GITHUB_URL' },
  { key: 'resume', label: 'Resume', variable: 'VITE_RESUME_URL' },
]

export function ContactSection({ links = contactLinks }: { links?: ContactLinks }) {
  const channels = buildChannels(links)
  const missingKeys = linkVariables.filter((v) => !links[v.key])

  return (
    <section id="contact" aria-labelledby="contact-title" className="container-page py-20 md:py-28 lg:py-32">
      <div className="relative overflow-hidden rounded-[2rem] bg-surface px-6 py-14 shadow-lift ring-1 ring-line sm:px-10 md:px-16 md:py-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-20 h-96 w-[34rem] max-w-full rounded-full bg-[radial-gradient(closest-side,rgb(82_107_255/0.14),transparent),radial-gradient(closest-side,rgb(255_146_122/0.12),transparent)] blur-2xl"
        />
        <Reveal className="relative max-w-3xl">
          <p className="text-sm font-semibold text-accent">Contact</p>
          <h2 id="contact-title" className="mt-3 text-display font-semibold text-fg">
            Have a meaningful problem <span className="serif text-accent">to solve?</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            I’m interested in backend, full-stack and applied AI roles, and in products where reliability and
            intelligence both matter. Tell me what you’re building.
          </p>
        </Reveal>

        <div className="relative mt-14 grid gap-12 lg:grid-cols-12">
          <div className={links.email ? 'lg:col-span-5' : 'lg:col-span-12'}>
            {channels.length > 0 ? (
              <ul className={`grid gap-3 ${links.email ? '' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
                {channels.map((c) => (
                  <li key={c.id}>
                    <ChannelLink channel={c} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-surface-2 p-5 text-muted">Contact details are being finalised.</p>
            )}
            {missingKeys.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {missingKeys.map((k) => (
                  <MissingConfig key={k.variable} label={k.label} variable={k.variable} />
                ))}
              </div>
            )}
          </div>
          {links.email && (
            <div className="lg:col-span-7">
              <ContactForm email={links.email} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ChannelLink({ channel }: { channel: Channel }) {
  const [copied, setCopied] = useState(false)
  const canCopy = channel.id === 'email' && typeof navigator !== 'undefined' && !!navigator.clipboard

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(channel.value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="group flex items-center gap-2 rounded-xl border border-line bg-bg/40 transition-colors hover:border-line-strong">
      <a
        href={channel.href}
        {...(channel.external ? { target: '_blank', rel: 'noreferrer' } : {})}
        className="flex min-w-0 flex-1 items-center gap-4 rounded-xl p-4"
      >
        <span className="text-muted transition-colors group-hover:text-accent">{channel.icon}</span>
        <span className="min-w-0">
          <span className="block text-sm font-medium text-fg">{channel.label}</span>
          <span className="block truncate font-mono text-xs text-subtle">{channel.value}</span>
        </span>
        {channel.external && <ArrowUpRight className="ml-auto size-4 shrink-0 text-subtle" aria-hidden />}
      </a>
      {canCopy && (
        <button
          type="button"
          onClick={copy}
          className="mr-2 grid size-10 shrink-0 place-items-center rounded-lg text-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          aria-label={copied ? 'Email address copied' : 'Copy email address'}
        >
          {copied ? <Check className="size-4 text-ai" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        </button>
      )}
    </div>
  )
}

const topics = ['A role or opportunity', 'A project collaboration', 'Something else']

function ContactForm({ email }: { email: string }) {
  const [opened, setOpened] = useState(false)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get('name') ?? '').trim()
    const topic = String(data.get('topic') ?? '').trim()
    const message = String(data.get('message') ?? '').trim()
    const subject = `${topic} — from ${name}`
    const body = `${message}\n\n— ${name}`
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setOpened(true)
  }

  const field =
    'mt-2 w-full rounded-xl border border-line bg-bg/60 px-4 text-fg placeholder:text-subtle transition-colors focus:border-accent/60 focus:outline-none focus-visible:outline-2 focus-visible:outline-accent'

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-bg/30 p-5 sm:p-6" aria-describedby="form-note">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm text-muted">
          Your name
          <input name="name" required autoComplete="name" className={`${field} h-12`} />
        </label>
        <label className="block text-sm text-muted">
          Topic
          <select name="topic" className={`${field} h-12 appearance-none`} defaultValue={topics[0]}>
            {topics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-5 block text-sm text-muted">
        Message
        <textarea name="message" required rows={5} className={`${field} resize-y py-3`} />
      </label>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-fg px-5 font-medium text-bg transition-colors hover:bg-accent active:scale-[0.98]"
        >
          <Mail className="size-4" aria-hidden /> Compose email
        </button>
        <p id="form-note" className="text-xs text-subtle" aria-live="polite">
          {opened
            ? `Your email app should now be open with this message. If it didn't open, write to ${email}.`
            : 'Opens your email app with the message pre-filled — nothing is sent from this page.'}
        </p>
      </div>
    </form>
  )
}
