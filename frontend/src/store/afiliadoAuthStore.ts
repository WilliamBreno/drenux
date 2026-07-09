import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AfiliadoAuthState {
  token: string | null;
  setToken: (token: string) => void;
  logout: () => void;
}

// Separado do authStore de lojas de propósito — afiliado e dono de loja
// são identidades diferentes, com tokens JWT diferentes (claims
// "afiliado_id" vs "usuario_id"/"loja_id").
export const useAfiliadoAuthStore = create<AfiliadoAuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      logout: () => set({ token: null }),
    }),
    { name: 'afiliado-auth-storage' }
  )
);