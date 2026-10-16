import { Navigate, Outlet, useLocation } from 'react-router-dom';
import PageLoader from '@/components/PageLoader';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping, token } = useAuth();
  const location = useLocation();

  if (token && isBootstrapping) {
    return <PageLoader label="Checking your session…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
