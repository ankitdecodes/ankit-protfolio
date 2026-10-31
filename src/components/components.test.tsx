import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LazyMotion, domAnimation } from 'motion/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { sampleTransactions } from '../content/lab'
import { SIGNALS, evaluate, scoreTransaction, type SignalId } from '../lib/anomaly'
import { buildChannels } from './channels'
import { ContactSection } from './ContactSection'
import { AnomalyExplorer } from './lab/AnomalyExplorer'
import { ArchitectureExplorer } from './lab/ArchitectureExplorer'
import { ProjectShowcase } from './ProjectShowcase'
import { SkillsSection } from './Skills'
import LabSection from './lab/LabSection'
import { QueryExplorer } from './playground/QueryExplorer'

const wrap = (ui: ReactNode) => render(<LazyMotion features={domAnimation}>{ui}</LazyMotion>)
const empty = { email: null, linkedin: null, github: null, resume: null }

describe('AnomalyExplorer', () => {
  it('flags fewer transactions as the threshold rises', () => {
    wrap(<AnomalyExplorer />)
    const list = screen.getByRole('list', { name: 'Sample transactions' })
    const flaggedAt = () => within(list).queryAllByText('flagged', { exact: true }).length
    const before = flaggedAt()
    fireEvent.change(screen.getByLabelText('Alert threshold'), { target: { value: '0.7' } })
    expect(flaggedAt()).toBeLessThan(before)
  })

  it('shows evidence for the selected transaction', async () => {
    wrap(<AnomalyExplorer />)
    await userEvent.click(screen.getByRole('button', { name: /TX-1052/ }))
    expect(screen.getByText(/Initiated at 03:55/)).toBeInTheDocument()
  })

  it('derives displayed precision and recall from the dataset at the current threshold', () => {
    wrap(<AnomalyExplorer />)
    fireEvent.change(screen.getByLabelText('Alert threshold'), { target: { value: '0.3' } })
    const all = new Set<SignalId>(SIGNALS.map((s) => s.id))
    const expected = evaluate(sampleTransactions.map((tx) => scoreTransaction(tx, all)), 0.3)
    const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`)
    expect(screen.getByText('Precision').nextElementSibling).toHaveTextContent(pct(expected.precision))
    expect(screen.getByText('Recall').nextElementSibling).toHaveTextContent(pct(expected.recall))
    expect(screen.getByText('False alarms').nextElementSibling).toHaveTextContent(String(expected.falsePositives))
  })

  it('removes a signal from the evidence when switched off', async () => {
    wrap(<AnomalyExplorer />)
    expect(screen.getByText('First time this device has been seen on the account.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: /New device/ }))
    expect(screen.queryByText('First time this device has been seen on the account.')).not.toBeInTheDocument()
  })
})

describe('ArchitectureExplorer', () => {
  it('reveals details for a selected component', async () => {
    wrap(<ArchitectureExplorer />)
    await userEvent.click(screen.getByRole('button', { name: /Job queue/ }))
    expect(await screen.findByText(/handlers must be idempotent/)).toBeInTheDocument()
  })

  it('selects components with the keyboard', async () => {
    wrap(<ArchitectureExplorer />)
    screen.getByRole('button', { name: /PostgreSQL/ }).focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: /PostgreSQL/ })).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByText(/System of record/)).toBeInTheDocument()
  })

  it('steps through a request trace', async () => {
    wrap(<ArchitectureExplorer />)
    await userEvent.click(screen.getByRole('button', { name: 'Trace: Bulk import' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('button', { current: 'step' })).toHaveTextContent('An import job is enqueued')
  })
})

describe('SkillsSection', () => {
  it('labels every skill with its evidence tier', () => {
    wrap(<SkillsSection />)
    const backend = screen.getByRole('list', { name: 'Backend skills' })
    expect(within(backend).getByText('NestJS').closest('li')).toHaveTextContent('(Production)')
    expect(within(backend).getByText('Kafka').closest('li')).toHaveTextContent('(Hands-on)')
    const java = screen.getByRole('list', { name: 'Java skills' })
    expect(within(java).getByText('Spring Security').closest('li')).toHaveTextContent('(Foundational)')
  })

  it('states that Java is a secondary track without professional experience', () => {
    wrap(<SkillsSection />)
    expect(screen.getByText(/No professional Java experience yet/)).toBeInTheDocument()
    expect(screen.getByText('Java Backend Developer (junior)')).toBeInTheDocument()
  })
})

describe('LabSection', () => {
  it('switches demos with arrow keys', async () => {
    wrap(<LabSection />)
    screen.getByRole('tab', { name: /RAG & embeddings/ }).focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /AI evaluation/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('groundedness.eval')).toBeInTheDocument()
  })

  it('retrieves cited answers from the portfolio corpus', async () => {
    wrap(<LabSection />)
    await userEvent.click(screen.getByRole('button', { name: 'How are credit bureau failures handled?' }))
    expect(screen.getAllByText(/Q Finance/).length).toBeGreaterThan(0)
  })

  it('runs the agent and shows a tool call trace', async () => {
    wrap(<LabSection />)
    await userEvent.click(screen.getByRole('tab', { name: /Tool calling/ }))
    expect(await screen.findByText(/₹10,624/)).toBeInTheDocument()
  })
})

describe('Playground', () => {
  it('runs a query as a full scan and then with an index', async () => {
    wrap(<QueryExplorer />)
    await userEvent.click(screen.getByRole('button', { name: /Run query/ }))
    expect(await screen.findByText('ALL')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: /Use an index/ }))
    await userEvent.click(screen.getByRole('button', { name: /Run query/ }))
    expect(await screen.findByText('ref')).toBeInTheDocument()
  }, 20_000)

})

describe('ProjectShowcase', () => {
  const openCaseStudy = async (projectName: RegExp) => {
    const card = screen.getByRole('article', { name: projectName })
    await userEvent.click(within(card).getByRole('button', { name: 'Read full case study' }))
    return card
  }

  it('labels planned work honestly', async () => {
    wrap(<ProjectShowcase />)
    const card = await openCaseStudy(/FinPilot AI/)
    expect(within(card).getByText('Planned architecture')).toBeInTheDocument()
    expect(within(card).getByText('Testing plan')).toBeInTheDocument()
    expect(within(card).getAllByText('Planned').length).toBeGreaterThan(0)
    expect(within(card).getByText('No public build yet')).toBeInTheDocument()
  })

  it('shows testing, verification and no fabricated results for delivered work', async () => {
    wrap(<ProjectShowcase />)
    const card = await openCaseStudy(/Q Finance/)
    expect(within(card).getByText('Testing & reliability')).toBeInTheDocument()
    expect(within(card).getByText(/How this was verified/)).toBeInTheDocument()
    expect(within(card).getByText(/No usage, revenue or performance figures/)).toBeInTheDocument()
  })

  it('never links to private repositories and opens external links safely', () => {
    wrap(<ProjectShowcase />)
    const links = screen.getAllByRole('link')
    expect(links.some((a) => a.getAttribute('href')?.includes('github.com'))).toBe(false)
    for (const a of links.filter((l) => l.getAttribute('target') === '_blank')) {
      expect(a).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
    }
  })

  it('lists smaller contributions separately', () => {
    wrap(<ProjectShowcase />)
    expect(screen.getByRole('heading', { name: 'Auto-Loan Operations Dashboard' })).toBeInTheDocument()
  })
})

describe('ContactSection', () => {
  it('renders only configured channels', () => {
    expect(buildChannels(empty)).toHaveLength(0)
    expect(buildChannels({ ...empty, github: 'https://github.com/someone' }).map((c) => c.id)).toEqual(['github'])
  })

  it('hides the form when no email is configured', () => {
    wrap(<ContactSection links={empty} />)
    expect(screen.queryByRole('button', { name: /Compose email/ })).not.toBeInTheDocument()
  })

  it('shows a mailto composer when an email is configured', () => {
    wrap(<ContactSection links={{ ...empty, email: 'test@example.com' }} />)
    expect(screen.getByRole('button', { name: /Compose email/ })).toBeInTheDocument()
    expect(screen.getByText(/nothing is sent from this page/)).toBeInTheDocument()
  })
})
