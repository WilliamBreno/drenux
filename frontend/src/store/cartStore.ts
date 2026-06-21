import { create } from 'zustand';
import type { ItemCarrinho, Produto } from '../api/types';

interface CartState {
  itens: ItemCarrinho[];
  adicionar: (produto: Produto) => void;
  remover: (produtoId: number) => void;
  alterarQuantidade: (produtoId: number, quantidade: number) => void;
  limpar: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  itens: [],

  adicionar: (produto) => {
    set((state) => {
      const existente = state.itens.find((item) => item.produto.id === produto.id);
      if (existente) {
        return {
          itens: state.itens.map((item) =>
            item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
          ),
        };
      }
      return { itens: [...state.itens, { produto, quantidade: 1 }] };
    });
  },

  remover: (produtoId) => {
    set((state) => ({ itens: state.itens.filter((item) => item.produto.id !== produtoId) }));
  },

  alterarQuantidade: (produtoId, quantidade) => {
    if (quantidade <= 0) {
      get().remover(produtoId);
      return;
    }
    set((state) => ({
      itens: state.itens.map((item) =>
        item.produto.id === produtoId ? { ...item, quantidade } : item
      ),
    }));
  },

  limpar: () => set({ itens: [] }),

  total: () => get().itens.reduce((soma, item) => soma + item.produto.preco * item.quantidade, 0),
}));
