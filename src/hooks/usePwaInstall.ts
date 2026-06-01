import { useCallback, useEffect, useState } from 'react'
import {
  clearDeferredPrompt,
  getDeferredPrompt,
  isAppInstalled,
  isIosDevice,
  markInstallPromptHandled,
  PWA_INSTALL_READY_EVENT,
  stashDeferredPrompt,
  supportsNativePwaInstall,
  triggerNativeInstall,
  type BeforeInstallPromptEvent,
} from '@/lib/pwa-install'

export function usePwaInstall() {
  const [installed] = useState(isAppInstalled)
  const [ios] = useState(isIosDevice)
  const [nativeSupported] = useState(supportsNativePwaInstall)
  const [canNativeInstall, setCanNativeInstall] = useState(() => !!getDeferredPrompt())

  useEffect(() => {
    if (installed) return

    const onBeforeInstall = (e: Event) => {
      stashDeferredPrompt(e)
      setCanNativeInstall(true)
    }

    const onReady = () => setCanNativeInstall(!!getDeferredPrompt())

    const onAppInstalled = () => {
      markInstallPromptHandled()
      clearDeferredPrompt()
      setCanNativeInstall(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener(PWA_INSTALL_READY_EVENT, onReady)
    window.addEventListener('appinstalled', onAppInstalled)

    if (getDeferredPrompt()) {
      setCanNativeInstall(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener(PWA_INSTALL_READY_EVENT, onReady)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [installed])

  const install = useCallback(async () => {
    if (installed) return 'unavailable' as const
    return triggerNativeInstall()
  }, [installed])

  return {
    installed,
    ios,
    nativeSupported,
    canNativeInstall,
    install,
    hasDeferredPrompt: canNativeInstall,
  }
}

export type { BeforeInstallPromptEvent }
