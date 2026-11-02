// Personal details and links. Anything not yet confirmed is read from environment
// variables (see README) and stays hidden in the UI until it is provided.

const env = import.meta.env

function optional(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export const profile = {
  name: 'Ankit Pal',
  initials: 'AP',
  roles: ['Full-Stack Software Engineer', 'Applied AI Engineer'],
  statement:
    'I build intelligent products, robust backend systems and digital experiences that solve real-world problems.',
  location: optional(env.VITE_LOCATION),
}

/** Site-relative paths like /resume.pdf resolve against the deploy base (e.g. /ankit-protfolio/). */
function sitePath(value: string | null): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return value
  return `${env.BASE_URL.replace(/\/$/, '')}${value}`
}

export const contactLinks = {
  email: optional(env.VITE_CONTACT_EMAIL),
  linkedin: optional(env.VITE_LINKEDIN_URL),
  github: optional(env.VITE_GITHUB_URL),
  resume: sitePath(optional(env.VITE_RESUME_URL)),
}

export type ContactLinks = typeof contactLinks

export const navItems = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'playground', label: 'Engineering' },
  { id: 'lab', label: 'AI Lab' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'contact', label: 'Contact' },
] as const

export const heroTechnologies = ['NestJS', 'Node.js', 'TypeScript', 'Next.js', 'MySQL', 'Redis', 'Flutter', 'Docker', 'Python']

/** Recent work surfaced in the hero. Each links to its case study. */
export const heroProof = [
  { href: '#finpilot-ai', label: 'FinPilot AI', detail: 'Java · Spring Boot · anomaly detection', status: 'In progress' },
  { href: '#q-platform', label: 'Q', detail: 'Credit reports, recommendations, payments', status: 'Live product' },
  { href: '#lead-payout-platform', label: 'Lead & payout', detail: 'Queued imports, payout services', status: 'Team codebase' },
  { href: '#partner-apps', label: 'Partner apps', detail: 'Flutter · FinqyHub & CashKey', status: 'Mobile' },
]
