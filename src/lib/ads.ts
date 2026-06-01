/** AdSense untuk Web/PWA. AdMob SDK tidak mendukung browser/PWA (hanya Android/iOS native). */

export const adsenseClient = import.meta.env.VITE_ADSENSE_CLIENT?.trim() ?? ''
export const adsenseSlotBanner = import.meta.env.VITE_ADSENSE_SLOT_BANNER?.trim() ?? ''
export const adsenseSlotInfeed = import.meta.env.VITE_ADSENSE_SLOT_INFEED?.trim() ?? adsenseSlotBanner

export function isAdsConfigured() {
  return Boolean(adsenseClient && adsenseSlotBanner)
}

let scriptPromise: Promise<void> | null = null

export function loadAdSenseScript(): Promise<void> {
  if (!adsenseClient) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-adsense-client="${adsenseClient}"]`)
    if (existing) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.async = true
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`
    script.crossOrigin = 'anonymous'
    script.setAttribute('data-adsense-client', adsenseClient)
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Gagal memuat script AdSense'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export function pushAdUnit() {
  try {
    window.adsbygoogle = window.adsbygoogle ?? []
    window.adsbygoogle.push({})
  } catch {
    // Ad blockers / CSP
  }
}
