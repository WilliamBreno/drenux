import { api } from './client';

export interface ResultadoCupom {
  valido: boolean;
  desconto: number;
  tipo: 'percentual' | 'fixo';
  valor: number;
}

export async function validarCupom(
  slug: string,
  codigo: string,
  subtotal: number,
): Promise<ResultadoCupom> {
  const { data } = await api.post(`/lojas/${slug}/cupons/validar`, {
    codigo: codigo.trim().toUpperCase(),
    subtotal,
  });
  return data;
}