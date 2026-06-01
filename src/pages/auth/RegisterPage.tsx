import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { BookOpen, GraduationCap, Users } from 'lucide-react'
import { useAuth, type SignupRole } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { isSupabaseConfigured } from '@/lib/supabase'

const schema = z
  .object({
    fullName: z.string().min(2, 'Nama minimal 2 karakter'),
    email: z.email('Email tidak valid'),
    password: z.string().min(6, 'Minimal 6 karakter'),
    confirmPassword: z.string(),
    role: z.enum(['member', 'guru']),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Password tidak cocok',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<SignupRole>('member')

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'member' },
  })

  const pickRole = (role: SignupRole) => {
    setSelectedRole(role)
    setValue('role', role)
  }

  const onSubmit = async (data: FormData) => {
    if (!isSupabaseConfigured) {
      toast.error('Supabase belum dikonfigurasi.')
      return
    }
    setLoading(true)
    try {
      await signUp(data.email, data.password, data.fullName, data.role)
      toast.success(
        data.role === 'guru'
          ? 'Akun guru dibuat! Anda bisa login dan mengunggah buku PDF.'
          : 'Akun siswa dibuat! Silakan login.',
      )
      navigate('/login')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mendaftar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-teal-50 to-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <BookOpen className="mx-auto h-10 w-10 text-[var(--color-primary)]" />
          <CardTitle className="mt-2">Daftar Literasiku</CardTitle>
          <CardDescription>Pilih peran Anda lalu isi data akun</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Daftar sebagai</Label>
              <input type="hidden" {...register('role')} />
              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => pickRole('member')}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors',
                    selectedRole === 'member'
                      ? 'border-[var(--color-primary)] bg-[var(--color-accent)]'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]',
                  )}
                >
                  <Users className="h-8 w-8 text-[var(--color-primary)]" />
                  <span className="font-semibold">Siswa</span>
                  <span className="text-center text-xs text-[var(--color-muted-foreground)]">
                    Baca buku digital
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => pickRole('guru')}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors',
                    selectedRole === 'guru'
                      ? 'border-[var(--color-primary)] bg-[var(--color-accent)]'
                      : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]',
                  )}
                >
                  <GraduationCap className="h-8 w-8 text-[var(--color-primary)]" />
                  <span className="font-semibold">Guru</span>
                  <span className="text-center text-xs text-[var(--color-muted-foreground)]">
                    Unggah buku PDF
                  </span>
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input id="fullName" className="mt-1" {...register('fullName')} />
              {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName.message}</p>}
            </div>
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
            <div>
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input id="confirmPassword" type="password" className="mt-1" {...register('confirmPassword')} />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memproses...' : 'Daftar'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-[var(--color-muted-foreground)]">
            Sudah punya akun?{' '}
            <Link to="/login" className="font-medium text-[var(--color-primary)]">
              Masuk
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
