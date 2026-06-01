import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute, AdminRoute, GuruRoute, GuestRoute } from '@/routes/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { OfflineBanner } from '@/components/shared/OfflineBanner'
import { InstallPrompt } from '@/components/shared/InstallPrompt'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { HomePage } from '@/pages/HomePage'
import { CatalogPage } from '@/pages/CatalogPage'
import { BookDetailPage } from '@/pages/BookDetailPage'
import { LiteracyPage } from '@/pages/LiteracyPage'
import { LiteracyDetailPage } from '@/pages/LiteracyDetailPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ManageBooksPage } from '@/pages/books/ManageBooksPage'
import { ManageLiteracyPage } from '@/pages/guru/ManageLiteracyPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminLiteracyPage } from '@/pages/admin/AdminLiteracyPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <OfflineBanner />
          <InstallPrompt />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route element={<GuestRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/home" element={<HomePage />} />
                <Route path="/catalog" element={<CatalogPage />} />
                <Route path="/books/:id" element={<BookDetailPage />} />
                <Route path="/literacy" element={<LiteracyPage />} />
                <Route path="/literacy/:id" element={<LiteracyDetailPage />} />
                <Route path="/profile" element={<ProfilePage />} />

                <Route element={<GuruRoute />}>
                  <Route path="/guru/books" element={<ManageBooksPage />} />
                  <Route path="/guru/literacy" element={<ManageLiteracyPage />} />
                </Route>

                <Route element={<AdminRoute />}>
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/literacy" element={<AdminLiteracyPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="/my-loans" element={<Navigate to="/catalog" replace />} />
            <Route path="/admin/books" element={<Navigate to="/guru/books" replace />} />
            <Route path="/admin/loans" element={<Navigate to="/admin" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  )
}
