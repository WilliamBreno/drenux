import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buscarLoja, buscarDashboard, mudarPlano, cancelarMudancaAgendada } from '../../api/admin';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ShimmerButton } from '@/components/ui/shimmer-button';
import { PLANOS, custoPlano, temaPlanos, FONTE_DRX_SERIF_CSS } from '../../lib/planos';

const NOME_PLANO: Record<string, string> = { start: 'Start', pro: 'Pro', scale: 'Scale' };

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function MeuPlano() {
  const queryClient = useQueryClient();
  const { data: loja } = useQuery({ queryKey: ['loja'], queryFn: buscarLoja });
  const { data: dashboard } = useQuery({ queryKey: ['dashboard'], queryFn: buscarDashboard });

  // Pré-preenche com o faturamento real do mês, mas o dono pode ajustar
  // o slider pra simular outros cenários.
  const [faturamento, setFaturamento] = useState<number | null>(null);
  const faturamentoUsado = faturamento ?? dashboard?.total_mes ?? 0;

  const [trocando, setTrocando] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const custos = useMemo(
    () => PLANOS.map((p) => ({ ...p, valorTaxa: p.taxa * faturamentoUsado, total: custoPlano(p, faturamentoUsado) })),
    [faturamentoUsado]
  );
  const menorCusto = Math.min(...custos.map((c) => c.total));

  async function escolherPlano(planoId: string) {
    setErro(null);
    setTrocando(planoId);
    try {
      const resultado = await mudarPlano(planoId as 'start' | 'pro' | 'scale');
      if (resultado.checkout_url) {
        window.location.href = resultado.checkout_url;
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['loja'] });
    } catch {
      setErro('Não foi possível trocar de plano agora. Tenta de novo em instantes.');
    } finally {
      setTrocando(null);
    }
  }

  async function desfazerAgendamento() {
    setCancelando(true);
    try {
      await cancelarMudancaAgendada();
      queryClient.invalidateQueries({ queryKey: ['loja'] });
    } catch {
      setErro('Não foi possível cancelar a mudança agendada.');
    } finally {
      setCancelando(false);
    }
  }

  if (!loja) return <p className="text-tinta-suave">Carregando...</p>;

  return (
    <div style={temaPlanos} className="-mx-6 -mb-6 rounded-3xl bg-background px-6 py-8 text-foreground sm:px-8">
      <style>{FONTE_DRX_SERIF_CSS}</style>

      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="drx-serif text-3xl font-medium">Meu Plano</h1>

        {/* Plano atual */}
        <Card>
          <CardHeader>
            <CardDescription>Plano atual</CardDescription>
            <CardTitle className="drx-serif text-3xl font-medium text-primary">{NOME_PLANO[loja.plano] ?? 'Start'}</CardTitle>
          </CardHeader>
          {loja.plano_agendado && (
            <CardContent>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary px-4 py-3">
                <p className="text-sm">
                  Você vai mudar pro plano <strong>{NOME_PLANO[loja.plano_agendado]}</strong> na próxima renovação.
                </p>
                <Button size="sm" variant="outline" onClick={desfazerAgendamento} disabled={cancelando}>
                  {cancelando ? 'Cancelando...' : 'Cancelar'}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Calculadora */}
        <Card>
          <CardHeader>
            <CardDescription>
              {dashboard ? 'Faturamento do mês (ajuste pra simular outros cenários)' : 'Simule seu faturamento mensal'}
            </CardDescription>
            <CardTitle className="drx-serif text-3xl font-medium text-primary">
              R$ <NumberTicker value={faturamentoUsado} className="text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Slider
              value={[faturamentoUsado]}
              onValueChange={(v) => setFaturamento(Array.isArray(v) ? v[0] : v)}
              min={0}
              max={20000}
              step={100}
            />
          </CardContent>
        </Card>

        {erro && <p className="text-sm text-acento">{erro}</p>}

        {/* Cards de plano */}
        <div className="space-y-4">
          {custos.map((p) => {
            const ehAtual = p.id === loja.plano;
            const recomendado = p.total === menorCusto && !ehAtual;
            const efetivo = faturamentoUsado > 0 ? (p.total / faturamentoUsado) * 100 : p.taxa * 100;

            return (
              <Card key={p.id} className={recomendado ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="drx-serif text-xl font-medium">{p.nome}</CardTitle>
                      <CardDescription>{p.desc}</CardDescription>
                    </div>
                    {ehAtual && <Badge>Plano atual</Badge>}
                    {recomendado && <Badge className="bg-primary text-primary-foreground">Mais barato pra você</Badge>}
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

                {!ehAtual && (
                  <CardFooter>
                    {recomendado ? (
                      <ShimmerButton
                        onClick={() => escolherPlano(p.id)}
                        disabled={trocando === p.id}
                        background="#d4af6a"
                        shimmerColor="#ffffff"
                        className="w-full text-sm font-semibold text-background"
                      >
                        {trocando === p.id ? 'Processando...' : `Mudar pro ${p.nome}`}
                      </ShimmerButton>
                    ) : (
                      <Button
                        className="w-full"
                        variant="secondary"
                        onClick={() => escolherPlano(p.id)}
                        disabled={trocando === p.id}
                      >
                        {trocando === p.id ? 'Processando...' : `Mudar pro ${p.nome}`}
                      </Button>
                    )}
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>

        {/* Aviso */}
        <div className="flex items-start gap-2 rounded-xl bg-card px-4 py-3 ring-1 ring-border">
          <span className="text-muted-foreground">ⓘ</span>
          <p className="text-xs text-muted-foreground">
            Mensalidade e taxa são os valores fixos de cada plano. O total mostrado é uma projeção com base no
            faturamento simulado acima — o valor real muda conforme suas vendas no mês.
          </p>
        </div>
      </div>
    </div>
  );
}
