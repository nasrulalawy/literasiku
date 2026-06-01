export type UserRole = 'member' | 'guru' | 'admin'
export type ActivityType = 'quiz' | 'reading_log' | 'review'
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
}

export interface ActivitySubmission {
  id: string
  activity_id: string
  user_id: string
  content: Record<string, unknown>
  status: SubmissionStatus
  points_awarded: number
  created_at: string
}
