import axios from 'axios';
import { useAfiliadoAuthStore } from '../store/afiliadoAuthStore';

// Instância própria (não reaproveita o client.ts das lojas) — assim o
// token de afiliado nunca conflita com o token de dono de loja, mesmo
// que os dois estejam logados ao mesmo tempo no mesmo navegador.
const apiAfiliado = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

apiAfiliado.interceptors.request.use((config) => {
  const token = useAfiliadoAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

interface LoginInput {
  email: string;
  senha: string;
}

interface AuthResponse {
  token: string;
}

export async function loginAfiliado(input: LoginInput): Promise<AuthResponse> {
  const { data } = await apiAfiliado.post<AuthResponse>('/afiliados/login', input);
  return data;
}

export interface LojaIndicada {
  id: number;
  nome: string;
  slug: string;
  created_at: string;
}

export interface DashboardAfiliado {
  lojas: LojaIndicada[];
  total_ganho: number;
  stripe_conectado: boolean;
}

export async function buscarDashboardAfiliado(): Promise<DashboardAfiliado> {
  const { data } = await apiAfiliado.get<DashboardAfiliado>('/afiliado/dashboard');
  return data;
}

export async function iniciarOnboardingStripeAfiliado(): Promise<{ url: string }> {
  const { data } = await apiAfiliado.post<{ url: string }>('/afiliado/stripe/onboarding');
  return data;
}