export type UserRole = 'member' | 'guru' | 'admin'
export type ActivityType = 'quiz' | 'reading_log' | 'review' | 'literacy_module'

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
}

export interface LiteracySubmissionContent {
  quiz_answers?: Record<string, number>
  quiz_score?: number
  assignment_answer?: string
  answer?: string
  log?: string
  review?: string
}
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  points: number
  created_at: string
}

export interface Book {
  id: string
  title: string
  author: string
  isbn: string | null
  category: string
  cover_url: string | null
  pdf_url: string | null
  description: string | null
  published_year: number | null
  created_by: string | null
  created_at: string
}

export interface LiteracyActivity {
  id: string
  title: string
  type: ActivityType
  description: string
  points_reward: number
  active: boolean
  created_at: string
  created_by: string | null
  content_url: string | null
  reading_text: string | null
  quiz_questions: QuizQuestion[]
  assignment_prompt: string | null
  max_score: number
}

export interface ActivitySubmission {
  id: string
  activity_id: string
  user_id: string
  content: LiteracySubmissionContent
  status: SubmissionStatus
  points_awarded: number
  score: number | null
  read_completed_at: string | null
  graded_by: string | null
  feedback: string | null
  created_at: string
}
