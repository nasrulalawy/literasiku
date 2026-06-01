export const PWA_INSTALL_DISMISS_KEY = 'literasiku-pwa-install-dismissed'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __deferredPwaPrompt?: BeforeInstallPromptEvent | null
  }
}

export const PWA_INSTALL_READY_EVENT = 'pwa-installready'

export function isAppInstalled(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** Chrome, Edge, Opera, Samsung — mendukung beforeinstallprompt */
export function supportsNativePwaInstall(): boolean {
  const ua = navigator.userAgent
  return (
    /Chrome|Chromium|Edg|OPR|SamsungBrowser/i.test(ua) &&
    !/Firefox|FxiOS/i.test(ua) &&
    !isIosDevice()
  )
}

export function wasInstallDismissed(): boolean {
  return sessionStorage.getItem(PWA_INSTALL_DISMISS_KEY) === '1'
}

export function dismissInstallPrompt(): void {
  sessionStorage.setItem(PWA_INSTALL_DISMISS_KEY, '1')
}

export function markInstallPromptHandled(): void {
  localStorage.setItem(PWA_INSTALL_DISMISS_KEY, '1')
  sessionStorage.setItem(PWA_INSTALL_DISMISS_KEY, '1')
}

export function stashDeferredPrompt(event: Event): BeforeInstallPromptEvent {
  const promptEvent = event as BeforeInstallPromptEvent
  event.preventDefault()
  window.__deferredPwaPrompt = promptEvent
  window.dispatchEvent(new Event(PWA_INSTALL_READY_EVENT))
  return promptEvent
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return window.__deferredPwaPrompt ?? null
}

export function clearDeferredPrompt(): void {
  window.__deferredPwaPrompt = null
}

/** Tunggu event beforeinstallprompt (maks. timeoutMs) */
export function waitForDeferredPrompt(timeoutMs = 8000): Promise<BeforeInstallPromptEvent | null> {
  const existing = getDeferredPrompt()
  if (existing) return Promise.resolve(existing)

  return new Promise((resolve) => {
    const onReady = () => {
      cleanup()
      resolve(getDeferredPrompt())
    }
    const timer = window.setTimeout(() => {
      cleanup()
      resolve(getDeferredPrompt())
    }, timeoutMs)

    const cleanup = () => {
      window.clearTimeout(timer)
      window.removeEventListener(PWA_INSTALL_READY_EVENT, onReady)
      window.removeEventListener('beforeinstallprompt', onNative)
    }

    const onNative = (e: Event) => {
      cleanup()
      resolve(stashDeferredPrompt(e))
    }

    window.addEventListener(PWA_INSTALL_READY_EVENT, onReady)
    window.addEventListener('beforeinstallprompt', onNative)
  })
}

export async function triggerNativeInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const promptEvent = getDeferredPrompt() ?? (await waitForDeferredPrompt(3000))
  if (!promptEvent) return 'unavailable'

  await promptEvent.prompt()
  const { outcome } = await promptEvent.userChoice
  clearDeferredPrompt()

  if (outcome === 'accepted') {
    markInstallPromptHandled()
  }
  return outcome
}
