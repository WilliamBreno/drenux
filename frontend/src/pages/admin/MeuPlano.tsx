import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { buscarLoja, buscarDashboard, mudarPlano, cancelarMudancaAgendada } from '../../api/admin';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { PLANOS, custoPlano } from '../../lib/planos';

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
    () => PLANOS.map((p) => ({ ...p, total: custoPlano(p, faturamentoUsado) })),
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
    <div className="space-y-6">
      <h1 className="font-display text-2xl tracking-wide text-tinta">Meu Plano</h1>

      {/* Plano atual */}
      <Card>
        <CardHeader>
          <CardDescription>Plano atual</CardDescription>
          <CardTitle className="text-2xl">{NOME_PLANO[loja.plano] ?? 'Start'}</CardTitle>
        </CardHeader>
        {loja.plano_agendado && (
          <CardContent>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3">
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
          <CardTitle className="text-2xl">{fmt(faturamentoUsado)}</CardTitle>
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
            <Card key={p.id} className={ehAtual ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{p.nome}</CardTitle>
                    <CardDescription>{p.desc}</CardDescription>
                  </div>
                  {ehAtual && <Badge>Plano atual</Badge>}
                  {recomendado && <Badge variant="secondary">Mais barato pra você</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {p.mensal === 0 ? 'R$ 0' : fmt(p.mensal)}/mês + {(p.taxa * 100).toFixed(1)}% por pedido
                  </p>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{fmt(p.total)}/mês</p>
                    <p className="text-xs text-muted-foreground">{efetivo.toFixed(1)}% do faturamento</p>
                  </div>
                </div>
              </CardContent>
              {!ehAtual && (
                <CardFooter>
                  <Button
                    className="w-full"
                    variant={recomendado ? 'default' : 'secondary'}
                    onClick={() => escolherPlano(p.id)}
                    disabled={trocando === p.id}
                  >
                    {trocando === p.id ? 'Processando...' : `Mudar pro ${p.nome}`}
                  </Button>
                </CardFooter>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}