import { lazy } from 'react'
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react'
import { About } from './components/About'
import { ContactSection } from './components/ContactSection'
import { DeferredSection } from './components/DeferredSection'
import { ExperienceTimeline } from './components/ExperienceTimeline'
import { Footer } from './components/Footer'
import { Hero } from './components/Hero'
import { Navigation } from './components/Navigation'
import { PortraitWatermark } from './components/PortraitWatermark'
import { ProjectShowcase } from './components/ProjectShowcase'
import { SkillsSection } from './components/Skills'

// The interactive demos are code-split so the first paint ships only content.
const PlaygroundSection = lazy(() => import('./components/playground/PlaygroundSection'))
const LabSection = lazy(() => import('./components/lab/LabSection'))

export default function App() {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <a
          href="#main"
          className="sr-only rounded-lg bg-fg px-4 py-2 text-sm font-medium text-bg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
        >
          Skip to content
        </a>
        <PortraitWatermark />
        <Navigation />
        <main id="main">
          <Hero />
          <About />
          <ProjectShowcase />
          <DeferredSection id="playground" label="Engineering playground" component={PlaygroundSection} />
          <DeferredSection id="lab" label="AI Lab" component={LabSection} />
          <SkillsSection />
          <ExperienceTimeline />
          <ContactSection />
        </main>
        <Footer />
      </MotionConfig>
    </LazyMotion>
  )
}
