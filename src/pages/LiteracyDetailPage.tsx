import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import type { LiteracyActivity } from '@/types/database'

const formSchema = z.object({
  answer: z.string().min(10, 'Minimal 10 karakter'),
})

type FormData = z.infer<typeof formSchema>

export function LiteracyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: activity, isLoading } = useQuery({
    queryKey: ['literacy-activity', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('literacy_activities').select('*').eq('id', id!).single()
      if (error) throw error
      return data as LiteracyActivity
    },
    enabled: !!id,
  })

  const { data: existing } = useQuery({
    queryKey: ['submission', id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('activity_submissions')
        .select('*')
        .eq('activity_id', id!)
        .eq('user_id', user!.id)
        .maybeSingle()
      return data
    },
    enabled: !!id && !!user?.id,
  })

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const content =
        activity?.type === 'quiz'
          ? { answer: data.answer }
          : activity?.type === 'reading_log'
            ? { log: data.answer }
            : { review: data.answer }

      if (existing) {
        const { error } = await supabase
          .from('activity_submissions')
          .update({ content, status: 'pending' })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('activity_submissions').insert({
          activity_id: id!,
          user_id: user!.id,
          content,
          status: 'pending',
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Jawaban terkirim! Menunggu persetujuan admin.')
      queryClient.invalidateQueries({ queryKey: ['submission', id] })
      navigate('/literacy')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Gagal mengirim'),
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (!activity) return <p>Aktivitas tidak ditemukan</p>

  const labels: Record<string, string> = {
    quiz: 'Jawaban Kuis',
    reading_log: 'Log Membaca (min. 50 kata)',
    review: 'Resensi Buku',
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali
      </Button>

      <div>
        <Badge className="mb-2">+{activity.points_reward} poin</Badge>
        <h1 className="text-2xl font-bold">{activity.title}</h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">{activity.description}</p>
      </div>

      {existing && (
        <div className="rounded-lg border bg-amber-50 p-4 text-sm">
          Status pengiriman: <strong>{existing.status}</strong>
          {existing.status === 'approved' && ` · ${existing.points_awarded} poin diterima`}
        </div>
      )}

      {existing?.status === 'approved' ? null : (
        <form onSubmit={handleSubmit((d) => submitMutation.mutate(d))} className="space-y-4">
          <div>
            <Label htmlFor="answer">{labels[activity.type]}</Label>
            {activity.type === 'quiz' ? (
              <Input id="answer" className="mt-1" {...register('answer')} />
            ) : (
              <Textarea id="answer" rows={6} className="mt-1" {...register('answer')} />
            )}
            {errors.answer && <p className="mt-1 text-xs text-red-500">{errors.answer.message}</p>}
          </div>
          <Button type="submit" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? 'Mengirim...' : existing ? 'Perbarui Jawaban' : 'Kirim Jawaban'}
          </Button>
        </form>
      )}
    </div>
  )
}
