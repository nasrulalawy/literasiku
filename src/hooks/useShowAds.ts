import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isAdsConfigured } from '@/lib/ads'

const AUTH_PATHS = ['/login', '/register']
const STAFF_PREFIXES = ['/admin', '/guru']

/** Iklan untuk siswa & halaman publik — bukan di panel guru/admin */
export function useShowAds() {
  const { pathname } = useLocation()
  const { isGuru, isAdmin, loading } = useAuth()

  if (!isAdsConfigured() || loading) return false
  if (AUTH_PATHS.includes(pathname)) return false
  if (isGuru || isAdmin) return false
  if (STAFF_PREFIXES.some((p) => pathname.startsWith(p))) return false

  return true
}

/** Iklan di landing (pengunjung belum login) */
export function useShowLandingAds() {
  const { pathname } = useLocation()
  const { user, loading } = useAuth()

  if (!isAdsConfigured() || loading || user) return false
  return pathname === '/'
}
