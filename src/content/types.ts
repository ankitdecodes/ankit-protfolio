// Typed content models. All copy lives in src/content; components only render it.

export type FeatureStatus = 'completed' | 'in-progress' | 'planned'

export interface ProjectFeature {
  label: string
  status: FeatureStatus
}

export interface ProjectLink {
  kind: 'demo' | 'repo' | 'case-study'
  label: string
  href: string
}

export interface Decision {
  title: string
  detail: string
}

export interface Challenge {
  challenge: string
  solution: string
}

/**
 * `delivered` projects describe shipped work; `design` projects describe intended
 * architecture. The UI changes its headings accordingly so planned work is never
 * presented as finished.
 */
export type CaseStudyMode = 'delivered' | 'design'

export type ProjectVisual =
  | { kind: 'finpilot' }
  | { kind: 'lead-platform' }
  | { kind: 'q-platform' }
  | { kind: 'mobile-apps' }
  | { kind: 'image'; src: string; alt: string; width: number; height: number }

export interface Project {
  id: string
  index: string
  name: string
  tagline: string
  summary: string
  status: { label: string; tone: 'progress' | 'neutral' | 'live' }
  context: string
  mode: CaseStudyMode
  problem: string
  role: string
  contributions: string[]
  features?: ProjectFeature[]
  decisions: Decision[]
  challenges: Challenge[]
  stack: string[]
  /** How tests and reliability were handled. Planned work must say so. */
  testing: string[]
  /** Where the source lives. Private repositories are never linked. */
  repository: 'public' | 'private' | 'none'
  /** How the claims on this card were checked. */
  verification: string
  /** Only measured, verifiable results. Leave empty rather than estimating. */
  results: string[]
  resultsNote?: string
  links: ProjectLink[]
  visual: ProjectVisual
  visualNote: string
  /** Flagship only: the system broken into areas, each with its delivery status. */
  blueprint?: BlueprintArea[]
}

export interface BlueprintArea {
  area: string
  intent: string
  status: FeatureStatus
}

/** A smaller, verified contribution that doesn't warrant a full case study. */
export interface Contribution {
  id: string
  name: string
  context: string
  summary: string
  contributions: string[]
  stack: string[]
  verification: string
  links: ProjectLink[]
}

export interface CapabilityGroup {
  id: string
  title: string
  summary: string
  items: string[]
  evidence: string[]
}

export interface Principle {
  title: string
  detail: string
}

export interface TimelineEntry {
  id: string
  kind: 'work' | 'project' | 'education' | 'milestone'
  period: string
  title: string
  /** Organisation or institution. Omit when not yet confirmed. */
  organisation?: string
  summary: string
  highlights: string[]
  stack?: string[]
  source?: string
}
