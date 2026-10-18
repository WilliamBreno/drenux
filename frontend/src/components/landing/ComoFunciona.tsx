import { useState } from 'react';
import { Carrinho, Pix, Quadro, WhatsApp } from './EtapasFragmentos';

const FRAGMENTOS = [Carrinho, Pix, Quadro, WhatsApp];

const ETAPAS = [
  {
    nome: 'Pedido',
    frase: 'O cliente pede pelo link',
    texto: 'Do Instagram, do QR code na mesa ou do link que você mandou. O frete sai calculado pela distância e o carrinho já sugere o acompanhamento.',
  },
  {
    nome: 'Pagamento',
    frase: 'Paga no Pix, sem comprovante',
    texto: 'O Pix cai na sua conta do Mercado Pago e o pedido muda pra pago sozinho. Ninguém precisa mandar print de comprovante.',
  },
  {
    nome: 'Preparo',
    frase: 'Você prepara pelo quadro',
    texto: 'Cada pedido pago entra em "A preparar". Um toque avança a etapa, e a comanda sai na impressora térmica Bluetooth.',
  },
  {
    nome: 'Aviso',
    frase: 'E ele é avisado no WhatsApp',
    texto: 'Confirmação do pagamento e "saiu para entrega" chegam no WhatsApp do cliente, com link de rastreio no mapa nos planos Pro e Scale.',
  },
];

// Um slider de verdade (input range, setas do teclado) dirige as duas
// metades: a frase da etapa à esquerda e a tela daquela etapa à direita.
export function ComoFunciona() {
  const [etapa, setEtapa] = useState(0);
  const Fragmento = FRAGMENTOS[etapa];
  const pct = (etapa / (ETAPAS.length - 1)) * 100;

  return (
    <section id="como-funciona" aria-label="Como funciona" className="relative grid md:min-h-[92svh] md:grid-cols-2">
      {/* Frase (desktop: esquerda; celular: depois do slider) */}
      <div className="l-margem order-3 bg-[var(--l-oceano)] pb-14 pt-10 text-[var(--l-papel)] md:order-1 md:pb-40 md:pt-16">
        <h2
          key={etapa}
          className="l-troca max-w-[16ch] text-[clamp(2.25rem,9vw,4.75rem)] font-medium leading-[0.95] tracking-[-0.045em] md:text-[clamp(2.5rem,4.6vw,4.75rem)]"
          aria-live="polite"
        >
          {ETAPAS[etapa].frase}
        </h2>
        <p key={`t${etapa}`} className="l-troca mt-6 max-w-[38ch] text-[length:var(--l-destaque)] leading-snug">
          {ETAPAS[etapa].texto}
        </p>
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-1 text-[15px] md:hidden">
          {ETAPAS.map((e, i) => (
            <li key={e.nome} className={i === etapa ? 'font-semibold' : ''}>
              {e.nome}
            </li>
          ))}
        </ul>
      </div>

      {/* Tela da etapa */}
      <div className="order-1 flex min-h-[46svh] items-center justify-center bg-[var(--l-oceano-claro)] px-5 py-10 md:order-2 md:pb-40 md:pt-16">
        <div key={etapa} className="l-troca flex w-full justify-center">
          <Fragmento />
        </div>
      </div>

      {/* Slider: atravessa as duas metades no desktop; no celular fica na
          emenda entre a tela e a frase. */}
      <div className="l-margem order-2 bg-[var(--l-oceano-claro)] pb-6 md:absolute md:inset-x-0 md:bottom-0 md:bg-transparent md:pb-10">
        <label htmlFor="etapa-pedido" className="sr-only">
          Etapa do pedido
        </label>
        <div className="l-faixa text-[var(--l-tinta)]">
          <div className="l-trilho">
            <div className="l-trilho__cheio transition-[width] duration-200" style={{ width: `${pct}%` }} />
          </div>
          <input
            id="etapa-pedido"
            type="range"
            min={0}
            max={ETAPAS.length - 1}
            step={1}
            value={etapa}
            onChange={(e) => setEtapa(Number(e.target.value))}
            aria-valuetext={ETAPAS[etapa].nome}
            className="l-range"
            style={{ ['--l-thumb' as string]: 'var(--l-ouro)' }}
          />
        </div>
        <ol className="mt-2 hidden grid-cols-4 text-[16px] md:grid">
          {ETAPAS.map((e, i) => (
            <li
              key={e.nome}
              className={`${i < 2 ? 'text-[var(--l-papel)]' : 'text-[var(--l-tinta)]'} ${
                i === etapa ? 'font-semibold underline decoration-2 underline-offset-4' : ''
              } ${i === ETAPAS.length - 1 ? 'text-right' : i > 0 ? 'text-center' : ''}`}
            >
              <button type="button" onClick={() => setEtapa(i)} className="transition-opacity hover:opacity-75">
                {e.nome}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
