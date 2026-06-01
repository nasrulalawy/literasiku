import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { roleLabel } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Trophy, LogOut, GraduationCap } from 'lucide-react'

export function ProfilePage() {
  const { profile, signOut, isGuru, user } = useAuth()

  const { data: literacyScores } = useQuery({
    queryKey: ['my-literacy-scores', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_submissions')
        .select('id, score, status, points_awarded, content, activity:literacy_activities(title, type, max_score)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
        .map((s) => {
          const act = Array.isArray(s.activity) ? s.activity[0] : s.activity
          return { ...s, activity: act as { title: string; type: string; max_score: number } | null }
        })
        .filter((s) => s.activity?.type === 'literacy_module')
    },
    enabled: !!user?.id && profile?.role === 'member',
  })

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-[var(--color-muted-foreground)]">Informasi akun Anda</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent)]">
            <User className="h-8 w-8 text-[var(--color-primary)]" />
          </div>
          <div>
            <CardTitle>{profile?.full_name}</CardTitle>
            <Badge variant="secondary" className="mt-1">
              {profile?.role ? roleLabel(profile.role) : '—'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!isGuru && profile?.role !== 'admin' && (
            <>
              <div className="flex items-center gap-3 rounded-lg bg-[var(--color-muted)] p-4">
                <Trophy className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">Total Poin Literasi</p>
                  <p className="text-2xl font-bold">{profile?.points ?? 0}</p>
                </div>
              </div>

              {literacyScores && literacyScores.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-[var(--color-primary)]" />
                    <p className="font-medium">Skor Literasi</p>
                  </div>
                  <ul className="space-y-2">
                    {literacyScores.map((row) => (
                      <li key={row.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <span className="truncate pr-2">{row.activity?.title}</span>
                        <Badge variant={row.status === 'approved' ? 'default' : 'secondary'}>
                          {row.status === 'approved' && row.score != null
                            ? `${row.score}/${row.activity?.max_score ?? 100}`
                            : row.status === 'pending'
                              ? `Kuis ${row.content?.quiz_score ?? 0}% · review`
                              : row.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                  <Link to="/literacy" className="text-sm text-[var(--color-primary)]">
                    Lihat modul literasi →
                  </Link>
                </div>
              )}
            </>
          )}
          {isGuru && (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Kelola buku digital di <strong>Kelola Buku</strong> dan modul literasi di{' '}
              <strong>Kelola Literasi</strong>.
            </p>
          )}
          <Button variant="outline" className="mt-6 w-full" onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Keluar
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
