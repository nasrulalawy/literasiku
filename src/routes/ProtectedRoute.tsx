import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { homePathForRole } from '@/lib/roles'
import { Skeleton } from '@/components/ui/skeleton'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <Outlet />
}

export function AdminRoute() {
  const { isAdmin, loading, profile } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!isAdmin) {
    return <Navigate to={profile ? homePathForRole(profile.role) : '/home'} replace state={{ from: location }} />
  }
  return <Outlet />
}

export function GuruRoute() {
  const { canManageBooks, loading, profile } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!canManageBooks) {
    return <Navigate to={profile ? homePathForRole(profile.role) : '/home'} replace state={{ from: location }} />
  }
  return <Outlet />
}

export function GuestRoute() {
  const { user, profile, loading } = useAuth()

  if (loading) return null
  if (user && profile) return <Navigate to={homePathForRole(profile.role)} replace />
  if (user) return <Navigate to="/home" replace />
  return <Outlet />
}
