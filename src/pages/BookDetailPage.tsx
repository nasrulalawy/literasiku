import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, ArrowLeft, Download, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Book } from '@/types/database'

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { canManageBooks } = useAuth()

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('books').select('*').eq('id', id!).single()
      if (error) throw error
      return data as Book
    },
    enabled: !!id,
  })

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (!book) return <p>Buku tidak ditemukan</p>

  const hasPdf = Boolean(book.pdf_url)

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-[var(--color-muted)]">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2">
                <BookOpen className="h-16 w-16 text-[var(--color-muted-foreground)]" />
                <FileText className="h-8 w-8 text-[var(--color-primary)]" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Badge variant="secondary">{book.category}</Badge>
            <Badge variant="success">Buku Digital</Badge>
            <h1 className="text-2xl font-bold">{book.title}</h1>
            <p className="text-lg text-[var(--color-muted-foreground)]">{book.author}</p>
            {book.isbn && <p className="text-sm">ISBN: {book.isbn}</p>}
            {book.published_year && <p className="text-sm">Tahun: {book.published_year}</p>}
            {book.description && (
              <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">{book.description}</p>
            )}
            {hasPdf && (
              <a
                href={book.pdf_url!}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--color-muted)]"
              >
                <Download className="h-4 w-4" />
                Unduh PDF
              </a>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {hasPdf ? (
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="border-b bg-[var(--color-muted)] px-4 py-2 text-sm font-medium">
                Pembaca PDF
              </div>
              <iframe
                src={book.pdf_url!}
                title={book.title}
                className="h-[70vh] w-full min-h-[400px]"
              />
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-white p-8 text-center">
              <FileText className="h-12 w-12 text-[var(--color-muted-foreground)]" />
              <p className="mt-4 font-medium">PDF belum diunggah</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {canManageBooks
                  ? 'Unggah PDF melalui menu Kelola Buku.'
                  : 'Hubungi guru untuk mengunggah file buku ini.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
