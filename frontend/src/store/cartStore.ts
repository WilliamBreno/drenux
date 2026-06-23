import { create } from 'zustand';
import type { ItemCarrinho, Produto, VariacaoProduto } from '../api/types';

// Chave única do item = produto_id + variacao_id (ou só produto_id se sem variação)
function chaveItem(produtoId: number, variacaoId?: number): string {
  return variacaoId ? `${produtoId}-${variacaoId}` : `${produtoId}`;
}

interface CartState {
  itens: ItemCarrinho[];
  adicionar: (produto: Produto, variacao?: VariacaoProduto) => void;
  remover: (produtoId: number, variacaoId?: number) => void;
  alterarQuantidade: (produtoId: number, quantidade: number, variacaoId?: number) => void;
  limpar: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  itens: [],

  adicionar: (produto, variacao) => {
    set((state) => {
      const chave = chaveItem(produto.id, variacao?.id);
      const existente = state.itens.find(
        (item) => chaveItem(item.produto.id, item.variacao?.id) === chave
      );
      if (existente) {
        return {
          itens: state.itens.map((item) =>
            chaveItem(item.produto.id, item.variacao?.id) === chave
              ? { ...item, quantidade: item.quantidade + 1 }
              : item
          ),
        };
      }
      return { itens: [...state.itens, { produto, variacao, quantidade: 1 }] };
    });
  },

  remover: (produtoId, variacaoId) => {
    const chave = chaveItem(produtoId, variacaoId);
    set((state) => ({
      itens: state.itens.filter(
        (item) => chaveItem(item.produto.id, item.variacao?.id) !== chave
      ),
    }));
  },

  alterarQuantidade: (produtoId, quantidade, variacaoId) => {
    const chave = chaveItem(produtoId, variacaoId);
    if (quantidade <= 0) {
      get().remover(produtoId, variacaoId);
      return;
    }
    set((state) => ({
      itens: state.itens.map((item) =>
        chaveItem(item.produto.id, item.variacao?.id) === chave
          ? { ...item, quantidade }
          : item
      ),
    }));
  },

  limpar: () => set({ itens: [] }),

  total: () =>
    get().itens.reduce(
      (soma, item) =>
        soma + (item.produto.preco + (item.variacao?.preco_adicional ?? 0)) * item.quantidade,
      0
    ),
}));