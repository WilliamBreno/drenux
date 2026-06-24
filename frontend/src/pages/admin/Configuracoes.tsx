import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  buscarLoja,
  atualizarConfiguracoes,
  statusStripe,
  iniciarOnboardingStripe,
} from '../../api/admin';
import { enviarImagem, logoMiniatura } from '../../api/upload';
import { TEMAS } from '../../themes';
import { Campo } from '../../components/Campo';
import { QRCodeCardapio } from '../../components/QRCodeCardapio';

const MARGENS = [0, 5, 10, 15, 20, 25, 30];

export function Configuracoes() {
  const queryClient = useQueryClient();

  const { data: loja, isLoading } = useQuery({ queryKey: ['loja'], queryFn: buscarLoja });
  const { data: stripeStatus } = useQuery({ queryKey: ['stripe-status'], queryFn: statusStripe });

  const [whatsapp, setWhatsapp] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [modoPedido, setModoPedido] = useState<'imediato' | 'agendado'>('imediato');
  const [antecedencia, setAntecedencia] = useState(24);
  const [abertura, setAbertura] = useState('');
  const [fechamento, setFechamento] = useState('');
  const [margem, setMargem] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [mensagemPausa, setMensagemPausa] = useState('');
  const [aceitaRetirada, setAceitaRetirada] = useState(true);
  const [aceitaEntrega, setAceitaEntrega] = useState(false);
  const [taxaTipo, setTaxaTipo] = useState<'fixa' | 'combinado'>('combinado');
  const [taxaValor, setTaxaValor] = useState(0);
  const [valorMinimo, setValorMinimo] = useState(0);
  const [tema, setTema] = useState('kraft');
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conectandoStripe, setConectandoStripe] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erroLogo, setErroLogo] = useState<string | null>(null);

  useEffect(() => {
    if (loja) {
      setWhatsapp(loja.whatsapp_numero);
      setLogoUrl(loja.logo_url);
      setModoPedido(loja.modo_pedido ?? 'imediato');
      setAntecedencia(loja.antecedencia_minima_horas || 24);
      setAbertura(loja.horario_abertura ?? '');
      setFechamento(loja.horario_fechamento ?? '');
      setMargem(loja.margem_fechamento_minutos ?? 0);
      setPausado(loja.pausado ?? false);
      setMensagemPausa(loja.mensagem_pausa ?? '');
      setAceitaRetirada(loja.aceita_retirada ?? true);
      setAceitaEntrega(loja.aceita_entrega ?? false);
      setTaxaTipo(loja.taxa_entrega_tipo ?? 'combinado');
      setTaxaValor(loja.taxa_entrega_valor ?? 0);
      setValorMinimo(loja.valor_minimo_pedido ?? 0);
      setTema(loja.tema ?? 'kraft');
    }
  }, [loja]);

  const mutSalvar = useMutation({
    mutationFn: atualizarConfiguracoes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loja'] });
      setSalvo(true);
      setErro(null);
      setTimeout(() => setSalvo(false), 3000);
    },
    onError: () => setErro('Não foi possível salvar.'),
  });

  function salvar(e: FormEvent) {
    e.preventDefault();
    mutSalvar.mutate({
      whatsapp_numero: whatsapp,
      logo_url: logoUrl,
      modo_pedido: modoPedido,
      antecedencia_minima_horas: antecedencia,
      horario_abertura: abertura,
      horario_fechamento: fechamento,
      margem_fechamento_minutos: margem,
      pausado,
      mensagem_pausa: mensagemPausa,
      aceita_retirada: aceitaRetirada,
      aceita_entrega: aceitaEntrega,
      taxa_entrega_tipo: taxaTipo,
      taxa_entrega_valor: taxaValor,
      valor_minimo_pedido: valorMinimo,
      tema,
    });
  }

  async function selecionarLogo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoLogo(true);
    setErroLogo(null);
    try {
      const url = await enviarImagem(arquivo);
      setLogoUrl(url);
      await atualizarConfiguracoes({
        whatsapp_numero: whatsapp,
        logo_url: url,
        modo_pedido: modoPedido,
        antecedencia_minima_horas: antecedencia,
        horario_abertura: abertura,
        horario_fechamento: fechamento,
        margem_fechamento_minutos: margem,
        pausado,
        mensagem_pausa: mensagemPausa,
        aceita_retirada: aceitaRetirada,
        aceita_entrega: aceitaEntrega,
        taxa_entrega_tipo: taxaTipo,
        taxa_entrega_valor: taxaValor,
        valor_minimo_pedido: valorMinimo,
        tema,
      });
      queryClient.invalidateQueries({ queryKey: ['loja'] });
    } catch {
      setErroLogo('Não foi possível enviar a imagem.');
    } finally {
      setEnviandoLogo(false);
    }
  }

  async function conectarStripe() {
    setConectandoStripe(true);
    try {
      const { url } = await iniciarOnboardingStripe();
      window.location.href = url;
    } catch {
      setConectandoStripe(false);
    }
  }

  if (isLoading) return <p className="text-tinta-suave">Carregando...</p>;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl tracking-wide text-tinta">Configurações</h1>

      {/* Pagamento */}
      <section className="rounded-2xl bg-superficie p-5 shadow-sm">
        <h2 className="font-display text-lg tracking-wide text-tinta">Pagamento</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          A Stripe processa os pagamentos e te paga direto.
        </p>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-fundo px-4 py-3">
          <span className="text-sm font-medium text-tinta">
            {stripeStatus?.stripe_conectado ? 'Conta conectada' : 'Conta não conectada'}
          </span>
          <span className={`h-2.5 w-2.5 rounded-full ${stripeStatus?.stripe_conectado ? 'bg-emerald-500' : 'bg-tinta/20'}`} />
        </div>
        <button
          onClick={conectarStripe}
          disabled={conectandoStripe}
          className="mt-4 rounded-full bg-acento px-4 py-2 text-sm font-semibold text-superficie disabled:opacity-60"
        >
          {conectandoStripe ? 'Abrindo...' : stripeStatus?.stripe_conectado ? 'Revisar dados na Stripe' : 'Conectar conta de pagamento'}
        </button>
      </section>

      <form onSubmit={salvar} className="space-y-6 rounded-2xl bg-superficie p-5 shadow-sm">
        <h2 className="font-display text-lg tracking-wide text-tinta">Loja</h2>

        {/* Logo */}
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-tinta-suave">Logo da loja</span>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-tinta/25 bg-fundo">
              {logoUrl ? (
                <img src={logoMiniatura(logoUrl)} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-xl text-tinta/30">?</span>
              )}
            </div>
            <label className="cursor-pointer rounded-full border border-tinta/20 px-4 py-2 text-sm font-semibold text-tinta hover:border-acento">
              {enviandoLogo ? 'Enviando...' : logoUrl ? 'Trocar imagem' : 'Enviar logo'}
