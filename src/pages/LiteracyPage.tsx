import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sparkles, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { activityTypeLabels } from '@/lib/literacy'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import type { LiteracyActivity, ActivityType } from '@/types/database'

export function LiteracyPage() {
  const { user } = useAuth()

  const { data: activities, isLoading } = useQuery({
    queryKey: ['literacy-activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('literacy_activities')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as LiteracyActivity[]
    },
  })

  const { data: mySubmissions } = useQuery({
    queryKey: ['my-literacy-submissions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_submissions')
        .select('activity_id, status, score, content')
        .eq('user_id', user!.id)
      if (error) throw error
      return data
    },
    enabled: !!user?.id,
  })

  const submissionMap = new Map(mySubmissions?.map((s) => [s.activity_id, s]) ?? [])

  const modules = activities?.filter((a) => a.type === 'literacy_module') ?? []
  const legacy = activities?.filter((a) => a.type !== 'literacy_module') ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Literasi</h1>
        <p className="text-[var(--color-muted-foreground)]">
          Baca materi, kerjakan kuis & tugas, dapatkan skor literasi
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !activities?.length ? (
        <EmptyState
          icon={Sparkles}
          title="Belum ada modul literasi"
          description="Guru akan menambahkan materi literasi segera."
        />
      ) : (
        <div className="space-y-6">
          {modules.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">Modul Literasi</h2>
              {modules.map((act) => {
                const sub = submissionMap.get(act.id)
                return (
                  <Link key={act.id} to={`/literacy/${act.id}`}>
                    <Card className="transition-shadow hover:shadow-md">
                      <CardHeader className="flex flex-row items-start gap-4 p-4">
                        <FileText className="h-10 w-10 shrink-0 text-[var(--color-primary)]" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base">{act.title}</CardTitle>
                            <Badge>+{act.points_reward} poin</Badge>
                          </div>
                          <p className="mt-2 text-sm text-[var(--color-muted-foreground)] line-clamp-2">
                            {act.description}
                          </p>
                          {sub && (
                            <Badge variant="secondary" className="mt-2">
                              {sub.status === 'approved' && sub.score != null
                                ? `Skor: ${sub.score}`
                                : sub.status === 'pending'
                                  ? 'Menunggu nilai guru'
                                  : sub.status}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                )
              })}
            </section>
          )}

          {legacy.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">Aktivitas Lainnya</h2>
              {legacy.map((act) => (
                <Link key={act.id} to={`/literacy/${act.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-start gap-4 p-4">
                      <Sparkles className="h-10 w-10 shrink-0 text-[var(--color-primary)]" />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">{act.title}</CardTitle>
                        <Badge variant="secondary" className="mt-2">
                          {activityTypeLabels[act.type as ActivityType]}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
