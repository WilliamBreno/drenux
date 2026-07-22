// Dados dos planos (Start/Pro/Scale) e cálculo de custo — extraído de
// MeuPlano.tsx pra ser reaproveitado também no alerta proativo de Início.tsx,
// sem duplicar os números de mensalidade/taxa em dois lugares.
export interface PlanoInfo {
  id: 'start' | 'pro' | 'scale';
  nome: string;
  mensal: number;
  taxa: number;
  desc: string;
}

export const PLANOS: PlanoInfo[] = [
  { id: 'start', nome: 'Start', mensal: 0, taxa: 0.08, desc: 'Sem risco, comece de graça' },
  { id: 'pro', nome: 'Pro', mensal: 129, taxa: 0.04, desc: 'Pra loja em crescimento' },
  { id: 'scale', nome: 'Scale', mensal: 349, taxa: 0.015, desc: 'Volume alto, custo mínimo' },
];

export function custoPlano(plano: PlanoInfo, faturamento: number): number {
  return plano.mensal + plano.taxa * faturamento;
}

// planoMaisBarato devolve, entre os três planos, o de menor custo total
// pro faturamento informado (em caso de empate, o primeiro da lista).
export function planoMaisBarato(faturamento: number): PlanoInfo {
  return PLANOS.reduce((menor, p) =>
    custoPlano(p, faturamento) < custoPlano(menor, faturamento) ? p : menor
  );
}
