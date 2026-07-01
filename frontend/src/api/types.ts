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

export interface VariacaoProduto {
  id: number;
  produto_id: number;
  nome: string;
  preco_adicional: number;
  disponivel: boolean;
  estoque_atual: number | null;
  estoque_alerta: number | null;
  ordem: number;
}

export interface FotoProduto {
  id: number;
  produto_id: number;
  url: string;
  ordem: number;
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
  fotos?: FotoProduto[];
  disponivel: boolean;
  estoque_atual: number | null;
  estoque_alerta: number | null;
  variacoes?: VariacaoProduto[];
  created_at: string;
  updated_at: string;
}

export interface DashboardData {
  total_semana: number;
  total_mes: number;
  pedidos_semana: number;
  receita_7_dias: { data: string; total: number }[];
  receita_4_semanas: { semana: string; total: number }[];
  top_produtos: { nome: string; quantidade: number }[];
}

export interface Loja {
  id: number;
  usuario_id: number;
  nome: string;
  slug: string;
  whatsapp_numero: string;
  logo_url: string;
  modo_pedido: 'imediato' | 'agendado';
  antecedencia_minima_horas: number;
  horario_abertura: string;
  horario_fechamento: string;
  margem_fechamento_minutos: number;
  pausado: boolean;
  mensagem_pausa: string;
  aceita_retirada: boolean;
  aceita_entrega: boolean;
  taxa_entrega_tipo: 'fixa' | 'combinado';
  taxa_entrega_valor: number;
  valor_minimo_pedido: number;
  tema: string;
  created_at: string;
  updated_at: string;
}

export interface CardapioPublico {
  loja: {
    nome: string;
    slug: string;
    logo_url: string;
    modo_pedido: 'imediato' | 'agendado';
    antecedencia_minima_horas: number;
    horario_abertura: string;
    horario_fechamento: string;
    margem_fechamento_minutos: number;
    pausado: boolean;
    mensagem_pausa: string;
    aceita_retirada: boolean;
    aceita_entrega: boolean;
    taxa_entrega_tipo: 'fixa' | 'combinado';
    taxa_entrega_valor: number;
    valor_minimo_pedido: number;
    tema: string;
  };
  categorias: Categoria[];
  produtos: Produto[];
}

export type StatusPedido = 'aguardando_pagamento' | 'pago' | 'cancelado';

export interface ItemPedido {
  id: number;
  pedido_id: number;
  produto_id: number;
  produto_nome: string;
  variacao_id: number | null;
  variacao_nome: string;
  quantidade: number;
  preco_unit: number;
}

export interface Cupom {
  id: number;
  loja_id: number;
  codigo: string;
  tipo: 'percentual' | 'fixo';
  valor: number;
  ativo: boolean;
  uso_maximo: number | null;
  uso_atual: number;
  validade: string | null;
  valor_minimo_pedido: number;
  created_at: string;
  updated_at: string;
}

export interface Pedido {
  id: number;
  loja_id: number;
  cliente_nome: string;
  cliente_telefone: string;
  data_retirada: string;
  status: StatusPedido;
  total: number;
  modo_entrega: 'retirada' | 'entrega';
  endereco_entrega: string;
  cupom_codigo: string;
  desconto: number;
  itens: ItemPedido[];
  created_at: string;
  updated_at: string;
}

// Carrinho — estado só do front, nunca enviado direto pra API. Na hora
// de criar o pedido, viram { produto_id, variacao_id, quantidade } no payload.
export interface ItemCarrinho {
  produto: Produto;
  variacao?: VariacaoProduto; // undefined = produto sem variação
  quantidade: number;
}