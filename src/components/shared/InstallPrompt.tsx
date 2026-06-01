import { Download, Loader2, Share } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { dismissInstallPrompt, isAppInstalled, wasInstallDismissed } from '@/lib/pwa-install'

export function InstallPrompt() {
  const { installed, ios, nativeSupported, canNativeInstall, install } = usePwaInstall()
  const [open, setOpen] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [installError, setInstallError] = useState(false)

  const dismiss = useCallback(() => {
    dismissInstallPrompt()
    setOpen(false)
  }, [])

  useEffect(() => {
    if (installed || isAppInstalled()) return
    if (wasInstallDismissed()) return
    if (localStorage.getItem('literasiku-pwa-install-dismissed')) return

    const timer = window.setTimeout(() => setOpen(true), 500)
    return () => window.clearTimeout(timer)
  }, [installed])

  const handleInstall = async () => {
    if (ios) return
    setInstalling(true)
    setInstallError(false)
    const outcome = await install()
    setInstalling(false)

    if (outcome === 'accepted') {
      setOpen(false)
      return
    }

    if (outcome === 'dismissed') {
      setOpen(false)
      return
    }

    setInstallError(true)
  }

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setOpen(true)
      return
    }
    dismiss()
  }

  if (installed) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent onClose={dismiss}>
        <DialogHeader>
          <DialogTitle className="pr-8">Install Literasiku</DialogTitle>
          <DialogDescription>
            {ios
              ? 'Tambahkan ke Layar Utama — tidak perlu buka pengaturan browser.'
              : 'Pasang aplikasi sekali ketuk. Dialog install browser akan muncul otomatis.'}
          </DialogDescription>
        </DialogHeader>

        {ios ? (
          <>
            <ol className="mt-4 space-y-3 text-sm text-[var(--color-muted-foreground)]">
              <li className="flex items-start gap-3 rounded-lg bg-teal-50 p-3">
                <Share className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-primary)]" />
                <span>
                  Ketuk <strong>Bagikan</strong> <span className="text-slate-400">(kotak + panah)</span> di
                  bilah bawah Safari
                </span>
              </li>
              <li className="rounded-lg bg-teal-50 p-3 pl-4">
                Gulir ke bawah, pilih <strong>Tambahkan ke Layar Utama</strong>, lalu{' '}
                <strong>Tambah</strong>
              </li>
            </ol>
            <Button className="mt-4 w-full" variant="outline" onClick={dismiss}>
              Nanti saja
            </Button>
          </>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-3">
              <Button
                className="w-full"
                size="lg"
                onClick={handleInstall}
                disabled={installing}
              >
                {installing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Membuka dialog install…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Install sekarang
                  </>
                )}
              </Button>
              {!canNativeInstall && nativeSupported && !installing && (
                <p className="text-center text-xs text-[var(--color-muted-foreground)]">
                  Menunggu browser… tombol di atas akan membuka popup install resmi Chrome.
                </p>
              )}
              {installError && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
                  Jika popup tidak muncul, ketuk ikon <strong>Install</strong> atau{' '}
                  <strong>⊕</strong> di bilah alamat browser (bukan menu Pengaturan).
                </p>
              )}
            </div>
            <Button className="w-full" variant="outline" onClick={dismiss}>
              Nanti saja
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
