import type { ReactNode } from 'react'
import { Tag } from '../ui/primitives'

/** Shared chrome for every AI Lab demo: name, honesty badge and a limitations note. */
export function LabFrame({ name, badge, note, children }: { name: string; badge: string; note: string; children: ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-6">
        <span className="font-mono text-xs text-muted">{name}</span>
        <Tag tone="ai">{badge}</Tag>
      </div>
      {children}
      <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-subtle sm:px-6">
        <span className="font-mono text-muted">Limitations · </span>
        {note}
      </p>
    </div>
  )
}
