import { api } from './client';
import type { Pedido } from './types';

export async function buscarHistorico(slug: string, telefone: string): Promise<Pedido[]> {
  const { data } = await api.get(`/lojas/${slug}/historico`, {
    params: { telefone },
  });
  return data;
}