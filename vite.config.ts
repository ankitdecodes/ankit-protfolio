/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Production builds warn when contact links are missing, so an unconfigured site
// doesn't ship silently. Missing links are hidden in the UI, never faked.
function contactConfigCheck(env: Record<string, string>): Plugin {
  const keys = ['VITE_CONTACT_EMAIL', 'VITE_LINKEDIN_URL', 'VITE_GITHUB_URL', 'VITE_RESUME_URL']
  return {
    name: 'contact-config-check',
    apply: 'build',
    buildStart() {
      const missing = keys.filter((k) => !env[k]?.trim())
      if (missing.length) this.warn(`Not configured (hidden on the site): ${missing.join(', ')}. See .env.example.`)
    },
  }
}

// Preload the fonts used by the hero headline so they don't swap in late and shift layout.
function preloadHeroFonts(base: string): Plugin {
  const wanted = [/geist-latin-wght-normal-[^/]+\.woff2$/, /instrument-serif-latin-400-italic-[^/]+\.woff2$/]
  return {
    name: 'preload-hero-fonts',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      const files = Object.keys(ctx.bundle ?? {}).filter((f) => wanted.some((re) => re.test(f)))
      return {
        html,
        tags: files.map((f) => ({
          tag: 'link',
          attrs: { rel: 'preload', href: `${base}${f}`, as: 'font', type: 'font/woff2', crossorigin: '' },
          injectTo: 'head',
        })),
      }
    },
  }
}

// When VITE_SITE_URL is set, emit a canonical link and absolute social image URLs.
function siteUrl(url: string | undefined): Plugin {
  return {
    name: 'site-url',
    // Run after Vite has applied `base`, so the og:image path may already be prefixed.
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (!url) return html
        const base = url.replace(/\/$/, '')
        return html
          .replace(/content="[^"]*\/og-image\.png"/g, `content="${base}/og-image.png"`)
          .replace('</title>', `</title>\n    <link rel="canonical" href="${base}/" />\n    <meta property="og:url" content="${base}/" />`)
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  // Sub-path hosting (e.g. GitHub Pages project sites serve from /<repo>/).
  const base = env.VITE_BASE?.trim() || '/'
  return {
    base,
    plugins: [react(), tailwindcss(), siteUrl(env.VITE_SITE_URL), contactConfigCheck(env), preloadHeroFonts(base)],
    // three.js (~565 kB, ~140 kB gzip) is its own lazy chunk, fetched after idle
    // and only on devices that render the 3D hero — so its size is expected.
    build: { chunkSizeWarningLimit: 600 },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
