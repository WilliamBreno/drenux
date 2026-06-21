import { api } from './client';
import type { CardapioPublico } from './types';

export async function buscarCardapio(slug: string): Promise<CardapioPublico> {
  const { data } = await api.get<CardapioPublico>(`/lojas/${slug}`);
  return data;
}
