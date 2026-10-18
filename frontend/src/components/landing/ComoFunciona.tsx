import { useEffect, useRef, useState } from 'react';
import { ShoppingBag, QrCode, ChefHat, MessageCircle } from 'lucide-react';
import { Carrinho, Pix, Quadro, WhatsApp } from './EtapasFragmentos';

const ETAPAS = [
  {
    nome: 'Pedido',
    icone: ShoppingBag,
    Tela: Carrinho,
    frase: 'O cliente pede pelo link',
    texto: 'Do Instagram, do QR code na mesa ou do link que você mandou. O frete sai calculado pela distância e o carrinho já sugere o acompanhamento.',
  },
  {
    nome: 'Pagamento',
    icone: QrCode,
    Tela: Pix,
    frase: 'Paga no Pix, sem comprovante',
    texto: 'O Pix cai na sua conta do Mercado Pago e o pedido muda pra pago sozinho. Ninguém precisa mandar print de comprovante.',
  },
  {
    nome: 'Preparo',
    icone: ChefHat,
    Tela: Quadro,
    frase: 'Você prepara pelo quadro',
    texto: 'Cada pedido pago entra em "A preparar". Um toque avança a etapa, e a comanda sai na impressora térmica Bluetooth.',
  },
  {
    nome: 'Aviso',
    icone: MessageCircle,
    Tela: WhatsApp,
    frase: 'E ele é avisado no WhatsApp',
    texto: 'Confirmação do pagamento e "saiu para entrega" chegam no WhatsApp do cliente, com link de rastreio no mapa nos planos Pro e Scale.',
  },
];

// Etapas em abas com barra de progresso: a ativa vai enchendo e, quando
// termina (fim da animação CSS), avança sozinha pra próxima. Pausa com o
// mouse em cima da seção e quando ela está fora da tela; clicar numa etapa
// pula direto pra ela. Com "reduzir movimento" não avança sozinha.
export function ComoFunciona() {
  const [etapa, setEtapa] = useState(0);
  const [visivel, setVisivel] = useState(false);
  const [mouseEmCima, setMouseEmCima] = useState(false);
  const secao = useRef<HTMLElement>(null);
  const atual = ETAPAS[etapa];
  const rodando = visivel && !mouseEmCima;

  useEffect(() => {
    const el = secao.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { threshold: 0.35 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={secao}
      id="como-funciona"
      aria-label="Como funciona"
      className="grid md:min-h-[92svh] md:grid-cols-2"
      onMouseEnter={() => setMouseEmCima(true)}
      onMouseLeave={() => setMouseEmCima(false)}
    >
      {/* Texto + etapas */}
      <div className="l-margem order-2 flex flex-col justify-between gap-10 bg-[var(--l-oceano)] pb-12 pt-10 text-[var(--l-papel)] md:order-1 md:py-16">
        <div aria-live="polite">
          <h2
            key={etapa}
            className="l-troca max-w-[16ch] text-[clamp(2.25rem,9vw,4.75rem)] font-medium leading-[0.95] tracking-[-0.045em] md:text-[clamp(2.5rem,4.6vw,4.75rem)]"
          >
            {atual.frase}
          </h2>
          <p key={`t${etapa}`} className="l-troca mt-6 max-w-[38ch] text-[length:var(--l-destaque)] leading-snug">
            {atual.texto}
          </p>
        </div>

        <div>
          <p className="mb-3 text-[15px]">Toque numa etapa pra ver a tela dela:</p>
          <div role="tablist" aria-label="Etapas do pedido" className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {ETAPAS.map((e, i) => {
              const sel = i === etapa;
              const feita = i < etapa;
              return (
                <button
                  key={e.nome}
                  type="button"
                  role="tab"
                  aria-selected={sel}
                  aria-controls="tela-etapa"
                  onClick={() => setEtapa(i)}
                  className={`flex flex-col gap-3 p-3.5 text-left transition-colors duration-200 ${
                    sel ? 'bg-white text-[var(--l-tinta)]' : 'bg-white/10 text-[var(--l-papel)] hover:bg-white/20'
                  }`}
                >
                  {/* Barra de progresso da etapa */}
                  <span className={`block h-1.5 w-full overflow-hidden ${sel ? 'bg-black/15' : 'bg-white/25'}`}>
                    {sel ? (
                      <span
                        key={etapa}
                        className="l-progresso block h-full bg-[var(--l-oceano)]"
                        style={{ animationPlayState: rodando ? 'running' : 'paused' }}
                        onAnimationEnd={() => setEtapa((n) => (n + 1) % ETAPAS.length)}
                      />
                    ) : (
                      <span className={`block h-full bg-white ${feita ? 'w-full' : 'w-0'}`} />
                    )}
                  </span>
                  <span className="flex items-center gap-2 text-[16px] font-medium">
                    <e.icone className="h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />
                    {e.nome}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tela da etapa */}
      <div
        id="tela-etapa"
        role="tabpanel"
        aria-label={`Tela da etapa ${atual.nome}`}
        className="order-1 flex min-h-[46svh] items-center justify-center bg-[var(--l-oceano-claro)] px-5 py-10 md:order-2 md:py-16"
      >
        <div key={etapa} className="l-troca flex w-full justify-center">
          <atual.Tela />
        </div>
      </div>
    </section>
  );
}
