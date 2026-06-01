/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Google AdSense publisher ID (ca-pub-...) — untuk Web/PWA */
  readonly VITE_ADSENSE_CLIENT?: string
  readonly VITE_ADSENSE_SLOT_BANNER?: string
  readonly VITE_ADSENSE_SLOT_INFEED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  adsbygoogle?: Record<string, unknown>[]
}
