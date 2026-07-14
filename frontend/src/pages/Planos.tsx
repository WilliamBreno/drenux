import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface Plano {
  id: string;
  nome: string;
  mensal: number;
  taxa: number;
  desc: string;
}

const PLANOS: Plano[] = [
  { id: 'start', nome: 'Start', mensal: 0, taxa: 0.08, desc: 'Sem risco, comece de graça' },
  { id: 'pro', nome: 'Pro', mensal: 129, taxa: 0.04, desc: 'Pra loja em crescimento' },
  { id: 'scale', nome: 'Scale', mensal: 349, taxa: 0.015, desc: 'Volume alto, custo mínimo' },
];

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const cores = {
  fundo: '#08080a',
  superficie: '#131318',
  superficieAlt: '#1c1c22',
  ouro: '#d4af6a',
  ouroClaro: '#e8cd94',
  texto: '#f2efe8',
  textoSuave: '#8f8b80',
  borda: 'rgba(212, 175, 106, 0.18)',
};

export function Planos() {
  const [faturamento, setFaturamento] = useState(6000);

  const custos = useMemo(
    () => PLANOS.map((p) => ({ ...p, valorTaxa: p.taxa * faturamento, total: p.mensal + p.taxa * faturamento })),
    [faturamento]
  );
  const menorCusto = Math.min(...custos.map((c) => c.total));

  return (
    <div style={{ background: cores.fundo, color: cores.texto, minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');
        @keyframes girar-suave {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulsar {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.75; }
        }
        .drx-serif { font-family: 'Cormorant Garamond', serif; }
        .drx-sans { font-family: 'Inter', sans-serif; }
        .drx-estrela { animation: girar-suave 22s linear infinite, pulsar 4s ease-in-out infinite; }
        input[type="range"].drx-slider {
          -webkit-appearance: none;
          height: 2px;
          background: rgba(212, 175, 106, 0.3);
          border-radius: 2px;
        }
        input[type="range"].drx-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: ${cores.ouro};
          cursor: pointer;
          box-shadow: 0 0 12px rgba(212, 175, 106, 0.6);
        }
      `}</style>

      {/* Header */}
      <header className="drx-sans" style={{ borderBottom: `1px solid ${cores.borda}` }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link to="/inicio" style={{ color: cores.texto, letterSpacing: '0.15em', fontSize: '14px', fontWeight: 600 }}>
            DRENUX
          </Link>
          <div className="flex items-center gap-5">
            <Link to="/login" style={{ color: cores.textoSuave, fontSize: '14px' }}>
              Entrar
            </Link>
            <Link
              to="/cadastro"
              style={{
                background: cores.ouro,
                color: cores.fundo,
                fontSize: '13px',
                fontWeight: 600,
                padding: '8px 18px',
                borderRadius: '999px',
              }}
            >
              Criar minha loja
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — a estrela é a tese da página */}
      <section className="flex flex-col items-center px-6 pb-16 pt-20 text-center">
        <svg
          className="drx-estrela"
          width="88"
          height="88"
          viewBox="0 0 100 100"
          style={{ marginBottom: '28px' }}
        >
          <defs>
            <linearGradient id="ouroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={cores.ouroClaro} />
              <stop offset="100%" stopColor={cores.ouro} />
            </linearGradient>
          </defs>
          <path
            d="M50 4 C50 30 30 50 4 50 C30 50 50 70 50 96 C50 70 70 50 96 50 C70 50 50 30 50 4 Z"
            fill="url(#ouroGrad)"
          />
        </svg>

        <h1 className="drx-serif" style={{ fontSize: 'clamp(2.2rem, 6vw, 3.4rem)', fontWeight: 500, lineHeight: 1.15, maxWidth: '640px' }}>
          Um plano pra cada fase da sua loja
        </h1>
        <p className="drx-sans" style={{ color: cores.textoSuave, marginTop: '18px', maxWidth: '440px', fontSize: '15px', lineHeight: 1.7 }}>
          Comece de graça, sem risco. Migre quando o faturamento pedir — sem multa, sem fidelidade.
        </p>
      </section>

      {/* Calculadora + cards */}
      <section className="drx-sans mx-auto max-w-2xl px-6 pb-24">
        <div
          style={{
            background: cores.superficie,
            border: `1px solid ${cores.borda}`,
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '32px',
          }}
        >
          <label style={{ fontSize: '13px', color: cores.textoSuave }}>Quanto sua loja fatura por mês?</label>
          <input
            type="range"
            className="drx-slider"
            min={0}
            max={20000}
            step={100}
            value={faturamento}
            onChange={(e) => setFaturamento(Number(e.target.value))}
            style={{ width: '100%', marginTop: '10px' }}
          />
          <p className="drx-serif" style={{ fontSize: '30px', fontWeight: 500, marginTop: '10px', color: cores.ouroClaro }}>
            {fmt(faturamento)}
          </p>
        </div>

        <div className="space-y-4">
          {custos.map((p) => {
            const recomendado = p.total === menorCusto;
            const efetivo = faturamento > 0 ? (p.total / faturamento) * 100 : p.taxa * 100;
            return (
              <div
                key={p.id}
                style={{
                  background: cores.superficie,
                  border: recomendado ? `1px solid ${cores.ouro}` : `1px solid ${cores.borda}`,
                  borderRadius: '16px',
                  padding: '22px',
                  boxShadow: recomendado ? '0 0 0 1px rgba(212,175,106,0.15), 0 12px 32px rgba(212,175,106,0.06)' : 'none',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="drx-serif" style={{ fontSize: '22px', fontWeight: 500, color: cores.texto }}>
                      {p.nome}
                    </p>
                    <p style={{ fontSize: '12.5px', color: cores.textoSuave, marginTop: '2px' }}>{p.desc}</p>
                  </div>
                  {recomendado && (
                    <span
                      style={{
                        background: 'rgba(212,175,106,0.12)',
                        color: cores.ouroClaro,
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '5px 12px',
                        borderRadius: '999px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Mais barato
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '10.5px', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '18px 0 8px' }}>
                  Valores fixos do plano
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div style={{ background: cores.superficieAlt, borderRadius: '10px', padding: '10px 12px' }}>
                    <p style={{ fontSize: '11.5px', color: cores.textoSuave }}>Mensalidade</p>
                    <p style={{ fontSize: '17px', fontWeight: 600 }}>{p.mensal === 0 ? 'R$ 0' : fmt(p.mensal)}</p>
                  </div>
                  <div style={{ background: cores.superficieAlt, borderRadius: '10px', padding: '10px 12px' }}>
                    <p style={{ fontSize: '11.5px', color: cores.textoSuave }}>Taxa por pedido</p>
                    <p style={{ fontSize: '17px', fontWeight: 600 }}>{(p.taxa * 100).toFixed(1)}%</p>
                  </div>
                </div>

                <p style={{ fontSize: '10.5px', color: cores.textoSuave, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '18px 0 8px' }}>
                  Projeção com o faturamento simulado
                </p>
                <div
                  className="flex items-center justify-between"
                  style={{ borderTop: `1px solid ${cores.borda}`, paddingTop: '14px' }}
                >
                  <div>
                    <p style={{ fontSize: '11.5px', color: cores.textoSuave }}>
                      {fmt(p.valorTaxa)} de taxa + {p.mensal === 0 ? 'R$ 0' : fmt(p.mensal)} de mensalidade
                    </p>
                    <p className="drx-serif" style={{ fontSize: '28px', fontWeight: 500, color: cores.ouroClaro }}>
                      {fmt(p.total)}
                      <span className="drx-sans" style={{ fontSize: '13px', fontWeight: 400, color: cores.textoSuave }}> /mês*</span>
                    </p>
                  </div>
                  <span style={{ background: cores.superficieAlt, fontSize: '13px', fontWeight: 600, padding: '7px 12px', borderRadius: '10px' }}>
                    {efetivo.toFixed(1)}%
                  </span>
                </div>

                <Link
                  to={p.id === 'start' ? '/cadastro' : `/cadastro?plano=${p.id}`}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    marginTop: '18px',
                    background: cores.ouro,
                    color: cores.fundo,
                    fontWeight: 600,
                    fontSize: '14px',
                    padding: '12px',
                    borderRadius: '999px',
                  }}
                >
                  Escolher {p.nome}
                </Link>
              </div>
            );
          })}
        </div>

        <div
          className="flex items-start gap-2"
          style={{ marginTop: '20px', background: cores.superficie, border: `1px solid ${cores.borda}`, borderRadius: '12px', padding: '14px 16px' }}
        >
          <span style={{ color: cores.textoSuave }}>ⓘ</span>
          <p style={{ fontSize: '12px', color: cores.textoSuave, lineHeight: 1.6 }}>
            Mensalidade e taxa são os valores fixos de cada plano. O total mostrado é uma projeção com base no
            faturamento que você simulou acima — o valor real muda conforme suas vendas no mês.
          </p>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: '64px' }}>
          <h2 className="drx-serif" style={{ textAlign: 'center', fontSize: '26px', fontWeight: 500, marginBottom: '24px' }}>
            Perguntas frequentes
          </h2>

          {[
            {
              p: 'Posso trocar de plano depois?',
              r: 'Sim, a qualquer momento, direto no painel — sem multa e sem fidelidade.',
            },
            {
              p: 'A taxa sai automática ou eu pago à parte?',
              r: 'A taxa é descontada automaticamente de cada pedido pago. A mensalidade (quando houver) é cobrada uma vez por mês no cartão cadastrado.',
            },
            {
              p: 'O que muda entre os planos em termos de recursos?',
              r: 'Nada. Rastreamento em tempo real, frete dinâmico, guardar e entregar depois, sistema de afiliados — todos os recursos do Drenux estão disponíveis em qualquer plano. Só muda como você paga.',
            },
          ].map((item) => (
            <div
              key={item.p}
              style={{
                background: cores.superficie,
                border: `1px solid ${cores.borda}`,
                borderRadius: '12px',
                padding: '16px 18px',
                marginBottom: '12px',
              }}
            >
              <p style={{ fontWeight: 600, fontSize: '14.5px' }}>{item.p}</p>
              <p style={{ marginTop: '6px', fontSize: '13.5px', color: cores.textoSuave, lineHeight: 1.6 }}>{item.r}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}