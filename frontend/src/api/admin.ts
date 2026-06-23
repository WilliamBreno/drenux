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
  estoque_atual: number | null;
  estoque_alerta: number | null;
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
  logo_url: string;
  modo_pedido: string;
  antecedencia_minima_horas: number;
  horario_abertura: string;
  horario_fechamento: string;
  margem_fechamento_minutos: number;
  pausado: boolean;
  mensagem_pausa: string;
  aceita_retirada: boolean;
  aceita_entrega: boolean;
  taxa_entrega_tipo: string;
  taxa_entrega_valor: number;
  valor_minimo_pedido: number;
}

export async function atualizarConfiguracoes(input: ConfiguracoesInput): Promise<void> {
  await api.put('/admin/loja', input);
}

// Variações
export interface VariacaoInput {
  nome: string;
  preco_adicional: number;
  disponivel: boolean;
  estoque_atual: number | null;
  estoque_alerta: number | null;
  ordem: number;
}

export async function listarVariacoes(produtoId: number): Promise<import('./types').VariacaoProduto[]> {
  const { data } = await api.get(`/admin/variacoes/${produtoId}`);
  return data;
}

export async function criarVariacao(produtoId: number, input: VariacaoInput): Promise<import('./types').VariacaoProduto> {
  const { data } = await api.post(`/admin/variacoes/${produtoId}`, input);
  return data;
}

export async function atualizarVariacao(produtoId: number, variacaoId: number, input: VariacaoInput): Promise<import('./types').VariacaoProduto> {
  const { data } = await api.put(`/admin/variacoes/${produtoId}/${variacaoId}`, input);
  return data;
}

export async function deletarVariacao(produtoId: number, variacaoId: number): Promise<void> {
  await api.delete(`/admin/variacoes/${produtoId}/${variacaoId}`);
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