import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, useAuthBootstrap } from '@/hooks/useAuth';

export default function ProtectedRoute() {
  const { booting } = useAuthBootstrap();
  const { isAuthenticated } = useAuth();

  if (booting) {
    return <div className="flex h-screen items-center justify-center">…</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
