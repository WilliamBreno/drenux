import { api } from './client';
import type { ItemGuardado, SolicitacaoEntrega } from './types';

export async function listarGuardados(slug: string, telefone: string): Promise<ItemGuardado[]> {
  const { data } = await api.get<ItemGuardado[]>(`/lojas/${slug}/guardados`, {
    params: { telefone },
  });
  return data;
}

interface CotarFreteGuardadosResponse {
  distancia_km: number;
  mesma_regiao: boolean;
  valor_frete: number;
}

export async function cotarFreteGuardados(
  slug: string,
  telefone: string,
  endereco: string,
  itemIds: number[],
): Promise<CotarFreteGuardadosResponse> {
  const { data } = await api.post<CotarFreteGuardadosResponse>(`/lojas/${slug}/guardados/cotar-frete`, {
    telefone,
    endereco,
    item_ids: itemIds,
  });
  return data;
}

interface SolicitarEntregaInput {
  cliente_nome: string;
  cliente_telefone: string;
  endereco: string;
  item_ids: number[];
}

export async function solicitarEntregaGuardados(slug: string, input: SolicitarEntregaInput): Promise<SolicitacaoEntrega> {
  const { data } = await api.post<SolicitacaoEntrega>(`/lojas/${slug}/guardados/solicitar-entrega`, input);
  return data;
}

export async function criarCheckoutFrete(solicitacaoId: number): Promise<{ url: string }> {
  const { data } = await api.post<{ url: string }>(`/solicitacoes/${solicitacaoId}/checkout`);
  return data;
}
