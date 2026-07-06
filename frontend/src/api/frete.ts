import { api } from './client';

interface CotarFreteResponse {
  distancia_km: number;
  valor_frete: number;
}

export async function cotarFrete(slug: string, endereco: string): Promise<CotarFreteResponse> {
  const { data } = await api.post<CotarFreteResponse>(`/lojas/${slug}/cotar-frete`, { endereco });
  return data;
}