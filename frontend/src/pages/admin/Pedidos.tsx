import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listarPedidos } from '../../api/admin';
import type { Pedido, StatusPedido } from '../../api/types';

const statusInfo: Record<StatusPedido, { label: string; classe: string }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', classe: 'bg-douro/20 text-douro' },
  pago: { label: 'Pago', classe: 'bg-emerald-100 text-emerald-700' },
  cancelado: { label: 'Cancelado', classe: 'bg-acento/10 text-acento' },
};

const filtros: { valor: 'todos' | StatusPedido; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'pago', label: 'Pagos' },
  { valor: 'aguardando_pagamento', label: 'Aguardando' },
  { valor: 'cancelado', label: 'Cancelados' },
];

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Pedidos() {
  // Atualiza sozinho a cada 30s — um pedido novo pode chegar a qualquer
  // momento enquanto o dono está com essa tela aberta.
  const { data: pedidos, isLoading } = useQuery({
    queryKey: ['pedidos'],
    queryFn: listarPedidos,
    refetchInterval: 30_000,
  });

  const [filtro, setFiltro] = useState<'todos' | StatusPedido>('todos');

  const pedidosFiltrados =
    pedidos?.filter((pedido) => filtro === 'todos' || pedido.status === filtro) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl tracking-wide text-tinta">Pedidos</h1>

      <div className="flex gap-2 overflow-x-auto">
        {filtros.map((item) => (
          <button
            key={item.valor}
            onClick={() => setFiltro(item.valor)}
            className={`shrink-0 rounded-full border-2 px-4 py-1.5 text-sm font-medium transition ${
              filtro === item.valor
                ? 'border-acento bg-acento text-superficie'
                : 'border-tinta/15 bg-superficie text-tinta-suave hover:border-tinta/30'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-tinta-suave">Carregando pedidos...</p>
      ) : pedidosFiltrados.length === 0 ? (
        <p className="text-tinta-suave">Nenhum pedido por aqui ainda.</p>
      ) : (
        <ul className="space-y-3">
          {pedidosFiltrados.map((pedido) => (
            <PedidoCard key={pedido.id} pedido={pedido} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PedidoCard({ pedido }: { pedido: Pedido }) {
  const status = statusInfo[pedido.status];

  return (
    <li className="rounded-2xl bg-superficie p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-tinta">
            {pedido.cliente_nome} <span className="text-tinta-suave">· #{pedido.id}</span>
          </p>
          <p className="text-sm text-tinta-suave">{pedido.cliente_telefone}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${status.classe}`}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-3 space-y-1 border-t border-tinta/10 pt-3">
        {pedido.itens.map((item) => (
          <p key={item.id} className="text-sm text-tinta">
            {item.quantidade}x {item.produto_nome}{' '}
            <span className="text-tinta-suave">
              · R$ {(item.preco_unit * item.quantidade).toFixed(2).replace('.', ',')}
            </span>
          </p>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-tinta/10 pt-3 text-sm">
        <div>
          <span className="text-tinta-suave">
            {pedido.modo_entrega === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'}
          </span>
          {pedido.modo_entrega === 'entrega' && pedido.endereco_entrega && (
            <p className="mt-0.5 text-xs text-tinta-suave">{pedido.endereco_entrega}</p>
          )}
          <p className="mt-0.5 text-xs text-tinta-suave">{formatarData(pedido.data_retirada)}</p>
          {pedido.cupom_codigo && (
            <p className="mt-0.5 text-xs text-emerald-600">
              Cupom {pedido.cupom_codigo} · -R$ {pedido.desconto.toFixed(2).replace('.', ',')}
            </p>
          )}
        </div>
        <span className="font-carimbo font-semibold text-tinta">
          R$ {pedido.total.toFixed(2).replace('.', ',')}
        </span>
      </div>
    </li>
  );
}