< truncated lines 181-217 >
          {modoPedido === 'agendado' && (
            <Campo label="Antecedência mínima (horas)">
              <input
                type="number"
                min="1"
                value={antecedencia}
                onChange={(e) => setAntecedencia(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-tinta/20 bg-superficie px-3 py-2 text-tinta outline-none focus:border-acento"
              />
              <span className="mt-1 block text-xs text-tinta-suave">Ex: 24 = cliente precisa pedir com pelo menos 24h de antecedência.</span>
            </Campo>
          )}
        </div>

        {/* Horário de funcionamento */}
        <div className="space-y-3 rounded-xl border border-tinta/10 bg-fundo p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">Horário de funcionamento <span className="normal-case font-normal">(opcional)</span></p>
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Abre">
              <input type="time" value={abertura} onChange={(e) => setAbertura(e.target.value)}
                className="w-full rounded-lg border border-tinta/20 bg-superficie px-2 py-1.5 text-sm text-tinta outline-none focus:border-acento sm:px-3 sm:py-2" />
            </Campo>
            <Campo label="Fecha">
              <input type="time" value={fechamento} onChange={(e) => setFechamento(e.target.value)}
                className="w-full rounded-lg border border-tinta/20 bg-superficie px-2 py-1.5 text-sm text-tinta outline-none focus:border-acento sm:px-3 sm:py-2" />
            </Campo>
          </div>
          <Campo label="Parar de aceitar pedidos antes de fechar">
            <select
              value={margem}
              onChange={(e) => setMargem(parseInt(e.target.value))}
              className="w-full rounded-lg border border-tinta/20 bg-superficie px-3 py-2 text-tinta outline-none focus:border-acento"
            >
              {MARGENS.map((m) => (
                <option key={m} value={m}>{m === 0 ? 'No horário de fechamento' : `${m} min antes`}</option>
              ))}
            </select>
          </Campo>
        </div>

        {/* Pausar produção */}
        <div className="space-y-3 rounded-xl border border-tinta/10 bg-fundo p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={pausado} onChange={(e) => setPausado(e.target.checked)} className="h-4 w-4 accent-acento" />
            <span className="text-sm font-medium text-tinta">Pausar produção</span>
          </label>
          {pausado && (
            <Campo label="Aviso para o cliente">
              <input
                value={mensagemPausa}
                onChange={(e) => setMensagemPausa(e.target.value)}
                placeholder="Ex: Férias até dia 10/07. Voltamos em breve!"
                className="w-full rounded-lg border border-tinta/20 bg-superficie px-3 py-2 text-tinta outline-none focus:border-acento"
              />
            </Campo>
          )}
          <p className="text-xs text-tinta-suave">
            Fecha a loja temporariamente com uma mensagem personalizada exibida pro cliente.
          </p>
        </div>

        {/* Modos de recebimento */}
        <div className="space-y-3 rounded-xl border border-tinta/10 bg-fundo p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">Modos de recebimento</p>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={aceitaRetirada} onChange={(e) => setAceitaRetirada(e.target.checked)} className="h-4 w-4 accent-acento" />
            <span className="text-sm text-tinta">Retirada no local</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={aceitaEntrega} onChange={(e) => setAceitaEntrega(e.target.checked)} className="h-4 w-4 accent-acento" />
            <span className="text-sm text-tinta">Entrega em domicílio</span>
          </label>

          {aceitaEntrega && (
            <div className="space-y-3 pt-1">
              <p className="text-xs font-medium text-tinta-suave">Taxa de entrega</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="taxaTipo" value="fixa" checked={taxaTipo === 'fixa'} onChange={() => setTaxaTipo('fixa')} className="mt-0.5 accent-acento" />
                  <div>
                    <p className="text-sm font-medium text-tinta">Taxa fixa</p>
                    <p className="text-xs text-tinta-suave">Você define o valor agora e é cobrado automaticamente no checkout.</p>
                  </div>
                </label>
                {taxaTipo === 'fixa' && (
                  <Campo label="Valor da entrega (R$)">
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={taxaValor || ''}
                      onChange={(e) => setTaxaValor(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-full rounded-lg border border-tinta/20 bg-superficie px-3 py-2 text-tinta outline-none focus:border-acento"
                    />
                  </Campo>
                )}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="radio" name="taxaTipo" value="combinado" checked={taxaTipo === 'combinado'} onChange={() => setTaxaTipo('combinado')} className="mt-0.5 accent-acento" />
                  <div>
                    <p className="text-sm font-medium text-tinta">A combinar</p>
                    <p className="text-xs text-tinta-suave">O cliente informa o endereço, você combina o frete fora do sistema.</p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {!aceitaRetirada && !aceitaEntrega && (
            <p className="text-xs text-acento">Ative pelo menos um modo de recebimento.</p>
          )}
        </div>

        {/* Valor mínimo de pedido */}
        <Campo label="Pedido mínimo (R$)">
          <input
            type="number"
            step="0.50"
            min="0"
            value={valorMinimo || ''}
            onChange={(e) => setValorMinimo(parseFloat(e.target.value) || 0)}
            placeholder="Sem mínimo"
            className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
          />
          <span className="mt-1 block text-xs text-tinta-suave">
            Deixa em branco pra não ter mínimo. Calculado sobre o subtotal (sem taxa de entrega).
          </span>
        </Campo>

        {/* Seletor de tema */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">
            Tema do cardápio
          </p>
          <div className="grid grid-cols-4 gap-2">
            {TEMAS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTema(t.id)}
                className={`rounded-xl border-2 p-2 text-left transition ${
                  tema === t.id ? 'border-acento' : 'border-tinta/10 hover:border-tinta/25'
                }`}
              >
                <div
                  className="mb-1.5 h-6 w-full rounded-lg"
                  style={{ background: t.acento }}
                />
                <div
                  className="mb-1 h-1.5 w-full rounded"
                  style={{ background: t.fundo }}
                />
                <p className="truncate text-xs font-medium text-tinta">{t.nome}</p>
              </button>
            ))}
          </div>
          {tema && (
            <p className="text-xs text-tinta-suave">
              {TEMAS.find((t) => t.id === tema)?.descricao}
            </p>
          )}
        </div>

        {erro && <p className="text-sm text-acento">{erro}</p>}
        {salvo && <p className="text-sm text-emerald-600">Salvo!</p>}

        <button
          type="submit"
          disabled={mutSalvar.isPending}
          className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-superficie disabled:opacity-60"
        >
          {mutSalvar.isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
      {loja && <QRCodeCardapio slug={loja.slug} nomeLoja={loja.nome} />}
    </div>
  );
}
