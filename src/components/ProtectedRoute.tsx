import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { isLoggedIn } = useAuth();

  if (requireAdmin) {
    const isAdmin = localStorage.getItem('adminSession') === 'true';
    if (!isAdmin) {
      return <Navigate to="/admin/login" replace />;
    }
    return <>{children}</>;
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}