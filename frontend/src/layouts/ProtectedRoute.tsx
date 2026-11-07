import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, useAuthBootstrap } from '@/hooks/useAuth';
import WelcomeLoadingScreen from '@/components/common/WelcomeLoadingScreen';

export default function ProtectedRoute() {
  const { booting } = useAuthBootstrap();
  const { isAuthenticated } = useAuth();

  if (booting) {
    return <WelcomeLoadingScreen />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
