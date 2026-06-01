import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import type { LiteracyActivity, ActivityType } from '@/types/database'

const typeLabels: Record<ActivityType, string> = {
  quiz: 'Kuis',
  reading_log: 'Log Membaca',
  review: 'Resensi',
}

export function LiteracyPage() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Aktivitas Literasi</h1>
        <p className="text-[var(--color-muted-foreground)]">Ikuti aktivitas dan kumpulkan poin</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !activities?.length ? (
        <EmptyState
          icon={Sparkles}
          title="Belum ada aktivitas"
          description="Admin akan menambahkan aktivitas literasi segera."
        />
      ) : (
        <div className="space-y-3">
          {activities.map((act) => (
            <Link key={act.id} to={`/literacy/${act.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-start gap-4 p-4">
                  <Sparkles className="h-10 w-10 shrink-0 text-[var(--color-primary)]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{act.title}</CardTitle>
                      <Badge>+{act.points_reward} poin</Badge>
                    </div>
                    <Badge variant="secondary" className="mt-2">
                      {typeLabels[act.type]}
                    </Badge>
                    <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{act.description}</p>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
