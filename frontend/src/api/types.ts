// Tipos espelhando os modelos do backend (internal/domain). Mantém o
// front em sincronia com o que a API realmente devolve — se um campo
// mudar lá, é só atualizar aqui também.

export interface Categoria {
  id: number;
  loja_id: number;
  nome: string;
  created_at: string;
  updated_at: string;
}

export interface Produto {
  id: number;
  loja_id: number;
  categoria_id: number;
  categoria?: Categoria;
  nome: string;
  descricao: string;
  preco: number;
  foto_url: string;
  disponivel: boolean;
  created_at: string;
  updated_at: string;
}

export interface Loja {
  id: number;
  usuario_id: number;
  nome: string;
  slug: string;
  whatsapp_numero: string;
  logo_url: string;
  permite_mesmo_dia: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardapioPublico {
  loja: { nome: string; slug: string; permite_mesmo_dia: boolean; logo_url: string };
  categorias: Categoria[];
  produtos: Produto[];
}

export type StatusPedido = 'aguardando_pagamento' | 'pago' | 'cancelado';

export interface ItemPedido {
  id: number;
  pedido_id: number;
  produto_id: number;
  produto_nome: string;
  quantidade: number;
  preco_unit: number;
}

export interface Pedido {
  id: number;
  loja_id: number;
  cliente_nome: string;
  cliente_telefone: string;
  data_retirada: string;
  status: StatusPedido;
  total: number;
  itens: ItemPedido[];
  created_at: string;
  updated_at: string;
}

// Carrinho — estado só do front, nunca enviado direto pra API. Na hora
// de criar o pedido, viram { produto_id, quantidade } no payload.
export interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
}