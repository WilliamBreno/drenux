import { Navigate, Outlet } from 'react-router-dom';
import { useAfiliadoAuthStore } from '../store/afiliadoAuthStore';

// Equivalente ao RotaProtegida das lojas, mas checando o token de
// afiliado, num store separado.
export function AfiliadoRotaProtegida() {
  const token = useAfiliadoAuthStore((s) => s.token);

  if (!token) {
    return <Navigate to="/afiliado/login" replace />;
  }

  return <Outlet />;
}