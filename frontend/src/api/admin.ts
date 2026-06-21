import { api } from './client';
import type { Categoria, Produto, Pedido, Loja } from './types';

// Categorias
export async function listarCategorias(): Promise<Categoria[]> {
  const { data } = await api.get<Categoria[]>('/admin/categorias');
  return data;
}

export async function criarCategoria(nome: string): Promise<Categoria> {
  const { data } = await api.post<Categoria>('/admin/categorias', { nome });
  return data;
}

export async function atualizarCategoria(id: number, nome: string): Promise<Categoria> {
  const { data } = await api.put<Categoria>(`/admin/categorias/${id}`, { nome });
  return data;
}

export async function deletarCategoria(id: number): Promise<void> {
  await api.delete(`/admin/categorias/${id}`);
}

// Produtos
export interface ProdutoInput {
  nome: string;
  descricao: string;
  preco: number;
  foto_url: string;
  disponivel: boolean;
  categoria_id: number;
}

export async function listarProdutos(): Promise<Produto[]> {
  const { data } = await api.get<Produto[]>('/admin/produtos');
  return data;
}

export async function criarProduto(input: ProdutoInput): Promise<Produto> {
  const { data } = await api.post<Produto>('/admin/produtos', input);
  return data;
}

export async function atualizarProduto(id: number, input: ProdutoInput): Promise<Produto> {
  const { data } = await api.put<Produto>(`/admin/produtos/${id}`, input);
  return data;
}

export async function deletarProduto(id: number): Promise<void> {
  await api.delete(`/admin/produtos/${id}`);
}

// Pedidos
export async function listarPedidos(): Promise<Pedido[]> {
  const { data } = await api.get<Pedido[]>('/admin/pedidos');
  return data;
}

// Loja
export async function buscarLoja(): Promise<Loja> {
  const { data } = await api.get<Loja>('/admin/loja');
  return data;
}

export interface ConfiguracoesInput {
  whatsapp_numero: string;
  permite_mesmo_dia: boolean;
}

export async function atualizarConfiguracoes(input: ConfiguracoesInput): Promise<void> {
  await api.put('/admin/loja', input);
}

// Stripe
export async function iniciarOnboardingStripe(): Promise<{ url: string }> {
  const { data } = await api.post<{ url: string }>('/admin/stripe/onboarding');
  return data;
}

export async function statusStripe(): Promise<{ stripe_conectado: boolean }> {
  const { data } = await api.get<{ stripe_conectado: boolean }>('/admin/stripe/status');
  return data;
}
