// Pacing for scripted scenarios: visible step-by-step, instant under reduced motion.
export const delay = (ms: number) => new Promise((r) => window.setTimeout(r, ms))
export const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
