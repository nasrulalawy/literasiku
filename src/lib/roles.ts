import type { UserRole } from '@/types/database'

export function roleLabel(role: UserRole) {
  const labels: Record<UserRole, string> = {
    member: 'Siswa',
    guru: 'Guru',
    admin: 'Admin',
  }
  return labels[role]
}

export function homePathForRole(role: UserRole) {
  if (role === 'admin') return '/admin'
  if (role === 'guru') return '/guru/books'
  return '/home'
}
