import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BookOpen, ClipboardList, HelpCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { gradeQuiz, parseQuizQuestions } from '@/lib/literacy'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { LiteracyActivity, ActivitySubmission } from '@/types/database'

type Step = 'read' | 'quiz' | 'assignment' | 'done'

interface Props {
  activity: LiteracyActivity
  existing: ActivitySubmission | null | undefined
  onSubmitted: () => void
}

export function LiteracyModuleFlow({ activity, existing, onSubmitted }: Props) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const questions = parseQuizQuestions(activity.quiz_questions)
  const hasQuiz = questions.length > 0
  const hasAssignment = !!activity.assignment_prompt?.trim()

  const [step, setStep] = useState<Step>(() => {
    if (existing?.status === 'approved' || existing?.status === 'pending') return 'done'
    return 'read'
  })
  const [readDone, setReadDone] = useState(!!existing?.read_completed_at)
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>(
    () => existing?.content.quiz_answers ?? {},
  )
  const [assignmentAnswer, setAssignmentAnswer] = useState(
    () => existing?.content.assignment_answer ?? '',
  )

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!readDone) throw new Error('Tandai materi sudah dibaca terlebih dahulu')
      if (hasAssignment && assignmentAnswer.trim().length < 20) {
        throw new Error('Jawaban tugas minimal 20 karakter')
      }
      if (hasQuiz) {
        const unanswered = questions.some((q) => quizAnswers[q.id] === undefined)
        if (unanswered) throw new Error('Jawab semua pertanyaan kuis')
      }

      const quiz_score = hasQuiz ? gradeQuiz(questions, quizAnswers) : 0
      const content = {
        quiz_answers: quizAnswers,
        quiz_score,
        assignment_answer: assignmentAnswer.trim(),
      }

      const payload = {
        content,
        read_completed_at: new Date().toISOString(),
        score: quiz_score,
        status: 'pending' as const,
      }

      if (existing) {
        const { error } = await supabase.from('activity_submissions').update(payload).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('activity_submissions').insert({
          activity_id: activity.id,
          user_id: user!.id,
          ...payload,
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Tugas & kuis terkirim! Menunggu penilaian guru.')
      queryClient.invalidateQueries({ queryKey: ['submission', activity.id] })
      queryClient.invalidateQueries({ queryKey: ['my-literacy-scores'] })
      setStep('done')
      onSubmitted()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Gagal mengirim'),
  })

  if (existing && (existing.status === 'approved' || existing.status === 'rejected' || existing.status === 'pending')) {
    const quizScore = existing.content.quiz_score ?? 0
    return (
      <div className="space-y-4 rounded-xl border bg-white p-4">
        <div className="flex items-center gap-2 text-[var(--color-primary)]">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">Pengiriman Anda</span>
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[var(--color-muted-foreground)]">Status</p>
            <p className="font-medium capitalize">{existing.status}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[var(--color-muted-foreground)]">Skor Kuis (otomatis)</p>
            <p className="font-medium">{quizScore}/100</p>
          </div>
          {existing.score != null && existing.status === 'approved' && (
            <div className="rounded-lg bg-teal-50 p-3 sm:col-span-2">
              <p className="text-[var(--color-muted-foreground)]">Skor Literasi (guru)</p>
              <p className="text-xl font-bold text-[var(--color-primary)]">
                {existing.score}/{activity.max_score}
              </p>
              {existing.points_awarded > 0 && (
                <p className="text-sm">+{existing.points_awarded} poin diterima</p>
              )}
            </div>
          )}
          {existing.feedback && (
            <div className="rounded-lg bg-amber-50 p-3 sm:col-span-2">
              <p className="text-xs font-medium text-amber-800">Feedback guru</p>
              <p className="mt-1 text-sm">{existing.feedback}</p>
            </div>
          )}
        </div>
        {existing.status === 'pending' && (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Guru sedang meninjau tugas Anda. Skor akhir akan muncul setelah disetujui.
          </p>
        )}
      </div>
    )
  }

  const steps: { key: Step; label: string; icon: typeof BookOpen }[] = [
    { key: 'read', label: 'Baca', icon: BookOpen },
    ...(hasQuiz ? [{ key: 'quiz' as Step, label: 'Kuis', icon: HelpCircle }] : []),
    ...(hasAssignment ? [{ key: 'assignment' as Step, label: 'Tugas', icon: ClipboardList }] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <div
            key={s.key}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
              step === s.key ? 'bg-[var(--color-primary)] text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <s.icon className="h-3.5 w-3.5" />
            {i + 1}. {s.label}
          </div>
        ))}
      </div>

      {step === 'read' && (
        <div className="space-y-4">
          {activity.reading_text && (
            <div className="prose prose-sm max-w-none rounded-xl border bg-white p-4 whitespace-pre-wrap">
              {activity.reading_text}
            </div>
          )}
          {activity.content_url && (
            <div className="rounded-xl border overflow-hidden">
              {activity.content_url.endsWith('.pdf') ? (
                <iframe
                  title="Materi literasi"
                  src={activity.content_url}
                  className="h-[min(70vh,480px)] w-full"
                />
              ) : (
                <img src={activity.content_url} alt="Materi" className="w-full" />
              )}
              <a
                href={activity.content_url}
                target="_blank"
                rel="noreferrer"
                className="block border-t bg-slate-50 px-4 py-2 text-center text-sm text-[var(--color-primary)]"
              >
                Buka materi di tab baru
              </a>
            </div>
          )}
          {!activity.reading_text && !activity.content_url && (
            <p className="text-sm text-[var(--color-muted-foreground)]">Tidak ada materi teks/file.</p>
          )}
          <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              checked={readDone}
              onChange={(e) => setReadDone(e.target.checked)}
              className="mt-1"
            />
            Saya sudah membaca materi literasi ini
          </label>
          <Button
            className="w-full"
            disabled={!readDone}
            onClick={() => setStep(hasQuiz ? 'quiz' : 'assignment')}
          >
            Lanjut ke {hasQuiz ? 'Kuis' : 'Tugas'}
          </Button>
        </div>
      )}

      {step === 'quiz' && hasQuiz && (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border p-4">
              <p className="font-medium">
                {i + 1}. {q.question}
              </p>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      quizAnswers[q.id] === oi ? 'border-[var(--color-primary)] bg-teal-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={quizAnswers[q.id] === oi}
                      onChange={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                    />
                    {opt || `Opsi ${String.fromCharCode(65 + oi)}`}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('read')}>
              Kembali
            </Button>
            {hasAssignment ? (
              <Button className="flex-1" onClick={() => setStep('assignment')}>
                Lanjut ke Tugas
              </Button>
            ) : (
              <Button
                className="flex-1"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? 'Mengirim...' : 'Kirim Kuis'}
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 'assignment' && hasAssignment && (
        <div className="space-y-4">
          <div className="rounded-lg bg-teal-50 p-3 text-sm">{activity.assignment_prompt}</div>
          <div>
            <Label>Jawaban tugas</Label>
            <Textarea
              rows={8}
              className="mt-1"
              value={assignmentAnswer}
              onChange={(e) => setAssignmentAnswer(e.target.value)}
              placeholder="Tulis jawaban tugas Anda di sini (min. 20 karakter)..."
            />
          </div>
          <div className="flex gap-2">
            {hasQuiz && (
              <Button variant="outline" onClick={() => setStep('quiz')}>
                Kembali
              </Button>
            )}
            {!hasQuiz && (
              <Button variant="outline" onClick={() => setStep('read')}>
                Kembali
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? 'Mengirim...' : 'Kirim Tugas & Kuis'}
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
