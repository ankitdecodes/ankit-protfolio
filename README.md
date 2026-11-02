# Ankit Pal — Portfolio

Personal portfolio for Ankit Pal, Full-Stack Software Engineer & Applied AI Engineer. It's a single-page React app with:

- a lazy-loaded **Three.js** system map in the hero, with an SVG fallback;
- an **Engineering Playground** with three experiences, each driven by a pure, tested state machine in `src/lib/sim/`:
  - **Financial Transaction Integrity**: payout via outbox, duplicate and concurrency protection, and the redeem
    hold → confirm/release → PAID lifecycle.
  - **Reliable Asynchronous Architecture**: transactional outbox and a database-polling worker, with retries, stale
    reclaim and alerts.
  - **Distributed Systems Lab**: sagas, circuit breakers and OpenTelemetry-style traces.

  Every panel is labelled *implemented in my backend*, *simulated from my architecture* or *conceptual*. Money is
  integer paise. The architecture explorer and the in-browser query engine (scan vs index) remain as extra demos.
- an **AI Lab**: TF-IDF retrieval with a PCA embedding map, a groundedness (hallucination) check, a tool-calling
  agent trace, a tiny neural network trained in the browser, and explainable anomaly scoring.

Everything is computed in the browser. There's no backend, and no paid or external AI APIs.

## Stack

- React 19 + TypeScript (strict) on Vite 8
- Tailwind CSS 4. Design tokens live in `src/index.css`. The site is light-first (warm `#F8F7F4`, navy text, a
  periwinkle accent, lavender for AI and coral as a secondary accent). Wrapping any element in `.theme-dark`
  re-themes everything inside it to navy; the Engineering Playground, the AI Lab and the project previews use this.
