import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Check, X, FileText, Users, AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { uploadToBucket } from '@/lib/upload'
import { parseQuizQuestions } from '@/lib/literacy'
import { fetchGuruLiteracySubmissions, formatQuizAnswers, type GuruSubmissionRow } from '@/lib/guru-literacy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QuizQuestionEditor } from '@/components/literacy/QuizQuestionEditor'
import type { LiteracyActivity, QuizQuestion } from '@/types/database'

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
type SubmissionFilter = 'pending' | 'approved' | 'rejected' | 'all'

const statusLabels: Record<string, string> = {
  pending: 'Menunggu nilai',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

function SubmissionCard({
  sub,
  gradingId,
  gradeScore,
  gradeFeedback,
  onStartGrade,
  onCancelGrade,
  onScoreChange,
  onFeedbackChange,
  onApprove,
  onReject,
  grading,
}: {
  sub: GuruSubmissionRow
  gradingId: string | null
  gradeScore: number
  gradeFeedback: string
  onStartGrade: () => void
  onCancelGrade: () => void
  onScoreChange: (n: number) => void
  onFeedbackChange: (s: string) => void
  onApprove: () => void
  onReject: () => void
  grading: boolean
}) {
  const quizLines = formatQuizAnswers(sub.activity.quiz_questions, sub.content.quiz_answers)
  const isGrading = gradingId === sub.id

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{sub.studentName}</p>
            <p className="text-sm text-[var(--color-muted-foreground)]">{sub.activity.title}</p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
              Dikumpulkan: {new Date(sub.created_at).toLocaleString('id-ID')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={sub.status === 'pending' ? 'default' : 'secondary'}>
              {statusLabels[sub.status]}
            </Badge>
            <Badge variant="outline">Kuis otomatis: {sub.content.quiz_score ?? 0}/100</Badge>
            {sub.score != null && sub.status !== 'pending' && (
              <Badge>Skor akhir: {sub.score}/{sub.activity.max_score}</Badge>
            )}
          </div>
        </div>

        {quizLines.length > 0 && (
          <div className="rounded-lg border bg-white p-3 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
              Jawaban Kuis
            </p>
            <ul className="space-y-2">
              {quizLines.map((line, i) => (
                <li key={i}>
                  <p className="font-medium">{line.label}</p>
                  <p className={line.correct ? 'text-green-700' : 'text-red-700'}>
                    → {line.answer} {line.correct ? '✓' : '✗'}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">Jawaban Tugas</p>
          <p className="mt-1 whitespace-pre-wrap">{sub.content.assignment_answer?.trim() || '—'}</p>
        </div>

        {sub.feedback && sub.status !== 'pending' && (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            <span className="font-medium">Feedback: </span>
            {sub.feedback}
          </p>
        )}

        {isGrading ? (
          <div className="space-y-2 border-t pt-3">
            <div>
              <Label>Skor literasi (0–{sub.activity.max_score})</Label>
              <Input
                type="number"
                min={0}
                max={sub.activity.max_score}
                className="mt-1"
                value={gradeScore}
                onChange={(e) => onScoreChange(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                Saran: gabungkan hasil kuis ({sub.content.quiz_score ?? 0}) dengan kualitas tugas.
              </p>
            </div>
            <div>
              <Label>Feedback untuk siswa (opsional)</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={gradeFeedback}
                onChange={(e) => onFeedbackChange(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={grading} onClick={onApprove}>
                <Check className="mr-1 h-4 w-4" />
                Setujui & beri skor
              </Button>
              <Button size="sm" variant="outline" disabled={grading} onClick={onReject}>
                <X className="mr-1 h-4 w-4" />
                Tolak
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelGrade}>
                Batal
              </Button>
            </div>
          </div>
        ) : sub.status === 'pending' ? (
          <Button size="sm" onClick={onStartGrade}>
            Nilai & setujui
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function ManageLiteracyPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LiteracyActivity | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [materialFile, setMaterialFile] = useState<File | null>(null)
  const [submissionFilter, setSubmissionFilter] = useState<SubmissionFilter>('pending')
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

  const {
    data: submissions,
    isLoading: submissionsLoading,
    error: submissionsError,
    refetch: refetchSubmissions,
  } = useQuery({
    queryKey: ['guru-literacy-submissions', user?.id, submissionFilter],
    queryFn: () => fetchGuruLiteracySubmissions(user!.id, submissionFilter),
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
      maxScore,
    }: {
      id: string
      status: 'approved' | 'rejected'
      score: number
      feedback: string
      maxScore: number
    }) => {
      const clamped = Math.max(0, Math.min(maxScore, score))
      const { data, error } = await supabase
        .from('activity_submissions')
        .update({
          status,
          score: clamped,
          feedback: feedback.trim() || null,
          graded_by: user!.id,
        })
        .eq('id', id)
        .select('id, status, score')
        .single()

      if (error) throw error
      if (!data) throw new Error('Tidak ada baris yang diperbarui. Periksa hak akses guru di database.')
      return data
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'approved' ? 'Skor disetujui & poin siswa diperbarui' : 'Pengumpulan ditolak')
      setGradingId(null)
      queryClient.invalidateQueries({ queryKey: ['guru-literacy-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['my-literacy-scores'] })
      queryClient.invalidateQueries({ queryKey: ['literacy-activities'] })
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan penilaian')
    },
  })

  const startGrade = (sub: GuruSubmissionRow) => {
    const quizScore = sub.content.quiz_score ?? 0
    setGradingId(sub.id)
    setGradeScore(sub.score ?? quizScore)
    setGradeFeedback(sub.feedback ?? '')
  }

  const pendingCount = submissions?.filter((s) => s.status === 'pending').length

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kelola Literasi</h1>
          <p className="text-[var(--color-muted-foreground)]">
            Buat modul, lihat pengumpulan siswa, dan beri skor
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Modul Baru
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5" />
            Pengumpulan Siswa
            {submissionFilter === 'pending' && pendingCount != null && pendingCount > 0 && (
              <Badge>{pendingCount}</Badge>
            )}
          </h2>
          <div className="flex flex-wrap gap-2">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={submissionFilter === f ? 'default' : 'outline'}
                onClick={() => setSubmissionFilter(f)}
              >
                {f === 'pending' ? 'Menunggu' : f === 'approved' ? 'Disetujui' : f === 'rejected' ? 'Ditolak' : 'Semua'}
              </Button>
            ))}
          </div>
        </div>

        {submissionsLoading && <Skeleton className="h-32 w-full" />}

        {submissionsError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-medium">Gagal memuat pengumpulan</p>
              <p className="mt-1">{submissionsError instanceof Error ? submissionsError.message : 'Error tidak diketahui'}</p>
              <p className="mt-2 text-xs">
                Pastikan migrasi{' '}
                <code className="rounded bg-red-100 px-1">005_guru_review_submissions.sql</code> sudah dijalankan di
                Supabase.
              </p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => refetchSubmissions()}>
                Coba lagi
              </Button>
            </div>
          </div>
        )}

        {!submissionsLoading && !submissionsError && !submissions?.length && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-[var(--color-muted-foreground)]">
            {modules?.length
              ? 'Belum ada siswa yang mengumpulkan untuk filter ini.'
              : 'Buat modul literasi dulu. Siswa akan muncul di sini setelah mengumpulkan tugas.'}
          </div>
        )}

        <div className="space-y-3">
          {submissions?.map((sub) => (
            <SubmissionCard
              key={sub.id}
              sub={sub}
              gradingId={gradingId}
              gradeScore={gradeScore}
              gradeFeedback={gradeFeedback}
              grading={gradeMutation.isPending}
              onStartGrade={() => startGrade(sub)}
              onCancelGrade={() => setGradingId(null)}
              onScoreChange={setGradeScore}
              onFeedbackChange={setGradeFeedback}
              onApprove={() =>
                gradeMutation.mutate({
                  id: sub.id,
                  status: 'approved',
                  score: gradeScore,
                  feedback: gradeFeedback,
                  maxScore: sub.activity.max_score,
                })
              }
              onReject={() =>
                gradeMutation.mutate({
                  id: sub.id,
                  status: 'rejected',
                  score: gradeScore,
                  feedback: gradeFeedback,
                  maxScore: sub.activity.max_score,
                })
              }
            />
          ))}
        </div>
      </section>

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
                <a
                  href={editing.content_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-xs text-[var(--color-primary)]"
                >
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
