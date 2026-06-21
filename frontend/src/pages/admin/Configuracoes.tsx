import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  buscarLoja,
  atualizarConfiguracoes,
  statusStripe,
  iniciarOnboardingStripe,
} from '../../api/admin';
import { enviarImagem, logoMiniatura } from '../../api/upload';
import { Campo } from '../../components/Campo';

export function Configuracoes() {
  const queryClient = useQueryClient();

  const { data: loja, isLoading } = useQuery({ queryKey: ['loja'], queryFn: buscarLoja });
  const { data: stripeStatus } = useQuery({
    queryKey: ['stripe-status'],
    queryFn: statusStripe,
  });

  const [whatsapp, setWhatsapp] = useState('');
  const [mesmoDia, setMesmoDia] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conectandoStripe, setConectandoStripe] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erroLogo, setErroLogo] = useState<string | null>(null);

  // Sincroniza o formulário com os dados reais assim que a loja carrega
  // (ou é recarregada depois de salvar).
  useEffect(() => {
    if (loja) {
      setWhatsapp(loja.whatsapp_numero);
      setMesmoDia(loja.permite_mesmo_dia);
      setLogoUrl(loja.logo_url);
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
    mutSalvar.mutate({ whatsapp_numero: whatsapp, permite_mesmo_dia: mesmoDia, logo_url: logoUrl });
  }

  // A logo salva sozinha assim que termina de subir — não faz sentido o
  // dono escolher uma imagem, ela aparecer na prévia, e ele esquecer de
  // clicar em "Salvar" depois e perder a troca.
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
        permite_mesmo_dia: mesmoDia,
        logo_url: url,
      });
      queryClient.invalidateQueries({ queryKey: ['loja'] });
    } catch {
      setErroLogo('Não foi possível enviar a imagem. Tenta um arquivo menor ou outro formato.');
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

  if (isLoading) {
    return <p className="text-tinta-suave">Carregando...</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl tracking-wide text-tinta">Configurações</h1>

      <section className="rounded-2xl bg-superficie p-5 shadow-sm">
        <h2 className="font-display text-lg tracking-wide text-tinta">Pagamento</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          É a Stripe quem processa os pagamentos e te paga direto, sem passar pela nossa conta.
        </p>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-fundo px-4 py-3">
          <span className="text-sm font-medium text-tinta">
            {stripeStatus?.stripe_conectado ? 'Conta conectada' : 'Conta não conectada'}
          </span>
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              stripeStatus?.stripe_conectado ? 'bg-emerald-500' : 'bg-tinta/20'
            }`}
          />
        </div>

        <button
          onClick={conectarStripe}
          disabled={conectandoStripe}
          className="mt-4 rounded-full bg-acento px-4 py-2 text-sm font-semibold text-superficie disabled:opacity-60"
        >
          {conectandoStripe
            ? 'Abrindo...'
            : stripeStatus?.stripe_conectado
              ? 'Revisar dados na Stripe'
              : 'Conectar conta de pagamento'}
        </button>
      </section>

      <form onSubmit={salvar} className="space-y-5 rounded-2xl bg-superficie p-5 shadow-sm">
        <h2 className="font-display text-lg tracking-wide text-tinta">Loja</h2>

        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-tinta-suave">
            Logo da loja
          </span>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-tinta/25 bg-fundo">
              {logoUrl ? (
                <img
                  src={logoMiniatura(logoUrl)}
                  alt="Logo da loja"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-display text-xl text-tinta/30">?</span>
              )}
            </div>
            <label className="cursor-pointer rounded-full border border-tinta/20 px-4 py-2 text-sm font-semibold text-tinta transition hover:border-acento">
              {enviandoLogo ? 'Enviando...' : logoUrl ? 'Trocar imagem' : 'Enviar logo'}
              <input
                type="file"
                accept="image/*"
                onChange={selecionarLogo}
                disabled={enviandoLogo}
                className="hidden"
              />
            </label>
          </div>
          {erroLogo && <p className="mt-2 text-sm text-acento">{erroLogo}</p>}
        </div>

        <Campo label="WhatsApp pra receber avisos de pedido">
          <input
            required
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="5579999999999"
            className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
          />
          <span className="mt-1 block text-xs text-tinta-suave">
            DDI + DDD + número, só números (ex: 5579999999999).
          </span>
        </Campo>

        <label className="flex items-center gap-2 text-sm text-tinta">
          <input
            type="checkbox"
            checked={mesmoDia}
            onChange={(e) => setMesmoDia(e.target.checked)}
            className="h-4 w-4 accent-acento"
          />
          Aceitar pedido pra retirada no mesmo dia
        </label>

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
    </div>
  );
}