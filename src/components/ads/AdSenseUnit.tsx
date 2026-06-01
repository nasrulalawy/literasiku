import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { adsenseClient, loadAdSenseScript, pushAdUnit } from '@/lib/ads'

interface AdSenseUnitProps {
  slot: string
  format?: 'auto' | 'horizontal' | 'rectangle' | 'vertical'
  className?: string
  minHeight?: number
}

export function AdSenseUnit({
  slot,
  format = 'auto',
  className,
  minHeight = 90,
}: AdSenseUnitProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const filledRef = useRef(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!adsenseClient || !slot || filledRef.current) return

    let cancelled = false

    loadAdSenseScript()
      .then(() => {
        if (cancelled || filledRef.current || !containerRef.current) return
        filledRef.current = true
        pushAdUnit()
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [slot])

  if (!adsenseClient || !slot || failed) return null

  return (
    <div
      ref={containerRef}
      className={cn(
        'my-4 overflow-hidden rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/50',
        className,
      )}
      style={{ minHeight }}
    >
      <p className="py-1 text-center text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
        Iklan
      </p>
      <ins
        className="adsbygoogle block w-full"
        style={{ display: 'block', minHeight: minHeight - 24 }}
        data-ad-client={adsenseClient}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}

export function AdBanner({ className }: { className?: string }) {
  const slot = import.meta.env.VITE_ADSENSE_SLOT_BANNER
  if (!slot) return null
  return <AdSenseUnit slot={slot} format="horizontal" className={className} minHeight={100} />
}

export function AdInfeed({ className }: { className?: string }) {
  const slot = import.meta.env.VITE_ADSENSE_SLOT_INFEED
  if (!slot) return null
  return <AdSenseUnit slot={slot} format="auto" className={className} minHeight={120} />
}
