import { render, screen } from '@testing-library/react'
import { LazyMotion, domAnimation } from 'motion/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { contactLinks } from '../content/site'
import { ExperienceTimeline } from './ExperienceTimeline'
import { Hero } from './Hero'

const wrap = (ui: ReactNode) => render(<LazyMotion features={domAnimation}>{ui}</LazyMotion>)

describe('identity and experience', () => {
  it('ships real contact links by default and a resume path under the deploy base', () => {
    expect(contactLinks.email).toBe('321ankitpal@gmail.com')
    expect(contactLinks.linkedin).toBe('https://www.linkedin.com/in/ankit-pal-318913288/')
    expect(contactLinks.github).toBe('https://github.com/ankitdecodes')
    expect(contactLinks.resume).toMatch(/\/resume\.pdf$/)
  })

  it('shows the portrait and open-to-work status in the hero', () => {
    wrap(<Hero />)
    expect(screen.getByRole('img', { name: 'Portrait of Ankit Pal' })).toBeInTheDocument()
    expect(screen.getByText('Open to work')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /View Resume/ })).toHaveAttribute('href', expect.stringMatching(/resume\.pdf$/))
  })

  it('lists real roles, dates and education', () => {
    wrap(<ExperienceTimeline />)
    expect(screen.getByRole('heading', { name: 'Full Stack Developer' })).toBeInTheDocument()
    expect(screen.getByText('May 2025 — Present')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Full Stack Developer Intern' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'B.E. in Data Science' })).toBeInTheDocument()
  })
})
