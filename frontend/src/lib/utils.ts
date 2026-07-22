import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Produto, VariacaoProduto } from "../api/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// precoItem calcula o preço unitário de um produto com a variação
// selecionada — centraliza a regra dos dois modos de preço de variação:
// "aditivo" soma ao preço base, "absoluto" substitui o preço base.
export function precoItem(produto: Produto, variacao?: VariacaoProduto | null): number {
  if (!variacao) return produto.preco
  if (variacao.modo_preco === 'absoluto') return variacao.preco_adicional
  return produto.preco + variacao.preco_adicional
}
