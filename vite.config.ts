/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

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
    plugins: [react(), tailwindcss(), siteUrl(env.VITE_SITE_URL), preloadHeroFonts(base)],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
