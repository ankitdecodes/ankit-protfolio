import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LazyMotion, domAnimation } from 'motion/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { DistributedLab } from './DistributedLab'
import { FinancialIntegrity } from './FinancialIntegrity'
import { ReliableAsync } from './ReliableAsync'

const wrap = (ui: ReactNode) => render(<LazyMotion features={domAnimation}>{ui}</LazyMotion>)
const user = () => userEvent.setup()
const bucket = (label: string, scope: HTMLElement) => within(scope).getAllByText(label)[0]!.nextElementSibling!.textContent

describe('Financial Transaction Integrity', () => {
  it('credits the wallet once through the outbox, even when the event is duplicated', async () => {
    wrap(<FinancialIntegrity />)
    const u = user()
    const payout = screen.getByRole('heading', { name: 'Lead-to-wallet payout' }).closest('div.overflow-hidden') as HTMLElement
    await u.click(within(payout).getByRole('button', { name: 'Create lead' }))
    await u.click(within(payout).getByRole('button', { name: 'Approve lead (MIS)' }))
    await u.click(within(payout).getByRole('button', { name: 'Run worker tick' }))
    expect(bucket('Available', payout)).toContain('₹2,500')
    await u.click(within(payout).getByRole('button', { name: 'Simulate duplicate' }))
    expect(within(payout).getByText('Duplicate event — three different things')).toBeInTheDocument()
    expect(bucket('Available', payout)).toContain('₹2,500')
  })

  it('shows a lost update without locks and the correct total with them', async () => {
    wrap(<FinancialIntegrity />)
    await user().click(screen.getByRole('button', { name: 'Simulate concurrent requests' }))
    expect(screen.getByText(/lost update/)).toBeInTheDocument()
    expect(screen.getByText('With pessimistic_write (my implementation)')).toBeInTheDocument()
  })

  it('runs the redeem lifecycle and enforces roles', async () => {
    wrap(<FinancialIntegrity />)
    const u = user()
    const redeem = screen.getByRole('heading', { name: 'Agent redeem lifecycle' }).closest('div.overflow-hidden') as HTMLElement
    await u.click(within(redeem).getByRole('button', { name: /Create redeem request/ }))
    expect(bucket('Available', redeem)).toContain('₹700')
    expect(bucket('Under review', redeem)).toContain('₹300')
    await u.click(within(redeem).getByRole('button', { name: 'Finance tries to approve' }))
    expect(within(redeem).getAllByText('Only MIS team can approve redeem requests').length).toBeGreaterThan(0)
    await u.click(within(redeem).getByRole('button', { name: 'MIS approve' }))
    await u.click(within(redeem).getByRole('button', { name: 'Finance mark paid' }))
    expect(bucket('Available', redeem)).toContain('₹700')
    expect(bucket('Lifetime redeemed', redeem)).toContain('₹300')
    expect(within(redeem).getByText(/does not perform a bank transfer/)).toBeInTheDocument()
  })
})

describe('Reliable Asynchronous Architecture', () => {
  it('processes an outbox event to DONE and retries failures with backoff', async () => {
    wrap(<ReliableAsync />)
    const u = user()
    await u.click(screen.getByRole('button', { name: /Create outbox event/ }))
    await u.click(screen.getByRole('button', { name: 'Fail next attempt' }))
    await u.click(screen.getByRole('button', { name: 'Process (worker tick)' }))
    const table = screen.getAllByRole('table')[0]!
    expect(within(table).getByText('PENDING')).toBeInTheDocument()
    await u.click(screen.getByRole('button', { name: 'Retry event' }))
    expect(within(table).getByText('DONE')).toBeInTheDocument()
  })

  it('inspects an event and shows its idempotency key', async () => {
    wrap(<ReliableAsync />)
    const u = user()
    await u.click(screen.getByRole('button', { name: /Create outbox event/ }))
    await u.click(screen.getByRole('button', { name: 'evt-001' }))
    expect(screen.getByText('lead:LD-31001:approved:c1')).toBeInTheDocument()
  })
})

describe('Distributed Systems Laboratory', () => {
  it('compensates when the wallet service fails', async () => {
    wrap(<DistributedLab />)
    const u = user()
    await u.selectOptions(screen.getByLabelText('Target service'), 'wallet')
    await u.click(screen.getByRole('button', { name: 'Inject service failure' }))
    await u.click(screen.getByRole('button', { name: /Start workflow/ }))
    expect(screen.getAllByText('Failed → compensated').length).toBeGreaterThan(0)
    expect(screen.getByText(/First failing span/)).toBeInTheDocument()
  })
})
