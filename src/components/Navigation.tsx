import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { contactLinks, navItems, profile } from '../content/site'
import { useActiveSection, useScrolled } from '../lib/hooks'
import { ProfileCard } from './ProfileCard'
import { GithubIcon, LinkedinIcon } from './ui/brand-icons'

const sectionIds = navItems.map((item) => item.id)

const socials = [
  { href: contactLinks.github, label: 'GitHub', Icon: GithubIcon },
  { href: contactLinks.linkedin, label: 'LinkedIn', Icon: LinkedinIcon },
].filter((s): s is { href: string; label: string; Icon: typeof GithubIcon } => !!s.href)

export function Navigation() {
  const active = useActiveSection(sectionIds)
  const scrolled = useScrolled()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector('a')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (!menuRef.current?.contains(target) && !toggleRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <nav
        aria-label="Primary"
        className={`relative mx-auto flex h-16 max-w-[80rem] items-center justify-between rounded-2xl border px-3 transition-[background-color,border-color,box-shadow] duration-300 sm:px-4 ${
          scrolled || open
            ? 'border-line bg-surface/90 shadow-[0_8px_30px_-12px_rgb(15_23_42/0.18)] backdrop-blur-xl'
            : 'border-transparent bg-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <ProfileCard />
          <a href="#top" className="hidden rounded-lg pr-2 text-[0.9375rem] font-semibold text-fg sm:inline">
            {profile.name}
            <span className="sr-only"> — back to top</span>
          </a>
        </div>

        <ul className="hidden items-center gap-0.5 lg:flex">
          {navItems.map((item) => {
            const isActive = active === item.id
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={isActive ? 'location' : undefined}
                  className={`rounded-lg px-3 py-2 text-[0.9375rem] font-medium transition-colors ${
                    isActive ? 'bg-accent text-white' : 'text-muted hover:bg-surface-2 hover:text-fg'
                  }`}
                >
                  {item.label}
                </a>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-1">
          {socials.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={`${label} (opens in a new tab)`}
              className="hidden size-10 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg sm:grid"
            >
              <Icon className="size-[1.125rem]" />
            </a>
          ))}
          {contactLinks.resume ? (
            <a
              href={contactLinks.resume}
              target="_blank"
              rel="noreferrer"
              className="ml-1 hidden h-10 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-[#3446d6] sm:inline-flex"
            >
              Resume <ArrowUpRight className="size-4" aria-hidden />
            </a>
          ) : (
            <a
              href="#contact"
              className="ml-1 hidden h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-[#3446d6] sm:inline-flex"
            >
              Let’s talk
            </a>
          )}
          <button
            ref={toggleRef}
            type="button"
            className="grid size-11 place-items-center rounded-lg text-fg hover:bg-surface-2 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>

        <div
          id="mobile-menu"
          ref={menuRef}
          hidden={!open}
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] rounded-2xl border border-line bg-surface p-2 shadow-lift lg:hidden"
        >
          <ul className="grid sm:grid-cols-2">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={() => setOpen(false)}
                  aria-current={active === item.id ? 'location' : undefined}
                  className="flex h-12 items-center rounded-xl px-4 text-base font-medium text-fg hover:bg-surface-2 aria-[current=location]:text-accent"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line p-2 pt-3">
            {contactLinks.resume && (
              <a
                href={contactLinks.resume}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-white"
              >
                Resume <ArrowUpRight className="size-4" aria-hidden />
              </a>
            )}
            {socials.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted hover:bg-surface-2"
              >
                <Icon className="size-4" /> {label}
              </a>
            ))}
            {!contactLinks.resume && socials.length === 0 && (
              <a href="#contact" onClick={() => setOpen(false)} className="inline-flex h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white">
                Let’s talk
              </a>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
