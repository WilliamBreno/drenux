import { useQuery } from '@tanstack/react-query';
import { buscarDashboard } from '../../api/admin';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

function moeda(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

export function Inicio() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: buscarDashboard,
    refetchInterval: 60_000, // atualiza a cada 1 min
  });

  if (isLoading) return <p className="text-tinta-suave">Carregando...</p>;
  if (!data) return null;

  const receita7Dias = data.receita_7_dias ?? [];
  const receita4Semanas = data.receita_4_semanas ?? [];
  const topProdutos = data.top_produtos ?? [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl tracking-wide text-tinta">Visão geral</h1>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-superficie p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">Semana</p>
          <p className="mt-1 font-carimbo text-xl font-semibold text-tinta">
            {moeda(data.total_semana)}
          </p>
        </div>
        <div className="rounded-2xl bg-superficie p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">Mês</p>
          <p className="mt-1 font-carimbo text-xl font-semibold text-tinta">
            {moeda(data.total_mes)}
          </p>
        </div>
        <div className="rounded-2xl bg-superficie p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">Pedidos</p>
          <p className="mt-1 font-carimbo text-xl font-semibold text-tinta">
            {data.pedidos_semana}
          </p>
          <p className="text-xs text-tinta-suave">últimos 7 dias</p>
        </div>
      </div>

      {/* Gráfico de receita por dia */}
      <div className="rounded-2xl bg-superficie p-5 shadow-sm">
        <h2 className="mb-4 font-display text-base tracking-wide text-tinta">Receita — últimos 7 dias</h2>
        {receita7Dias.length === 0 || receita7Dias.every((d) => d.total === 0) ? (
          <p className="py-8 text-center text-sm text-tinta-suave">Nenhum pedido pago nos últimos 7 dias.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={receita7Dias} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,33,24,0.08)" />
              <XAxis dataKey="data" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} width={55} />
              <Tooltip formatter={(v: unknown) => moeda(v as number)} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="rgb(var(--color-acento))"
                strokeWidth={2}
                dot={{ r: 4, fill: 'rgb(var(--color-acento))' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gráfico semanal */}
      <div className="rounded-2xl bg-superficie p-5 shadow-sm">
        <h2 className="mb-4 font-display text-base tracking-wide text-tinta">Receita — últimas 4 semanas</h2>
        {receita4Semanas.length === 0 || receita4Semanas.every((s) => s.total === 0) ? (
          <p className="py-8 text-center text-sm text-tinta-suave">Nenhum pedido pago nas últimas 4 semanas.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={receita4Semanas} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,33,24,0.08)" />
              <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} width={55} />
              <Tooltip formatter={(v: unknown) => moeda(v as number)} />
              <Bar dataKey="total" fill="rgb(var(--color-acento))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top produtos */}
      {topProdutos.length > 0 && (
        <div className="rounded-2xl bg-superficie p-5 shadow-sm">
          <h2 className="mb-4 font-display text-base tracking-wide text-tinta">Mais vendidos — últimos 30 dias</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={topProdutos}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,33,24,0.08)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="nome" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v: unknown) => [`${v as number} vendas`, '']} />
              <Bar dataKey="quantidade" fill="rgb(var(--color-douro))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}