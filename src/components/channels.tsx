import type { ReactNode } from 'react'
import { FileText, Mail } from 'lucide-react'
import type { ContactLinks } from '../content/site'
import { GithubIcon, LinkedinIcon } from './ui/brand-icons'

export interface Channel {
  id: string
  label: string
  value: string
  href: string
  icon: ReactNode
  external: boolean
}

export function buildChannels(links: ContactLinks): Channel[] {
  const channels: Channel[] = []
  if (links.email)
    channels.push({ id: 'email', label: 'Email', value: links.email, href: `mailto:${links.email}`, icon: <Mail className="size-5" aria-hidden />, external: false })
  if (links.linkedin)
    channels.push({ id: 'linkedin', label: 'LinkedIn', value: prettyUrl(links.linkedin), href: links.linkedin, icon: <LinkedinIcon className="size-5" />, external: true })
  if (links.github)
    channels.push({ id: 'github', label: 'GitHub', value: prettyUrl(links.github), href: links.github, icon: <GithubIcon className="size-5" />, external: true })
  if (links.resume)
    channels.push({ id: 'resume', label: 'Resume', value: 'View or download', href: links.resume, icon: <FileText className="size-5" aria-hidden />, external: true })
  return channels
}

function prettyUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
}

