import { api } from './client';

interface CadastroInput {
  nome: string;
  email: string;
  senha: string;
  nome_loja: string;
}

interface LoginInput {
  email: string;
  senha: string;
}

interface AuthResponse {
  token: string;
}

interface MensagemResponse {
  mensagem: string;
}

export async function cadastrar(input: CadastroInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/cadastro', input);
  return data;
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', input);
  return data;
}

export async function solicitarResetSenha(email: string): Promise<MensagemResponse> {
  const { data } = await api.post<MensagemResponse>('/auth/esqueci-senha', { email });
  return data;
}

export async function redefinirSenha(token: string, senha: string): Promise<MensagemResponse> {
  const { data } = await api.post<MensagemResponse>('/auth/redefinir-senha', { token, senha });
  return data;
}