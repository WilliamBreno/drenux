import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { criarCheckoutAssinatura } from '../api/planos';

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

// Sobrescreve só os tokens de cor do shadcn dentro dessa página — preto
// e dourado, puxados da marca. Não mexe em nada do sistema de temas do
// cardápio público (--color-fundo, --color-tinta etc.), que usa
// variáveis completamente diferentes.
const temaPlanos = {
  '--background': '#08080a',
  '--foreground': '#f2efe8',
  '--card': '#131318',
  '--card-foreground': '#f2efe8',
  '--popover': '#131318',
  '--popover-foreground': '#f2efe8',
  '--primary': '#d4af6a',
  '--primary-foreground': '#08080a',
  '--secondary': '#1c1c22',
  '--secondary-foreground': '#f2efe8',
  '--muted': '#1c1c22',
  '--muted-foreground': '#8f8b80',
  '--accent': '#1c1c22',
  '--accent-foreground': '#d4af6a',
  '--border': 'rgba(212, 175, 106, 0.18)',
  '--input': 'rgba(212, 175, 106, 0.18)',
  '--ring': '#d4af6a',
} as React.CSSProperties;

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function Planos() {
  const navigate = useNavigate();
  const [faturamento, setFaturamento] = useState(6000);
  const [carregando, setCarregando] = useState<string | null>(null);

  const custos = useMemo(
    () => PLANOS.map((p) => ({ ...p, valorTaxa: p.taxa * faturamento, total: p.mensal + p.taxa * faturamento })),
    [faturamento]
  );
  const menorCusto = Math.min(...custos.map((c) => c.total));

  async function escolherPlano(planoId: string) {
    if (planoId === 'start') {
      navigate('/cadastro');
      return;
    }
    setCarregando(planoId);
    try {
      const { url } = await criarCheckoutAssinatura(planoId as 'pro' | 'scale');
      window.location.href = url;
    } catch {
      setCarregando(null);
    }
  }

  return (
    <div style={temaPlanos} className="min-h-screen bg-background text-foreground">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&display=swap');
        .drx-serif { font-family: 'Cormorant Garamond', serif; }
        @keyframes drx-girar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes drx-pulsar { 0%, 100% { opacity: 1; } 50% { opacity: 0.75; } }
        .drx-estrela { animation: drx-girar 22s linear infinite, drx-pulsar 4s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <button onClick={() => navigate('/inicio')} className="text-sm font-semibold tracking-widest text-foreground">
            DRENUX
          </button>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Entrar
            </Button>
            <Button size="sm" onClick={() => navigate('/cadastro')}>
              Criar minha loja
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center px-6 pb-16 pt-20 text-center">
        <svg className="drx-estrela mb-7" width="88" height="88" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="ouroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e8cd94" />
              <stop offset="100%" stopColor="#d4af6a" />
            </linearGradient>
          </defs>
          <path
            d="M50 4 C50 30 30 50 4 50 C30 50 50 70 50 96 C50 70 70 50 96 50 C70 50 50 30 50 4 Z"
            fill="url(#ouroGrad)"
          />
        </svg>

        <h1 className="drx-serif max-w-xl text-4xl font-medium leading-tight sm:text-5xl">
          Um plano pra cada fase da sua loja
        </h1>
        <p className="mt-4 max-w-md text-sm text-muted-foreground">
          Comece de graça, sem risco. Migre quando o faturamento pedir — sem multa, sem fidelidade.
        </p>
      </section>

      {/* Calculadora + planos */}
      <section className="mx-auto max-w-2xl px-6 pb-24">
        <Card className="mb-8">
          <CardHeader>
            <CardDescription>Quanto sua loja fatura por mês?</CardDescription>
            <CardTitle className="drx-serif text-3xl font-medium text-primary">
              R$ <NumberTicker value={faturamento} className="text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Slider
              value={[faturamento]}
              onValueChange={(v) => setFaturamento(Array.isArray(v) ? v[0] : v)}
              min={0}
              max={20000}
              step={100}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {custos.map((p) => {
            const recomendado = p.total === menorCusto;
            const efetivo = faturamento > 0 ? (p.total / faturamento) * 100 : p.taxa * 100;

            return (
              <Card key={p.id} className={recomendado ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="drx-serif text-xl font-medium">{p.nome}</CardTitle>
                      <CardDescription>{p.desc}</CardDescription>
                    </div>
                    {recomendado && <Badge className="bg-primary text-primary-foreground">Mais barato</Badge>}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Valores fixos do plano
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-secondary px-3 py-2.5">
                        <p className="text-xs text-muted-foreground">Mensalidade</p>
                        <p className="text-lg font-semibold">{p.mensal === 0 ? 'R$ 0' : fmt(p.mensal)}</p>
                      </div>
                      <div className="rounded-lg bg-secondary px-3 py-2.5">
                        <p className="text-xs text-muted-foreground">Taxa por pedido</p>
                        <p className="text-lg font-semibold">{(p.taxa * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Projeção com o faturamento simulado
                    </p>
                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {fmt(p.valorTaxa)} de taxa + {p.mensal === 0 ? 'R$ 0' : fmt(p.mensal)} de mensalidade
                        </p>
                        <p className="drx-serif text-2xl font-medium text-primary">
                          R$ <NumberTicker value={p.total} className="text-primary" />
                          <span className="drx-serif text-sm font-normal text-muted-foreground"> /mês*</span>
                        </p>
                      </div>
                      <span className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-semibold">
                        {efetivo.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter>
                  {recomendado ? (
                    <ShimmerButton
                      onClick={() => escolherPlano(p.id)}
                      disabled={carregando === p.id}
                      background="#d4af6a"
                      shimmerColor="#ffffff"
                      className="w-full text-sm font-semibold text-background"
                    >
                      {carregando === p.id ? 'Abrindo pagamento...' : `Escolher ${p.nome}`}
                    </ShimmerButton>
                  ) : (
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => escolherPlano(p.id)}
                      disabled={carregando === p.id}
                    >
                      {carregando === p.id ? 'Abrindo pagamento...' : `Escolher ${p.nome}`}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Aviso */}
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-card px-4 py-3 ring-1 ring-border">
          <span className="text-muted-foreground">ⓘ</span>
          <p className="text-xs text-muted-foreground">
            Mensalidade e taxa são os valores fixos de cada plano. O total mostrado é uma projeção com base no
            faturamento que você simulou acima — o valor real muda conforme suas vendas no mês.
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="drx-serif mb-6 text-center text-2xl font-medium">Perguntas frequentes</h2>
          <Accordion>
            <AccordionItem value="troca">
              <AccordionTrigger>Posso trocar de plano depois?</AccordionTrigger>
              <AccordionContent>
                Sim, a qualquer momento, direto no painel — sem multa e sem fidelidade.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="cobranca">
              <AccordionTrigger>A taxa sai automática ou eu pago à parte?</AccordionTrigger>
              <AccordionContent>
                A taxa é descontada automaticamente de cada pedido pago. A mensalidade (quando houver) é cobrada
                uma vez por mês no cartão cadastrado.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="recursos">
              <AccordionTrigger>O que muda entre os planos em termos de recursos?</AccordionTrigger>
              <AccordionContent>
                Nada. Rastreamento em tempo real, frete dinâmico, guardar e entregar depois, sistema de afiliados —
                todos os recursos do Drenux estão disponíveis em qualquer plano. Só muda como você paga.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </div>
  );
}