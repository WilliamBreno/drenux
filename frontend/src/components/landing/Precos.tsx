import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { criarCheckoutAssinatura } from '../../api/planos';
import { PLANOS, custoPlano, taxaEfetivaPlano, RECURSOS_POR_PLANO, FATURAMENTO_MAX_SIMULADOR } from '../../lib/planos';
import { brl } from './dados';

// Faixa de comissão de app de delivery citada em audiência pública na
// Câmara dos Deputados (abr/2025): 12% a 27% por pedido, fora mensalidade
// e taxa de pagamento online. Usada só pra comparação ilustrativa.
const APP_MIN = 0.12;
const APP_MAX = 0.27;

// Blocos que sobem em degrau como um gráfico de barras: plano maior,
// bloco maior. Cor chapada por plano, faixa inferior mais escura é o botão.
const ESTILO_PLANO: Record<string, { fundo: string; tinta: string; faixa: string; faixaTinta: string; altura: string }> = {
  start: { fundo: '#ffffff', tinta: 'var(--l-tinta)', faixa: '#e9e9e9', faixaTinta: 'var(--l-tinta)', altura: 'md:min-h-[440px]' },
  basic: { fundo: 'var(--l-hortela)', tinta: 'var(--l-tinta)', faixa: '#bfe3d9', faixaTinta: 'var(--l-tinta)', altura: 'md:min-h-[500px]' },
  pro: { fundo: 'var(--l-oceano)', tinta: 'var(--l-papel)', faixa: '#005a8a', faixaTinta: 'var(--l-papel)', altura: 'md:min-h-[600px]' },
  scale: { fundo: 'var(--l-preto)', tinta: 'var(--l-papel)', faixa: 'var(--l-ouro)', faixaTinta: 'var(--l-tinta)', altura: 'md:min-h-[680px]' },
};

const POSICAO: Record<string, string> = {
  start: 'md:col-start-1 md:row-start-2',
  basic: 'md:col-start-2 md:row-start-2',
  pro: 'md:col-start-3 md:row-span-2 md:row-start-1',
  scale: 'md:col-start-4 md:row-span-2 md:row-start-1',
};

