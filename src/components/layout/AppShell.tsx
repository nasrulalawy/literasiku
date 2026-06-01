import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  BookOpen,
  Home,
  Library,
  LogOut,
  Sparkles,
  User,
  LayoutDashboard,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { roleLabel } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { AdBanner } from '@/components/ads/AdSenseUnit'
import { useShowAds } from '@/hooks/useShowAds'

const memberNav = [
  { to: '/home', label: 'Beranda', icon: Home },
  { to: '/catalog', label: 'Perpustakaan', icon: Library },
  { to: '/literacy', label: 'Literasi', icon: Sparkles },
  { to: '/profile', label: 'Profil', icon: User },
]

const guruNav = [
  { to: '/catalog', label: 'Perpustakaan', icon: Library },
  { to: '/guru/books', label: 'Kelola Buku', icon: Upload },
  { to: '/guru/literacy', label: 'Literasi', icon: Sparkles },
  { to: '/profile', label: 'Profil', icon: User },
]

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/guru/books', label: 'Buku Digital', icon: BookOpen },
  { to: '/admin/literacy', label: 'Literasi', icon: Sparkles },
  { to: '/profile', label: 'Profil', icon: User },
]

export function AppShell() {
  const location = useLocation()
  const { isAdmin, isGuru, signOut, profile } = useAuth()
  const nav = isAdmin ? adminNav : isGuru ? guruNav : memberNav
  const subtitle = isAdmin ? 'Panel Admin' : isGuru ? 'Panel Guru' : 'Perpustakaan Digital'
  const showAds = useShowAds()

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-64 flex-col border-r border-[var(--color-border)] bg-white md:flex">
        <div className="flex items-center gap-2 border-b p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-[var(--color-primary)]">Literasiku</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">{subtitle}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                location.pathname === to || location.pathname.startsWith(to + '/')
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]'
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-4">
          <p className="truncate text-sm font-medium">{profile?.full_name}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {profile?.role ? roleLabel(profile.role) : ''}
            {!isGuru && !isAdmin && ` · ${profile?.points ?? 0} poin`}
          </p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-[var(--color-primary)]" />
              <span className="font-bold">Literasiku</span>
            </div>
            {profile?.role === 'member' && (
              <span className="rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold">
                {profile.points} poin
              </span>
            )}
          </div>
        </header>

        <main className={cn('flex-1 overflow-auto md:pb-6', showAds ? 'pb-36' : 'pb-20')}>
          <div className="mx-auto max-w-5xl p-4 md:p-6">
            <Outlet />
            {showAds && <AdBanner className="hidden md:block" />}
          </div>
        </main>

        {showAds && (
          <div className="fixed bottom-16 left-0 right-0 z-30 border-t bg-white/95 px-2 py-1 backdrop-blur md:hidden">
            <AdBanner className="my-0 border-0 bg-transparent" />
          </div>
        )}

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white md:hidden">
          <div className="flex justify-around py-2">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to || location.pathname.startsWith(to + '/')
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    'flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium',
                    active ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
