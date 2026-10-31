// Money in the simulators is integer paise. Never floats.

export type Paise = number

export const rupees = (r: number): Paise => Math.round(r * 100)

export function formatINR(p: Paise): string {
  const sign = p < 0 ? '−' : ''
  const abs = Math.abs(p)
  const whole = Math.trunc(abs / 100).toLocaleString('en-IN')
  const fraction = abs % 100
  return `${sign}₹${whole}${fraction ? `.${String(fraction).padStart(2, '0')}` : ''}`
}

export function assertPaise(n: number): void {
  if (!Number.isInteger(n)) throw new Error(`Amount must be integer paise, got ${n}`)
}