export function Precos() {
  const navigate = useNavigate();
  const [faturamento, setFaturamento] = useState(6000);
  const [carregando, setCarregando] = useState<string | null>(null);

  const custos = useMemo(() => PLANOS.map((p) => ({ ...p, total: custoPlano(p, faturamento) })), [faturamento]);
  const menorCusto = Math.min(...custos.filter((c) => c.faixas.length > 0).map((c) => c.total));
  const pct = (faturamento / FATURAMENTO_MAX_SIMULADOR) * 100;

  async function escolherPlano(planoId: string) {
    if (planoId === 'start' || planoId === 'basic') {
      // plano_desejado (não `plano`) pra não colidir com o `?plano=` que
      // Cadastro.tsx já usa pro banner de "pagamento confirmado" no
      // retorno do checkout de Pro/Scale — aqui não houve pagamento nenhum.
      navigate(`/cadastro?plano_desejado=${planoId}`);
      return;
    }
    setCarregando(planoId);
    try {
      const { url } = await criarCheckoutAssinatura(planoId as 'pro' | 'scale');
      window.location.assign(url);
    } catch {
      setCarregando(null);
    }
  }

  return (
    <section id="planos" aria-label="Planos" className="l-margem bg-[var(--l-amarelo)] py-16 text-[var(--l-tinta)] md:py-24">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        {/* Título + calculadora, no espaço acima dos dois blocos menores */}
        <div className="mb-8 md:col-span-2 md:col-start-1 md:row-start-1 md:mb-10 md:pr-10">
          <h2 className="l-revela text-[clamp(2.75rem,10vw,5rem)] font-medium leading-[0.92] tracking-[-0.045em] md:text-[clamp(3rem,4.6vw,5rem)]">
            Quanto custa
          </h2>
          <label htmlFor="faturamento" className="mt-6 block text-[clamp(1.5rem,2.4vw,2.25rem)] leading-tight tracking-[-0.02em]">
            Vendendo <strong className="l-num font-medium">{brl(faturamento, 0)}</strong> por mês
          </label>
          <div className="l-faixa mt-3 text-[var(--l-tinta)]">
            <div className="l-trilho">
              <div className="l-trilho__cheio" style={{ width: `${pct}%` }} />
            </div>
            <input
              id="faturamento"
              type="range"
              min={0}
              max={FATURAMENTO_MAX_SIMULADOR}
              step={500}
              value={faturamento}
              onChange={(e) => setFaturamento(Number(e.target.value))}
              aria-valuetext={brl(faturamento, 0)}
              className="l-range"
            />
          </div>
          <p className="mt-4 max-w-[46ch] text-[17px] leading-snug">
            Num app de delivery, de 12% a 27% por pedido, isso viraria{' '}
            <strong className="l-num font-semibold">
              {brl(faturamento * APP_MIN, 0)} a {brl(faturamento * APP_MAX, 0)}
            </strong>{' '}
            de comissão por mês. Aqui, compare plano por plano:
          </p>
        </div>

        {custos.map((p, idx) => {
          const e = ESTILO_PLANO[p.id];
          const semSplit = p.faixas.length === 0;
          const recomendado = !semSplit && p.total === menorCusto;
          const efetivo = taxaEfetivaPlano(p, faturamento) * 100;
          // Do Basic em diante, só o que muda em relação ao plano anterior —
          // a lista inteira repetida em quatro blocos esconde a diferença.
          const anterior = idx > 0 ? custos[idx - 1] : null;
          const inclusos = RECURSOS_POR_PLANO.filter(
            (r) => r.valores[p.id] !== '—' && (!anterior || r.valores[p.id] !== r.valores[anterior.id])
          );
          return (
            <article
              key={p.id}
              className={`flex flex-col self-end ${e.altura} ${POSICAO[p.id]}`}
              style={{ background: e.fundo, color: e.tinta }}
            >
              <div className="flex-1 p-6 md:p-7">
                <h3 className="text-[28px] font-medium leading-none tracking-[-0.02em]">{p.nome}</h3>
                <p className="mt-1 text-[15px]">{p.desc}</p>
                <p className="l-num mt-5 text-[clamp(2.75rem,4vw,3.5rem)] font-medium leading-none tracking-[-0.04em]">
                  {brl(p.total, 0)}
                  <span className="text-[17px] font-normal tracking-normal"> /mês</span>
                </p>
                <p className="mt-2 text-[15px] leading-snug">
                  {semSplit
                    ? 'Sem mensalidade e sem taxa. Até 30 pedidos por mês.'
                    : `${p.mensal === 0 ? 'Sem mensalidade' : `${brl(p.mensal)} de mensalidade`} + taxa média de ${efetivo
                        .toFixed(2)
                        .replace('.', ',')}% com esse faturamento`}
                </p>
                {recomendado && (
                  <p className="mt-3 flex items-center gap-2 text-[15px] font-semibold">
                    <Check className="h-4 w-4" strokeWidth={2.5} /> O mais barato pra você
                  </p>
                )}
                {anterior && <p className="mt-5 text-[15px] font-semibold">Tudo do {anterior.nome}, mais:</p>}
                <ul className={`${anterior ? 'mt-2' : 'mt-5'} space-y-1.5 text-[15px] leading-snug`}>
                  {inclusos.map((r) => {
                    const v = r.valores[p.id];
                    return (
                      <li key={r.label}>
                        {r.label}
                        {v !== '✓' ? `: ${v}` : ''} {/* taste-skill-ignore: compara com o marcador de lib/planos.ts, não é exibido */}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => escolherPlano(p.id)}
                disabled={carregando === p.id}
                className="flex h-16 items-center px-6 text-left text-[17px] font-medium transition-[filter] hover:brightness-95 disabled:opacity-70 md:px-7"
                style={{ background: e.faixa, color: e.faixaTinta }}
              >
                {carregando === p.id ? 'Abrindo pagamento…' : `Escolher ${p.nome}`}
              </button>
            </article>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 text-[15px] leading-snug md:grid-cols-3">
        <p>
          O total é uma projeção com o faturamento que você escolheu. O valor real acompanha as suas vendas do mês, e
          a taxa sai sozinha de cada pedido pago.
        </p>
        <p>
          O Start não cobra nada, mas tem limite de 30 pedidos e 30 produtos por mês. Passou disso, o Basic também não
          tem mensalidade.
        </p>
        <p>
          Comissão de app de delivery: faixa de 12% a 27% por pedido citada em audiência pública na Câmara dos
          Deputados (abril de 2025), sem contar mensalidade e taxa de pagamento online.
        </p>
      </div>
    </section>
  );
}
