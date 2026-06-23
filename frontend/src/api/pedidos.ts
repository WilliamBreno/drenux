import { api } from './client';
import type { Pedido } from './types';

interface ItemPedidoInput {
  produto_id: number;
  variacao_id?: number;
  quantidade: number;
}

interface CriarPedidoInput {
  cliente_nome: string;
  cliente_telefone: string;
  data_retirada: string;
  itens: ItemPedidoInput[];
}

export async function criarPedido(slug: string, input: CriarPedidoInput): Promise<Pedido> {
  const { data } = await api.post<Pedido>(`/lojas/${slug}/pedidos`, input);
  return data;
}

export async function criarCheckout(pedidoId: number): Promise<{ url: string }> {
  const { data } = await api.post<{ url: string }>(`/pedidos/${pedidoId}/checkout`);
  return data;
}