import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface Plano {
  id: string;
  nome: string;
  mensal: number;
  taxa: number;
  desc: string;
  emoji: string;
}

const PLANOS: Plano[] = [
  { id: 'start', nome: 'Start', mensal: 0, taxa: 0.08, desc: 'Sem risco, comece de graça', emoji: '🌱' },
  { id: 'pro', nome: 'Pro', mensal: 129, taxa: 0.04, desc: 'Pra loja em crescimento', emoji: '📈' },
  { id: 'scale', nome: 'Scale', mensal: 349, taxa: 0.015, desc: 'Volume alto, custo mínimo', emoji: '🚀' },
];

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function Planos() {
  const [faturamento, setFaturamento] = useState(6000);

  const custos = useMemo(
    () => PLANOS.map((p) => ({ ...p, valorTaxa: p.taxa * faturamento, total: p.mensal + p.taxa * faturamento })),
    [faturamento]
  );
  const menorCusto = Math.min(...custos.map((c) => c.total));

  return (
    <div className="min-h-screen bg-fundo">
      {/* Header simples */}
      <header className="border-b border-tinta/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/inicio" className="font-display text-xl tracking-wide text-tinta">
            Drenux
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-tinta-suave hover:text-tinta">
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-superficie"
            >
              Criar minha loja
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {/* Título */}
        <div className="text-center">
          <h1 className="font-display text-3xl tracking-wide text-tinta sm:text-4xl">
            Um plano pra cada fase da sua loja
          </h1>
          <p className="mt-3 text-tinta-suave">
            Comece de graça, sem risco. Migre quando fizer sentido pro seu faturamento — sem multa, sem fidelidade.
          </p>
        </div>

        {/* Calculadora */}
        <div className="mt-10 rounded-2xl bg-superficie p-6 shadow-sm">
          <label className="block text-sm text-tinta-suave">Quanto sua loja fatura por mês?</label>
          <input
            type="range"
            min={0}
            max={20000}
            step={100}
            value={faturamento}
            onChange={(e) => setFaturamento(Number(e.target.value))}
            className="mt-2 w-full accent-acento"
          />
          <p className="mt-1 font-carimbo text-2xl font-semibold text-tinta">{fmt(faturamento)}</p>

          <p className="mt-4 text-sm text-tinta-suave">
            Com uma loja faturando <strong className="font-medium text-tinta">{fmt(faturamento)} por mês</strong>,
            veja o que cada plano cobra de fixo e qual seria sua projeção de investimento:
          </p>
        </div>

        {/* Cards de planos */}
        <div className="mt-6 space-y-4">
          {custos.map((p) => {
            const recomendado = p.total === menorCusto;
            const efetivo = faturamento > 0 ? (p.total / faturamento) * 100 : p.taxa * 100;
            return (
              <div
                key={p.id}
                className={`rounded-2xl bg-superficie p-5 shadow-sm ${
                  recomendado ? 'border-2 border-acento' : 'border border-tinta/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{p.emoji}</span>
                    <div>
                      <p className="font-display text-lg tracking-wide text-tinta">{p.nome}</p>
                      <p className="text-xs text-tinta-suave">{p.desc}</p>
                    </div>
                  </div>
                  {recomendado && (
                    <span className="rounded-full bg-acento/10 px-3 py-1 text-xs font-semibold text-acento">
                      Mais barato
                    </span>
                  )}
                </div>

                <p className="mb-1.5 mt-4 text-[11px] font-medium uppercase tracking-wide text-tinta-suave/70">
                  Valores fixos do plano
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-fundo px-3 py-2.5">
                    <p className="text-xs text-tinta-suave">Mensalidade</p>
                    <p className="font-carimbo text-lg font-semibold text-tinta">
                      {p.mensal === 0 ? 'R$ 0' : fmt(p.mensal)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-fundo px-3 py-2.5">
                    <p className="text-xs text-tinta-suave">Taxa por pedido</p>
                    <p className="font-carimbo text-lg font-semibold text-tinta">
                      {(p.taxa * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <p className="mb-1.5 mt-4 text-[11px] font-medium uppercase tracking-wide text-tinta-suave/70">
                  Projeção com o faturamento simulado
                </p>
                <div className="flex items-center justify-between border-t border-tinta/10 pt-3">
                  <div>
                    <p className="text-xs text-tinta-suave">
                      {fmt(p.valorTaxa)} de taxa + {p.mensal === 0 ? 'R$ 0' : fmt(p.mensal)} de mensalidade
                    </p>
                    <p className="font-carimbo text-2xl font-semibold text-tinta">
                      {fmt(p.total)}
                      <span className="text-sm font-normal text-tinta-suave"> /mês*</span>
                    </p>
                  </div>
                  <span className="rounded-lg bg-fundo px-3 py-1.5 text-sm font-semibold text-tinta">
                    {efetivo.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Aviso */}
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-superficie px-4 py-3">
          <span className="mt-0.5 text-tinta-suave">ⓘ</span>
          <p className="text-xs text-tinta-suave">
            Mensalidade e taxa são os valores fixos de cada plano. O total mostrado é uma projeção com base no
            faturamento que você simulou acima — o valor real muda conforme suas vendas no mês.
          </p>
        </div>

        {/* CTA final */}
        <div className="mt-10 text-center">
          <Link
            to="/cadastro"
            className="inline-block rounded-full bg-acento px-8 py-3 font-semibold text-superficie"
          >
            Criar minha loja grátis
          </Link>
          <p className="mt-2 text-xs text-tinta-suave">Começa sempre no plano Start — troque quando quiser.</p>
        </div>

        {/* FAQ */}
        <div className="mt-14 space-y-5">
          <h2 className="text-center font-display text-xl tracking-wide text-tinta">Perguntas frequentes</h2>

          <div className="rounded-xl bg-superficie p-4">
            <p className="font-medium text-tinta">Posso trocar de plano depois?</p>
            <p className="mt-1 text-sm text-tinta-suave">
              Sim, a qualquer momento, direto no painel — sem multa e sem fidelidade.
            </p>
          </div>

          <div className="rounded-xl bg-superficie p-4">
            <p className="font-medium text-tinta">A taxa sai automática ou eu pago à parte?</p>
            <p className="mt-1 text-sm text-tinta-suave">
              A taxa é descontada automaticamente de cada pedido pago. A mensalidade (quando houver) é cobrada
              uma vez por mês no cartão cadastrado.
            </p>
          </div>

          <div className="rounded-xl bg-superficie p-4">
            <p className="font-medium text-tinta">O que muda entre os planos em termos de recursos?</p>
            <p className="mt-1 text-sm text-tinta-suave">
              Nada. Rastreamento em tempo real, frete dinâmico, guardar e entregar depois, sistema de afiliados —
              todos os recursos do Drenux estão disponíveis em qualquer plano. Só muda como você paga.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}