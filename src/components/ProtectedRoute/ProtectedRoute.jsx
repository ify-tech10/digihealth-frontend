import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { homeFor } from '../../config/roles';

/*
 * Wrap dashboard routes:
 *   <Route element={<ProtectedRoute roles={['ADMIN']} />}> ... </Route>
 *
 * - Not signed in      -> /login (remembers where they were going)
 * - Signed in, wrong role -> their own dashboard
 */
export default function ProtectedRoute({ roles = [] }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const role = String(user.role).toUpperCase();
  if (roles.length && !roles.includes(role)) {
    return <Navigate to={homeFor(role) || '/login'} replace />;
  }

  return <Outlet />;
}
