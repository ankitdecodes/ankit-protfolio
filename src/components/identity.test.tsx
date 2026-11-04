import { render, screen } from '@testing-library/react'
import { LazyMotion, domAnimation } from 'motion/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { contactLinks } from '../content/site'
import { ExperienceTimeline } from './ExperienceTimeline'
import { Hero } from './Hero'
import { ProfileCard } from './ProfileCard'
import userEvent from '@testing-library/user-event'

const wrap = (ui: ReactNode) => render(<LazyMotion features={domAnimation}>{ui}</LazyMotion>)

describe('identity and experience', () => {
  it('ships real contact links by default and a resume path under the deploy base', () => {
    expect(contactLinks.email).toBe('321ankitpal@gmail.com')
    expect(contactLinks.linkedin).toBe('https://www.linkedin.com/in/ankit-pal-318913288/')
    expect(contactLinks.github).toBe('https://github.com/ankitdecodes')
    expect(contactLinks.resume).toMatch(/\/resume\.pdf$/)
  })

  it('links the resume and profiles from the hero', () => {
    wrap(<Hero />)
    expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute('href', 'https://github.com/ankitdecodes')
    expect(screen.getByRole('link', { name: /View Resume/ })).toHaveAttribute('href', expect.stringMatching(/resume\.pdf$/))
  })

  it('lists real roles, dates and education', () => {
    wrap(<ExperienceTimeline />)
    expect(screen.getByRole('heading', { name: 'Full Stack Developer' })).toBeInTheDocument()
    expect(screen.getByText('May 2025 — Present')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Full Stack Developer Intern' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'B.E. in Data Science' })).toBeInTheDocument()
  })

  it('opens a LinkedIn-style profile photo viewer from the avatar and closes it again', async () => {
    wrap(<ProfileCard />)
    const user = userEvent.setup()
    const dialog = document.querySelector('dialog')!
    expect(dialog.open).toBe(false)
    await user.click(screen.getByRole('button', { name: /View Ankit Pal’s profile photo/ }))
    expect(dialog.open).toBe(true)
    expect(screen.getByRole('heading', { name: 'Profile photo' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Profile photo of Ankit Pal' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close profile photo' }))
    expect(dialog.open).toBe(false)
  })
})
