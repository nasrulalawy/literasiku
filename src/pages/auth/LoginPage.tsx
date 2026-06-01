import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { BookOpen } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { homePathForRole } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import type { UserRole } from '@/types/database'

const schema = z.object({
  email: z.email('Email tidak valid'),
  password: z.string().min(6, 'Minimal 6 karakter'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (!isSupabaseConfigured) {
      toast.error('Supabase belum dikonfigurasi. Set VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.')
      return
    }
    setLoading(true)
    try {
      await signIn(data.email, data.password)
      const { data: userData } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userData.user!.id)
        .single()
      toast.success('Berhasil masuk!')
      const role = (profile?.role ?? 'member') as UserRole
      const dest = from && from !== '/login' && from !== '/register' ? from : homePathForRole(role)
      navigate(dest, { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal masuk')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-teal-50 to-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <BookOpen className="mx-auto h-10 w-10 text-[var(--color-primary)]" />
          <CardTitle className="mt-2">Masuk ke Literasiku</CardTitle>
          <CardDescription>Siswa dan guru dapat masuk dengan email</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" className="mt-1" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" className="mt-1" {...register('password')} />
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-[var(--color-muted-foreground)]">
            Belum punya akun?{' '}
            <Link to="/register" className="font-medium text-[var(--color-primary)]">
              Daftar sebagai Siswa atau Guru
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
