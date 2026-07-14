import { api } from './client';

interface CheckoutResponse {
  url: string;
}

interface VerificacaoResponse {
  email: string;
  plano: string;
  token: string;
}

export async function criarCheckoutAssinatura(plano: 'pro' | 'scale'): Promise<CheckoutResponse> {
  const { data } = await api.post<CheckoutResponse>('/planos/checkout', { plano });
  return data;
}

export async function verificarToken(token: string): Promise<VerificacaoResponse> {
  const { data } = await api.get<VerificacaoResponse>('/planos/verificar-token', { params: { token } });
  return data;
}

export async function verificarSessao(sessionId: string): Promise<VerificacaoResponse> {
  const { data } = await api.get<VerificacaoResponse>('/planos/verificar-sessao', { params: { session_id: sessionId } });
  return data;
}