import { Navigate, Outlet } from 'react-router-dom';
import PageLoader from '@/components/PageLoader';
import { useAuth } from '@/context/AuthContext';

export default function PublicAuthRoute() {
  const { isAuthenticated, isBootstrapping, token } = useAuth();

  if (token && isBootstrapping) {
    return <PageLoader label="Loading…" />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
