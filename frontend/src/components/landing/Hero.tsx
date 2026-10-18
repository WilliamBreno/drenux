import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, QrCode, MessageCircle, MapPin, Palette } from 'lucide-react';
import { TEMAS } from '../../themes';
import { LOJAS_EXEMPLO, brl } from './dados';
import { CardapioFragmento } from './CardapioFragmento';

// Lojas que se revezam na vitrine do hero (uma de cada nicho bem
// diferente, pra mostrar de cara que o mesmo sistema serve pra todas).
const VITRINE = ['carvao', 'oceano', 'rosa', 'terracota'].map((t) => LOJAS_EXEMPLO.find((l) => l.tema === t)!);

const FATOS = [
  { icone: QrCode, texto: 'Link próprio e QR code' },
  { icone: Check, texto: 'Pix automático' },
  { icone: MessageCircle, texto: 'Avisos no WhatsApp' },
  { icone: MapPin, texto: 'Frete por distância' },
  { icone: Palette, texto: `${TEMAS.length} temas de cor` },
];

export function Hero() {
  const [i, setI] = useState(0);
  const loja = VITRINE[i];
  const tema = TEMAS.find((t) => t.id === loja.tema)!;
  const item = loja.itens[0];

  // Troca a loja da vitrine sozinha; quem prefere menos movimento fica na
  // primeira (e ainda pode trocar tocando nos pontinhos).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % VITRINE.length), 4200);
    return () => window.clearInterval(t);
  }, []);

  return (
    <section
      id="inicio"
      className="grid bg-[var(--l-preto)] text-[var(--l-papel)] md:min-h-[calc(100svh-116px)] md:grid-cols-2"
    >
      {/* Texto */}
      <div className="l-margem flex flex-col justify-center py-12 md:py-16 md:pr-12">
        <h1 className="l-revela max-w-[13ch] text-[clamp(2.6rem,10.5vw,6.25rem)] font-medium leading-[0.92] tracking-[-0.045em] md:text-[clamp(3.25rem,6.2vw,6.25rem)]">
          Venda direto pelo seu cardápio
        </h1>
        <p
          className="l-revela mt-6 max-w-[42ch] text-[length:var(--l-destaque)] leading-snug"
          style={{ ['--l-ordem' as string]: 1 }}
        >
          Cardápio digital e catálogo online para restaurantes e lojas. O cliente pede pelo seu link, paga no Pix e
          é avisado no WhatsApp, sem app no meio cobrando comissão.
        </p>
        <div
          className="l-revela mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-7"
          style={{ ['--l-ordem' as string]: 2 }}
        >
          <Link to="/cadastro" className="l-botao l-botao--ouro">
            Criar loja grátis
          </Link>
          <a href="#planos" className="l-link text-[17px]">
            Ver planos e preços
          </a>
        </div>
        <ul
          className="l-revela mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[16px] md:mt-14 md:grid md:grid-cols-3"
          style={{ ['--l-ordem' as string]: 3 }}
        >
          {FATOS.map((f) => (
            <li key={f.texto} className="flex items-center gap-2.5">
              <f.icone className="h-[18px] w-[18px] shrink-0 text-[var(--l-ouro)]" strokeWidth={2} aria-hidden />
              {f.texto}
            </li>
          ))}
        </ul>
      </div>

      {/* Vitrine: o cardápio de verdade, em cima de um campo da cor do tema */}
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden px-5 pb-12 pt-14 transition-colors duration-500 md:py-14"
        // Campo um tom abaixo da cor do tema, pra faixa colorida do próprio
        // cardápio (bg-acento) não se misturar com o fundo.
        style={{ background: `color-mix(in srgb, ${tema.acento} 62%, #000)` }}
      >
        <div className="relative w-full max-w-[350px]">
          <div key={loja.tema} className="l-troca">
            <CardapioFragmento loja={loja} />
          </div>

          {/* Notificação de pedido pago que chega pro dono (texto do
              template real, notification/templates.go). Flutua de verdade
              por cima do cardápio, por isso a sombra. */}
          <div
            key={`n${loja.tema}`}
            data-ui
            className="l-troca absolute -left-3 top-8 w-[250px] rounded-2xl bg-white p-3 text-[#111] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.45)] sm:-left-24 md:-left-28 lg:-left-36"
            style={{ animationDelay: '180ms' }}
          >
            <p className="flex items-center gap-2 text-[11px] font-semibold text-[#075e54]">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp · agora
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-snug">Novo pedido pago - {loja.nome} - #128</p>
            <p className="text-[12px] leading-snug text-[#555]">1x {item.nome} · Total {brl(item.preco)}</p>
          </div>

          <div
            key={`p${loja.tema}`}
            data-ui
            className="l-troca absolute -right-2 bottom-24 flex items-center gap-2 rounded-full bg-[#e3f6ec] px-3.5 py-2 text-[13px] font-semibold text-[#14663d] shadow-[0_14px_30px_-10px_rgba(0,0,0,0.4)] sm:-right-16"
            style={{ animationDelay: '320ms' }}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#14663d] text-white">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            Pix aprovado
          </div>
        </div>

        <div className="mt-7 flex items-center gap-2" role="group" aria-label="Trocar loja de exemplo">
          {VITRINE.map((l, n) => (
            <button
              key={l.tema}
              type="button"
              onClick={() => setI(n)}
              aria-label={`Ver ${l.nome}`}
              aria-pressed={n === i}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                n === i ? 'w-8 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
        <p className="mt-3 text-[14px] text-white">
          {loja.nome} · tema {tema.nome}
        </p>
      </div>
    </section>
  );
}
