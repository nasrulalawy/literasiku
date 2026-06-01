import type { QuizQuestion } from '@/types/database'

export function gradeQuiz(questions: QuizQuestion[], answers: Record<string, number>): number {
  if (!questions.length) return 0
  let correct = 0
  for (const q of questions) {
    if (answers[q.id] === q.correctIndex) correct++
  }
  return Math.round((correct / questions.length) * 100)
}

export function parseQuizQuestions(raw: unknown): QuizQuestion[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (q): q is QuizQuestion =>
      typeof q === 'object' &&
      q !== null &&
      typeof (q as QuizQuestion).id === 'string' &&
      typeof (q as QuizQuestion).question === 'string' &&
      Array.isArray((q as QuizQuestion).options) &&
      typeof (q as QuizQuestion).correctIndex === 'number',
  )
}

export function newQuizQuestion(): QuizQuestion {
  const id = crypto.randomUUID()
  return {
    id,
    question: '',
    options: ['', '', '', ''],
    correctIndex: 0,
  }
}

export const activityTypeLabels: Record<string, string> = {
  literacy_module: 'Modul Literasi',
  quiz: 'Kuis',
  reading_log: 'Log Membaca',
  review: 'Resensi',
}
