import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { BookCard } from '@/components/books/BookCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { AdInfeed } from '@/components/ads/AdSenseUnit'
import { useShowAds } from '@/hooks/useShowAds'
import { Library } from 'lucide-react'
import type { Book } from '@/types/database'

export function CatalogPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const showAds = useShowAds()

  const { data: books, isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const { data, error } = await supabase.from('books').select('*').order('title')
      if (error) throw error
      return data as Book[]
    },
  })

  const categories = useMemo(() => {
    if (!books) return []
    return [...new Set(books.map((b) => b.category))].sort()
  }, [books])

  const filtered = useMemo(() => {
    if (!books) return []
    return books.filter((b) => {
      const matchSearch =
        !search ||
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author.toLowerCase().includes(search.toLowerCase())
      const matchCat = !category || b.category === category
      return matchSearch && matchCat
    })
  }, [books, search, category])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Perpustakaan Digital</h1>
        <p className="text-[var(--color-muted-foreground)]">Baca buku PDF langsung di aplikasi</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <Input
            placeholder="Cari judul atau penulis..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-48">
          <option value="">Semua kategori</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {showAds && <AdInfeed />}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Buku tidak ditemukan"
          description="Coba ubah kata kunci atau filter kategori."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  )
}
