import { useQuery } from '@tanstack/react-query'
import { BookOpen, FileText, Sparkles, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [books, pdfs, members, gurus, activities] = await Promise.all([
        supabase.from('books').select('id', { count: 'exact', head: true }),
        supabase.from('books').select('id', { count: 'exact', head: true }).not('pdf_url', 'is', null),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'member'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'guru'),
        supabase.from('literacy_activities').select('id', { count: 'exact', head: true }).eq('active', true),
      ])
      return {
        books: books.count ?? 0,
        pdfs: pdfs.count ?? 0,
        members: members.count ?? 0,
        gurus: gurus.count ?? 0,
        activities: activities.count ?? 0,
      }
    },
  })

  const cards = [
    { label: 'Total Buku', value: stats?.books, icon: BookOpen, color: 'text-teal-600' },
    { label: 'Buku dengan PDF', value: stats?.pdfs, icon: FileText, color: 'text-blue-600' },
    { label: 'Siswa', value: stats?.members, icon: Users, color: 'text-violet-600' },
    { label: 'Guru', value: stats?.gurus, icon: Users, color: 'text-amber-600' },
    { label: 'Aktivitas Aktif', value: stats?.activities, icon: Sparkles, color: 'text-emerald-600' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Admin</h1>
        <p className="text-[var(--color-muted-foreground)]">Ringkasan perpustakaan digital</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[var(--color-muted-foreground)]">
                {label}
              </CardTitle>
              <Icon className={`h-5 w-5 ${color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold">{value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
