import { ArrowUp } from 'lucide-react'
import { profile } from '../content/site'

const year = new Date().getFullYear()

export function Footer() {
  return (
    <footer className="container-page border-t border-line py-10">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-fg text-sm font-semibold text-white">
            {profile.initials}
          </span>
          <p className="text-sm text-muted">
            © {year} {profile.name}. Designed and engineered with React, TypeScript, Tailwind CSS and Motion.
          </p>
        </div>
        <a href="#top" className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent">
          Back to top <ArrowUp className="size-3.5" aria-hidden />
        </a>
      </div>
    </footer>
  )
}
