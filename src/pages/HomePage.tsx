import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronRight, Library, Sparkles, Trophy } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { BookCard } from '@/components/books/BookCard'

export function HomePage() {
  const { profile } = useAuth()

  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ['books-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .not('pdf_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(4)
      if (error) throw error
      return data
    },
  })

  const { data: activities, isLoading: actLoading } = useQuery({
    queryKey: ['literacy-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('literacy_activities')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(3)
      if (error) throw error
      return data
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Halo, {profile?.full_name?.split(' ')[0]}!</h1>
        <p className="text-[var(--color-muted-foreground)]">
          Perpustakaan digital — baca buku PDF kapan saja
        </p>
      </div>

      <Card className="bg-gradient-to-br from-teal-500 to-teal-700 text-white">
        <CardContent className="flex items-center gap-4 p-6">
          <Trophy className="h-12 w-12 opacity-90" />
          <div>
            <p className="text-sm opacity-90">Total Poin Literasi</p>
            <p className="text-3xl font-bold">{profile?.points ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Buku Terbaru</h2>
          <Link to="/catalog" className="flex items-center text-sm text-[var(--color-primary)]">
            Lihat semua <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {booksLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full" />
            ))}
          </div>
        ) : books?.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-[var(--color-muted-foreground)]">
              <Library className="h-8 w-8 shrink-0" />
              Belum ada buku digital. Cek kembali nanti.
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Aktivitas Literasi</h2>
          <Link to="/literacy" className="flex items-center text-sm text-[var(--color-primary)]">
            Lihat semua <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {actLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="space-y-2">
            {activities?.map((act) => (
              <Link key={act.id} to={`/literacy/${act.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardHeader className="flex flex-row items-center gap-3 p-4">
                    <Sparkles className="h-8 w-8 text-[var(--color-primary)]" />
                    <div className="flex-1">
                      <CardTitle className="text-base">{act.title}</CardTitle>
                      <p className="text-xs text-[var(--color-muted-foreground)] line-clamp-1">
                        {act.description}
                      </p>
                    </div>
                    <Badge>+{act.points_reward}</Badge>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
