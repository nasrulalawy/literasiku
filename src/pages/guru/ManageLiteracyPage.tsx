import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Check, X, FileText, Users } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { uploadToBucket } from '@/lib/upload'
import { parseQuizQuestions } from '@/lib/literacy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { QuizQuestionEditor } from '@/components/literacy/QuizQuestionEditor'
import type { LiteracyActivity, ActivitySubmission, QuizQuestion } from '@/types/database'

const moduleSchema = z.object({
  title: z.string().min(1, 'Judul wajib'),
  description: z.string().min(1, 'Deskripsi wajib'),
  reading_text: z.string().optional(),
  assignment_prompt: z.string().min(1, 'Instruksi tugas wajib'),
  points_reward: z.number().min(1),
  max_score: z.number().min(1).max(100),
  active: z.boolean(),
})

type ModuleForm = z.infer<typeof moduleSchema>

export function ManageLiteracyPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LiteracyActivity | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [materialFile, setMaterialFile] = useState<File | null>(null)
  const [gradingId, setGradingId] = useState<string | null>(null)
  const [gradeScore, setGradeScore] = useState(0)
  const [gradeFeedback, setGradeFeedback] = useState('')

  const { data: modules } = useQuery({
    queryKey: ['guru-literacy', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('literacy_activities')
        .select('*')
        .eq('type', 'literacy_module')
        .eq('created_by', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as LiteracyActivity[]).map((m) => ({
        ...m,
        quiz_questions: parseQuizQuestions(m.quiz_questions),
      }))
    },
    enabled: !!user?.id,
  })

  const { data: submissions } = useQuery({
    queryKey: ['guru-literacy-submissions', user?.id],
    queryFn: async () => {
      const { data: mods, error: modErr } = await supabase
        .from('literacy_activities')
        .select('id')
        .eq('created_by', user!.id)
        .eq('type', 'literacy_module')
      if (modErr) throw modErr
      const ids = mods?.map((m) => m.id) ?? []
      if (!ids.length) return []

      const { data, error } = await supabase
        .from('activity_submissions')
        .select('*, activity:literacy_activities(title), profile:profiles(full_name)')
        .in('activity_id', ids)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as (ActivitySubmission & {
        activity: { title: string }
        profile: { full_name: string }
      })[]
    },
    enabled: !!user?.id,
  })

  const { register, handleSubmit, reset } = useForm<ModuleForm>({
    resolver: zodResolver(moduleSchema),
    defaultValues: { points_reward: 20, max_score: 100, active: true },
  })

  const openCreate = () => {
    setEditing(null)
    setQuestions([])
    setMaterialFile(null)
    reset({
      title: '',
      description: '',
      reading_text: '',
      assignment_prompt: '',
      points_reward: 20,
      max_score: 100,
      active: true,
    })
    setOpen(true)
  }

  const openEdit = (mod: LiteracyActivity) => {
    setEditing(mod)
    setQuestions(parseQuizQuestions(mod.quiz_questions))
    setMaterialFile(null)
    reset({
      title: mod.title,
      description: mod.description,
      reading_text: mod.reading_text ?? '',
      assignment_prompt: mod.assignment_prompt ?? '',
      points_reward: mod.points_reward,
      max_score: mod.max_score,
      active: mod.active,
    })
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (form: ModuleForm) => {
      const validQuestions = questions.filter((q) => q.question.trim() && q.options.some((o) => o.trim()))
      const payload = {
        title: form.title,
        type: 'literacy_module' as const,
        description: form.description,
        reading_text: form.reading_text || null,
        assignment_prompt: form.assignment_prompt,
        quiz_questions: validQuestions,
        points_reward: form.points_reward,
        max_score: form.max_score,
        active: form.active,
        created_by: user!.id,
      }

      let moduleId = editing?.id

      if (editing) {
        const { error } = await supabase.from('literacy_activities').update(payload).eq('id', editing.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('literacy_activities').insert(payload).select().single()
        if (error) throw error
        moduleId = data.id
      }

      if (materialFile && moduleId) {
        const ext = materialFile.name.split('.').pop() || 'pdf'
        const url = await uploadToBucket('literacy-files', `${moduleId}/material.${ext}`, materialFile)
        const { error } = await supabase.from('literacy_activities').update({ content_url: url }).eq('id', moduleId)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Modul literasi disimpan')
      queryClient.invalidateQueries({ queryKey: ['guru-literacy'] })
      queryClient.invalidateQueries({ queryKey: ['literacy-activities'] })
      setOpen(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Gagal menyimpan'),
  })

  const gradeMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      score,
      feedback,
    }: {
      id: string
      status: 'approved' | 'rejected'
      score: number
      feedback: string
    }) => {
      const { error } = await supabase
        .from('activity_submissions')
        .update({
          status,
          score,
          feedback: feedback || null,
          graded_by: user!.id,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Penilaian disimpan')
      setGradingId(null)
      queryClient.invalidateQueries({ queryKey: ['guru-literacy-submissions'] })
    },
  })

  const startGrade = (sub: ActivitySubmission) => {
    const quizScore = sub.content.quiz_score ?? 0
    setGradingId(sub.id)
    setGradeScore(sub.score ?? quizScore)
    setGradeFeedback(sub.feedback ?? '')
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kelola Literasi</h1>
          <p className="text-[var(--color-muted-foreground)]">
            Buat materi, kuis & tugas — tinjau pengumpulan siswa
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Modul Baru
        </Button>
      </div>

      {submissions && submissions.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Users className="h-5 w-5" />
            Tugas Menunggu Review ({submissions.length})
          </h2>
          <div className="space-y-3">
            {submissions.map((sub) => (
              <Card key={sub.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{sub.activity?.title}</p>
                      <p className="text-sm text-[var(--color-muted-foreground)]">{sub.profile?.full_name}</p>
                    </div>
                    <Badge variant="secondary">Kuis: {sub.content.quiz_score ?? 0}/100</Badge>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <p className="font-medium text-xs text-[var(--color-muted-foreground)]">Jawaban Tugas</p>
                    <p className="mt-1 whitespace-pre-wrap">{sub.content.assignment_answer || '—'}</p>
                  </div>
                  {gradingId === sub.id ? (
                    <div className="space-y-2 border-t pt-3">
                      <div>
                        <Label>Skor Literasi (0–100)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="mt-1"
                          value={gradeScore}
                          onChange={(e) => setGradeScore(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Feedback (opsional)</Label>
                        <Textarea
                          className="mt-1"
                          rows={2}
                          value={gradeFeedback}
                          onChange={(e) => setGradeFeedback(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            gradeMutation.mutate({
                              id: sub.id,
                              status: 'approved',
                              score: gradeScore,
                              feedback: gradeFeedback,
                            })
                          }
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            gradeMutation.mutate({
                              id: sub.id,
                              status: 'rejected',
                              score: gradeScore,
                              feedback: gradeFeedback,
                            })
                          }
                        >
                          <X className="mr-1 h-4 w-4" />
                          Tolak
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setGradingId(null)}>
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => startGrade(sub)}>
                      Nilai & Review
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-semibold">Modul Literasi Saya</h2>
        <div className="space-y-2">
          {!modules?.length && (
            <p className="text-sm text-[var(--color-muted-foreground)]">Belum ada modul. Buat modul pertama.</p>
          )}
          {modules?.map((mod) => (
            <Card key={mod.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{mod.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="secondary">+{mod.points_reward} poin</Badge>
                    <Badge variant="outline">{mod.quiz_questions.length} soal kuis</Badge>
                    {mod.content_url && (
                      <Badge variant="outline">
                        <FileText className="mr-1 h-3 w-3" />
                        Materi
                      </Badge>
                    )}
                    <Badge>{mod.active ? 'Aktif' : 'Nonaktif'}</Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(mod)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onClose={() => setOpen(false)} className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Modul Literasi' : 'Modul Literasi Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="mt-4 space-y-4">
            <div>
              <Label>Judul</Label>
              <Input className="mt-1" {...register('title')} />
            </div>
            <div>
              <Label>Deskripsi singkat</Label>
              <Textarea className="mt-1" rows={2} {...register('description')} />
            </div>
            <div>
              <Label>Materi bacaan (teks)</Label>
              <Textarea className="mt-1" rows={4} placeholder="Isi materi literasi..." {...register('reading_text')} />
            </div>
            <div>
              <Label>Upload materi (PDF, opsional)</Label>
              <Input
                type="file"
                accept=".pdf,image/*"
                className="mt-1"
                onChange={(e) => setMaterialFile(e.target.files?.[0] ?? null)}
              />
              {editing?.content_url && !materialFile && (
                <a href={editing.content_url} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-[var(--color-primary)]">
                  Lihat materi saat ini
                </a>
              )}
            </div>
            <QuizQuestionEditor questions={questions} onChange={setQuestions} />
            <div>
              <Label>Instruksi tugas</Label>
              <Textarea
                className="mt-1"
                rows={3}
                placeholder="Contoh: Tulis ringkasan 100 kata tentang materi di atas..."
                {...register('assignment_prompt')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Poin reward</Label>
                <Input type="number" className="mt-1" {...register('points_reward', { valueAsNumber: true })} />
              </div>
              <div>
                <Label>Skor maksimum</Label>
                <Input type="number" className="mt-1" {...register('max_score', { valueAsNumber: true })} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('active')} />
              Aktif untuk siswa
            </label>
            <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Modul'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
