import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buscarDashboardAfiliado, iniciarOnboardingStripeAfiliado } from '../../api/afiliado';
import { useAfiliadoAuthStore } from '../../store/afiliadoAuthStore';

function moeda(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function DashboardAfiliado() {
  const logout = useAfiliadoAuthStore((s) => s.logout);
  const [conectando, setConectando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['afiliado-dashboard'],
    queryFn: buscarDashboardAfiliado,
    refetchInterval: 60_000,
  });

  const linkIndicacao = data ? `${window.location.origin}/cadastro?ref=${data.codigo}` : '';

  async function copiarLink() {
    await navigator.clipboard.writeText(linkIndicacao);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function conectarStripe() {
    setConectando(true);
    try {
      const { url } = await iniciarOnboardingStripeAfiliado();
      window.location.href = url;
    } catch {
      setConectando(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fundo">
        <p className="text-tinta-suave">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-fundo px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl tracking-wide text-tinta">Painel do Afiliado</h1>
          <button onClick={logout} className="text-sm text-tinta-suave hover:text-acento">
            Sair
          </button>
        </div>

        {/* Link de indicação */}
        <section className="rounded-2xl bg-superficie p-5 shadow-sm">
          <h2 className="font-display text-lg tracking-wide text-tinta">Seu link de indicação</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Compartilhe esse link — toda loja que se cadastrar por ele fica vinculada a você
            permanentemente, e você recebe 3,01% de comissão em cada pedido pago.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-fundo px-4 py-3">
            <span className="min-w-0 flex-1 truncate font-carimbo text-sm text-tinta">
              {linkIndicacao}
            </span>
            <button
              onClick={copiarLink}
              className="shrink-0 rounded-full bg-acento px-3 py-1.5 text-xs font-semibold text-superficie"
            >
              {copiado ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </section>

        {/* Card de pagamento */}
        <section className="rounded-2xl bg-superficie p-5 shadow-sm">
          <h2 className="font-display text-lg tracking-wide text-tinta">Pagamento</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            A Stripe processa os repasses das suas comissões diretamente pra sua conta.
          </p>
          <div className="mt-4 flex items-center justify-between rounded-xl bg-fundo px-4 py-3">
            <span className="text-sm font-medium text-tinta">
              {data?.stripe_conectado ? 'Conta conectada' : 'Conta não conectada'}
            </span>
            <span className={`h-2.5 w-2.5 rounded-full ${data?.stripe_conectado ? 'bg-emerald-500' : 'bg-tinta/20'}`} />
          </div>
          {!data?.stripe_conectado && (
            <button
              onClick={conectarStripe}
              disabled={conectando}
              className="mt-4 rounded-full bg-acento px-4 py-2 text-sm font-semibold text-superficie disabled:opacity-60"
            >
              {conectando ? 'Abrindo...' : 'Conectar conta de pagamento'}
            </button>
          )}
        </section>

        {/* Card de ganhos */}
        <section className="rounded-2xl bg-superficie p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">Total já ganho</p>
          <p className="mt-1 font-carimbo text-3xl font-semibold text-tinta">
            {moeda(data?.total_ganho ?? 0)}
          </p>
          <p className="mt-1 text-xs text-tinta-suave">
            3,01% de comissão automática em cada pedido pago pelas lojas que você indicou.
          </p>
        </section>

        {/* Lojas indicadas */}
        <section className="rounded-2xl bg-superficie p-5 shadow-sm">
          <h2 className="font-display text-lg tracking-wide text-tinta">Lojas indicadas</h2>
          {!data?.lojas || data.lojas.length === 0 ? (
            <p className="mt-3 text-sm text-tinta-suave">
              Nenhuma loja se cadastrou pelo seu link ainda.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {data.lojas.map((loja) => (
                <li key={loja.id} className="flex items-center justify-between rounded-xl bg-fundo px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-tinta">{loja.nome}</p>
                    <p className="text-xs text-tinta-suave">desde {formatarData(loja.created_at)}</p>
                  </div>
                  <span className="text-xs text-tinta-suave">/{loja.slug}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}