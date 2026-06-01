import { Link, Navigate } from 'react-router-dom'
import { BookOpen, FileText, GraduationCap, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { homePathForRole } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { AdBanner } from '@/components/ads/AdSenseUnit'
import { useShowLandingAds } from '@/hooks/useShowAds'

export function LandingPage() {
  const { user, profile, loading } = useAuth()
  const showLandingAds = useShowLandingAds()

  if (!loading && user && profile) {
    return <Navigate to={homePathForRole(profile.role)} replace />
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-teal-50 to-slate-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-[var(--color-primary)]" />
          <span className="text-xl font-bold">Literasiku</span>
        </div>
        <div className="flex gap-2">
          <Link to="/login">
            <Button variant="ghost">Masuk</Button>
          </Link>
          <Link to="/register">
            <Button>Daftar</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-16 text-center md:py-24">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
          Perpustakaan Digital
          <span className="block text-[var(--color-primary)]">untuk Sekolah</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--color-muted-foreground)]">
          Guru mengunggah buku PDF. Siswa membaca langsung di browser. Tanpa stok fisik — semua buku
          tersedia digital.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link to="/register">
            <Button size="lg">Daftar sebagai Guru / Siswa</Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="outline">
              Masuk
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 md:grid-cols-3">
        {[
          {
            icon: GraduationCap,
            title: 'Untuk Guru',
            desc: 'Daftar sebagai guru, unggah buku PDF, dan kelola perpustakaan kelas.',
          },
          {
            icon: Users,
            title: 'Untuk Siswa',
            desc: 'Daftar sebagai siswa, baca buku digital, dan kumpulkan poin literasi.',
          },
          {
            icon: FileText,
            title: '100% Digital',
            desc: 'Tidak ada peminjaman fisik atau jumlah stok — baca kapan saja.',
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border bg-white p-6 shadow-sm">
            <Icon className="h-10 w-10 text-[var(--color-primary)]" />
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{desc}</p>
          </div>
        ))}
      </section>

      {showLandingAds && (
        <div className="mx-auto max-w-3xl px-6 pb-8">
          <AdBanner />
        </div>
      )}

      <footer className="border-t bg-white py-8 text-center text-sm text-[var(--color-muted-foreground)]">
        Literasiku &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}
