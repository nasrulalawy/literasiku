import { Link } from 'react-router-dom'
import { BookOpen, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Book } from '@/types/database'

export function BookCard({ book }: { book: Book }) {
  return (
    <Link to={`/books/${book.id}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="aspect-[3/4] bg-[var(--color-muted)]">
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <BookOpen className="h-10 w-10 text-[var(--color-muted-foreground)]" />
              <FileText className="h-6 w-6 text-[var(--color-primary)]" />
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="line-clamp-2 font-semibold leading-tight">{book.title}</h3>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{book.author}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="secondary">{book.category}</Badge>
            <Badge variant={book.pdf_url ? 'success' : 'warning'}>
              {book.pdf_url ? 'PDF' : 'Tanpa PDF'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
