/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTACT_EMAIL?: string
  readonly VITE_LINKEDIN_URL?: string
  readonly VITE_GITHUB_URL?: string
  readonly VITE_RESUME_URL?: string
  readonly VITE_LOCATION?: string
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
