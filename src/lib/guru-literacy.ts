import { supabase } from '@/lib/supabase'
import { parseQuizQuestions } from '@/lib/literacy'
import type { ActivitySubmission, LiteracyActivity, QuizQuestion } from '@/types/database'

export type GuruSubmissionRow = ActivitySubmission & {
  activity: Pick<LiteracyActivity, 'id' | 'title' | 'max_score' | 'quiz_questions'>
  studentName: string
}

export async function fetchGuruLiteracySubmissions(
  guruId: string,
  statusFilter: 'pending' | 'approved' | 'rejected' | 'all',
): Promise<GuruSubmissionRow[]> {
  const { data: mods, error: modErr } = await supabase
    .from('literacy_activities')
    .select('id, title, max_score, quiz_questions')
    .eq('created_by', guruId)
    .eq('type', 'literacy_module')

  if (modErr) throw modErr
  const moduleMap = new Map(
    (mods ?? []).map((m) => [
      m.id,
      {
        ...m,
        quiz_questions: parseQuizQuestions(m.quiz_questions),
      },
    ]),
  )
  const ids = [...moduleMap.keys()]
  if (!ids.length) return []

  let query = supabase
    .from('activity_submissions')
    .select('*')
    .in('activity_id', ids)
    .order('created_at', { ascending: false })

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data: subs, error: subErr } = await query
  if (subErr) throw subErr
  if (!subs?.length) return []

  const userIds = [...new Set(subs.map((s) => s.user_id))]
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)

  if (profErr) throw profErr

  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  return subs.map((sub) => {
    const activity = moduleMap.get(sub.activity_id)!
    return {
      ...(sub as ActivitySubmission),
      activity,
      studentName: nameMap.get(sub.user_id) ?? `Siswa (${sub.user_id.slice(0, 8)}…)`,
    }
  })
}

export function formatQuizAnswers(
  questions: QuizQuestion[],
  answers: Record<string, number> | undefined,
): { label: string; answer: string; correct: boolean }[] {
  if (!questions.length) return []
  return questions.map((q, i) => {
    const chosen = answers?.[q.id]
    const answerText =
      chosen !== undefined ? q.options[chosen] || `Opsi ${chosen + 1}` : 'Tidak dijawab'
    return {
      label: `${i + 1}. ${q.question}`,
      answer: answerText,
      correct: chosen === q.correctIndex,
    }
  })
}
