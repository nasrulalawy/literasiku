import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { LiteracyActivity, ActivitySubmission } from '@/types/database'

const activitySchema = z.object({
  title: z.string().min(1),
  type: z.enum(['quiz', 'reading_log', 'review']),
  description: z.string().min(1),
  points_reward: z.number().min(1),
  active: z.boolean(),
})

type ActivityForm = z.infer<typeof activitySchema>

export function AdminLiteracyPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LiteracyActivity | null>(null)

  const { data: activities } = useQuery({
    queryKey: ['admin-literacy'],
    queryFn: async () => {
      const { data, error } = await supabase.from('literacy_activities').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as LiteracyActivity[]
    },
  })

  const { data: submissions } = useQuery({
    queryKey: ['admin-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_submissions')
        .select('*, activity:literacy_activities(title), profile:profiles(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (ActivitySubmission & {
        activity: { title: string }
        profile: { full_name: string }
      })[]
    },
  })

  const { register, handleSubmit, reset } = useForm<ActivityForm>({
    resolver: zodResolver(activitySchema),
    defaultValues: { type: 'reading_log', points_reward: 10, active: true },
  })

  const openCreate = () => {
    setEditing(null)
    reset({ title: '', type: 'reading_log', description: '', points_reward: 10, active: true })
    setOpen(true)
  }

  const openEdit = (act: LiteracyActivity) => {
    setEditing(act)
    reset({
      title: act.title,
      type: act.type,
      description: act.description,
      points_reward: act.points_reward,
      active: act.active,
    })
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (form: ActivityForm) => {
      if (editing) {
        const { error } = await supabase.from('literacy_activities').update(form).eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('literacy_activities').insert(form)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Aktivitas disimpan')
      queryClient.invalidateQueries({ queryKey: ['admin-literacy'] })
      setOpen(false)
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('activity_submissions').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Submission ditinjau')
      queryClient.invalidateQueries({ queryKey: ['admin-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['literacy-activities'] })
    },
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kelola Literasi</h1>
          <p className="text-[var(--color-muted-foreground)]">Aktivitas dan persetujuan submission</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Aktivitas
        </Button>
      </div>

      {submissions && submissions.length > 0 && (
        <section>
          <h2 className="mb-3 font-semibold">Menunggu Persetujuan ({submissions.length})</h2>
          <div className="space-y-2">
            {submissions.map((sub) => (
              <Card key={sub.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{sub.activity?.title}</p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">{sub.profile?.full_name}</p>
                    <p className="mt-1 text-xs line-clamp-2">
                      {JSON.stringify(sub.content)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => reviewMutation.mutate({ id: sub.id, status: 'approved' })}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reviewMutation.mutate({ id: sub.id, status: 'rejected' })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-semibold">Daftar Aktivitas</h2>
        <div className="space-y-2">
          {activities?.map((act) => (
            <Card key={act.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{act.title}</p>
                  <Badge variant="secondary" className="mt-1">
                    +{act.points_reward} poin · {act.active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(act)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Aktivitas' : 'Tambah Aktivitas'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="mt-4 space-y-3">
            <div>
              <Label>Judul</Label>
              <Input className="mt-1" {...register('title')} />
            </div>
            <div>
              <Label>Tipe</Label>
              <Select className="mt-1" {...register('type')}>
                <option value="reading_log">Log Membaca</option>
                <option value="review">Resensi</option>
                <option value="quiz">Kuis</option>
              </Select>
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea className="mt-1" {...register('description')} />
            </div>
            <div>
              <Label>Poin Reward</Label>
              <Input type="number" className="mt-1" {...register('points_reward', { valueAsNumber: true })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('active')} />
              Aktif
            </label>
            <Button type="submit" className="w-full">Simpan</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
