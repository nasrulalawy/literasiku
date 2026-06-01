import { useAuth } from '@/contexts/AuthContext'
import { roleLabel } from '@/lib/roles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Trophy, LogOut } from 'lucide-react'

export function ProfilePage() {
  const { profile, signOut, isGuru } = useAuth()

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
            <div className="flex items-center gap-3 rounded-lg bg-[var(--color-muted)] p-4">
              <Trophy className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm text-[var(--color-muted-foreground)]">Total Poin Literasi</p>
                <p className="text-2xl font-bold">{profile?.points ?? 0}</p>
              </div>
            </div>
          )}
          {isGuru && (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Sebagai guru, Anda dapat mengunggah dan mengelola buku digital (PDF) di menu Kelola Buku.
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
