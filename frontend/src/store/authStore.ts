import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  setToken: (token: string) => void;
  logout: () => void;
}

// persist salva no localStorage automaticamente — assim o dono da loja
// continua logado depois de fechar e abrir o navegador de novo, sem
// precisar fazer login toda vez.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      logout: () => set({ token: null }),
    }),
    { name: 'cardapio-auth' }
  )
);
