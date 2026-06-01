import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { QuizQuestion } from '@/types/database'
import { newQuizQuestion } from '@/lib/literacy'

interface Props {
  questions: QuizQuestion[]
  onChange: (questions: QuizQuestion[]) => void
}

export function QuizQuestionEditor({ questions, onChange }: Props) {
  const update = (index: number, patch: Partial<QuizQuestion>) => {
    const next = questions.map((q, i) => (i === index ? { ...q, ...patch } : q))
    onChange(next)
  }

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const q = questions[qIndex]
    const options = [...q.options]
    options[optIndex] = value
    update(qIndex, { options })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Pertanyaan Kuis</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...questions, newQuizQuestion()])}>
          <Plus className="mr-1 h-4 w-4" />
          Tambah
        </Button>
      </div>
      {questions.length === 0 && (
        <p className="text-sm text-[var(--color-muted-foreground)]">Belum ada pertanyaan. Opsional.</p>
      )}
      {questions.map((q, qi) => (
        <div key={q.id} className="rounded-lg border p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder={`Pertanyaan ${qi + 1}`}
              value={q.question}
              onChange={(e) => update(qi, { question: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(questions.filter((_, i) => i !== qi))}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
          {q.options.map((opt, oi) => (
            <label key={oi} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`correct-${q.id}`}
                checked={q.correctIndex === oi}
                onChange={() => update(qi, { correctIndex: oi })}
              />
              <Input
                placeholder={`Opsi ${String.fromCharCode(65 + oi)}`}
                value={opt}
                onChange={(e) => updateOption(qi, oi, e.target.value)}
              />
            </label>
          ))}
        </div>
      ))}
    </div>
  )
}