- Motion for React (`LazyMotion` + `domAnimation`), honours `prefers-reduced-motion`
- Three.js (only the hero scene; its own lazy chunk)
- Lucide icons. Fonts are self-hosted: Geist for UI text, Geist Mono for technical labels, and Instrument Serif for a few italic accents only.
- Vitest + Testing Library, oxlint

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — fill in contact details
npm run dev                  # http://localhost:5173
```

## Scripts

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Dev server with hot reload                    |
| `npm run typecheck` | TypeScript project build (`tsc -b`)           |
| `npm run lint`      | oxlint                                        |
| `npm test`          | Unit and component tests (Vitest, jsdom)      |
| `npm run build`     | Type-check and production build to `dist/`    |
| `npm run preview`   | Serve the production build locally            |
| `npm run check`     | Typecheck, lint, test and build, all in one   |

## Environment variables

All variables are optional. If one isn't set, the matching link, button or form isn't rendered, so the site never
shows placeholder URLs. See `.env.example`.

In development, a missing link shows as a dashed, disabled pill naming its variable. A production build prints a
warning that lists every contact variable that isn't set.

| Variable             | Effect                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| `VITE_CONTACT_EMAIL` | Email link, copy button and the mailto-based contact composer          |
| `VITE_LINKEDIN_URL`  | LinkedIn link in the contact section                                   |
| `VITE_GITHUB_URL`    | GitHub link in the contact section                                     |
| `VITE_RESUME_URL`    | Resume buttons in nav, hero and contact (e.g. `/resume.pdf` in `public/`) |
| `VITE_LOCATION`      | Location line in the About section                                     |
| `VITE_SITE_URL`      | Adds a canonical URL and absolute `og:image` URLs at build time        |

The contact form doesn't send anything itself. It opens the visitor's email app with the message pre-filled and says
so on the page. To accept messages directly, connect a form provider in `src/components/ContactSection.tsx`.

## Editing content

All copy lives in typed files under `src/content/`. Components only render it.

- `site.ts`: name, roles, nav, hero technologies, lifecycle stages, links (from env)
- `projects.ts`: project case studies. To add a project, append an object.
  - `mode: 'design'` labels the work as planned ("Planned architecture", "Open design questions"). `'delivered'` labels it as shipped work.
  - `features[].status` is `completed` | `in-progress` | `planned`. FinPilot AI features are all `planned` until they ship.
  - Leave `results` empty unless you have measured numbers. `resultsNote` explains why it's empty.
  - `repository` is `private` | `public` | `none`. Never add a link to a private repository, because it 404s for visitors.
  - `testing` lists real tests (or a plan, for `design` projects). `verification` says how the claims were checked.
  - Add `links` only when a public demo or repository exists.
- `projects.ts` → `otherContributions`: smaller verified contributions, shown as compact cards
  - `visual` can be `{ kind: 'image', src, alt, width, height }` for real screenshots (put them in `public/`).
- `capabilities.ts`: skills by evidence tier (`production`, `hands-on`, `foundational`), target roles in priority
  order, and the About section's approach pillars. Change a skill's level here and the UI follows.
- `corpus.ts`: the AI Lab's retrieval corpus (built from the project content) and the evaluation examples
- `experience.ts`: timeline entries. Add `organisation`, job titles and education here once confirmed.
- `lab.ts`: architecture explorer nodes, edges, flows, and the synthetic transactions for the AI Lab

The anomaly scoring logic lives in `src/lib/anomaly.ts`. It's a transparent, rule-weighted score used for
demonstration, not a trained model, and the UI says so.

## 3D hero and performance

`src/components/hero/scene3d.ts` is loaded with a dynamic import after the browser is idle. The static SVG diagram is
shown first, and it stays on screen in these cases:

- reduced motion
- no WebGL
- a software renderer (SwiftShader, llvmpipe)
- low core count or memory
- Save-Data

A frame-rate watchdog also tears the scene down if the device can't sustain ~30 fps. In development, add `?scene=force`
to the URL to skip these checks.

The Playground and AI Lab are code-split. They mount only as they near the viewport, or when someone navigates to an
in-page anchor.

## Deployment

The live site is deployed to GitHub Pages at **https://ankitdecodes.github.io/ankit-protfolio/** by
`.github/workflows/deploy.yml`. Every push to `main` runs typecheck, lint, tests and the production build, and
deploys only if all of them pass. The workflow sets `VITE_BASE` and `VITE_SITE_URL` for you.

One-time setup on GitHub:

1. Go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.
2. Optionally, add contact links under **Settings → Secrets and variables → Actions → Variables**: `VITE_CONTACT_EMAIL`,
   `VITE_LINKEDIN_URL`, `VITE_GITHUB_URL`, `VITE_RESUME_URL` and `VITE_LOCATION`. Re-run the workflow (Actions → Deploy
   to GitHub Pages → Run workflow) to apply them.
3. For the resume, commit the PDF to `public/resume.pdf` and set `VITE_RESUME_URL=/resume.pdf`. Paths that start with
   `/` resolve against the deploy base automatically.

`npm run build` outputs a plain static site to `dist/`, so it also runs on Vercel, Netlify or Cloudflare Pages. Set the
same variables there; `VITE_BASE` can stay unset when the site is served from the domain root.

## Project structure

```
src/
  content/       typed content (projects, skills, experience, lab data)
  lib/           pure, tested logic: anomaly, rag, nn, agent, queryplan, jobqueue, hooks
  components/    Navigation, Hero, About, ProjectShowcase, Skills, ExperienceTimeline,
                 ContactSection, Footer, DeferredSection
    hero/        HeroScene (fallback + loader), scene3d (Three.js)
    playground/  PlaygroundSection, QueryExplorer, JobQueueExplorer
    lab/         LabSection, Retrieval/Evaluation/Agent/Inference/Anomaly explorers, ArchitectureExplorer
    ui/          primitives (ButtonLink, Tag, SectionHeading, Reveal), brand icons
  test/          Vitest setup
```
