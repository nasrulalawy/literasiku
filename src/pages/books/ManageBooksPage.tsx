import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, FileText } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { uploadToBucket } from '@/lib/upload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { Book } from '@/types/database'

const bookSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  author: z.string().min(1, 'Penulis wajib diisi'),
  isbn: z.string().optional(),
  category: z.string().min(1),
  description: z.string().optional(),
  published_year: z.number().optional(),
})

type BookForm = z.infer<typeof bookSchema>

export function ManageBooksPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Book | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  const { data: books, isLoading } = useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const { data, error } = await supabase.from('books').select('*').order('title')
      if (error) throw error
      return data as Book[]
    },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BookForm>({
    resolver: zodResolver(bookSchema),
    defaultValues: { category: 'Umum' },
  })

  const openCreate = () => {
    setEditing(null)
    setCoverFile(null)
    setPdfFile(null)
    reset({ title: '', author: '', category: 'Umum', isbn: '', description: '' })
    setOpen(true)
  }

  const openEdit = (book: Book) => {
    setEditing(book)
    setCoverFile(null)
    setPdfFile(null)
    reset({
      title: book.title,
      author: book.author,
      isbn: book.isbn ?? '',
      category: book.category,
      description: book.description ?? '',
      published_year: book.published_year ?? undefined,
    })
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (form: BookForm) => {
      if (!editing && !pdfFile) {
        throw new Error('File PDF wajib diunggah untuk buku baru')
      }

      const payload = {
        title: form.title,
        author: form.author,
        isbn: form.isbn || null,
        category: form.category,
        description: form.description || null,
        published_year: form.published_year || null,
        created_by: user!.id,
      }

      let bookId = editing?.id

      if (editing) {
        const { error } = await supabase.from('books').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('books').insert(payload).select().single()
        if (error) throw error
        bookId = data.id
      }

      if (!bookId) throw new Error('Gagal menyimpan buku')

      const updates: Partial<Book> = {}

      if (pdfFile) {
        if (pdfFile.type !== 'application/pdf') throw new Error('Hanya file PDF yang diperbolehkan')
        updates.pdf_url = await uploadToBucket('book-pdfs', `${bookId}.pdf`, pdfFile)
      }

      if (coverFile) {
        const ext = coverFile.name.split('.').pop() || 'jpg'
        updates.cover_url = await uploadToBucket('book-covers', `${bookId}.${ext}`, coverFile)
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('books').update(updates).eq('id', bookId)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Buku diperbarui' : 'Buku digital ditambahkan')
      queryClient.invalidateQueries({ queryKey: ['books'] })
      setOpen(false)
      setPdfFile(null)
      setCoverFile(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Gagal menyimpan'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('books').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Buku dihapus')
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Gagal menghapus'),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kelola Buku Digital</h1>
          <p className="text-[var(--color-muted-foreground)]">
            Unggah PDF — tidak ada batas stok, semua siswa bisa membaca
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Buku
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-[var(--color-muted)]">
                <th className="p-3 text-left">Judul</th>
                <th className="p-3 text-left hidden sm:table-cell">Penulis</th>
                <th className="p-3 text-left">PDF</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {books?.map((book) => (
                <tr key={book.id} className="border-b">
                  <td className="p-3 font-medium">{book.title}</td>
                  <td className="p-3 hidden sm:table-cell text-[var(--color-muted-foreground)]">
                    {book.author}
                  </td>
                  <td className="p-3">
                    {book.pdf_url ? (
                      <Badge variant="success">Tersedia</Badge>
                    ) : (
                      <Badge variant="warning">Belum ada PDF</Badge>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(book)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Hapus buku ini?')) deleteMutation.mutate(book.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Buku Digital' : 'Tambah Buku Digital'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="mt-4 space-y-3">
            <div>
              <Label>Judul</Label>
              <Input className="mt-1" {...register('title')} />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div>
              <Label>Penulis</Label>
              <Input className="mt-1" {...register('author')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kategori</Label>
                <Input className="mt-1" {...register('category')} />
              </div>
              <div>
                <Label>Tahun Terbit</Label>
                <Input type="number" className="mt-1" {...register('published_year', { valueAsNumber: true })} />
              </div>
            </div>
            <div>
              <Label>ISBN (opsional)</Label>
              <Input className="mt-1" {...register('isbn')} />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea className="mt-1" {...register('description')} />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                File PDF {editing ? '(kosongkan jika tidak diubah)' : '(wajib)'}
              </Label>
              <Input
                type="file"
                accept="application/pdf"
                className="mt-1"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label>Cover (opsional)</Label>
              <Input
                type="file"
                accept="image/*"
                className="mt-1"
                onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              Simpan
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
