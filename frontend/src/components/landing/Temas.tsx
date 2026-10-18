import { useEffect, useRef, useState } from 'react';
import { TEMAS } from '../../themes';
import { LOJAS_EXEMPLO } from './dados';
import { CardapioFragmento } from './CardapioFragmento';

const INTERVALO = 4500;
const INTERVALO_APOS_TOQUE = 10000;

// Mostruário de temas: a lista de nomes é o índice e troca a loja de
// exemplo e a cor do disco atrás dela. É o sistema de temas de verdade
// (data-tema), não uma ilustração.
// Carrossel: avança sozinho; com o mouse sobre um nome, mostra aquele e
// pausa até o mouse sair; no toque (celular), mostra o tocado por 10s e
// depois segue a partir dele. Fora da tela ou com "reduzir movimento",
// não avança.
export function Temas() {
  const [ativo, setAtivo] = useState(0);
  const [mouseEmCima, setMouseEmCima] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [espera, setEspera] = useState({ ms: INTERVALO, toque: 0 });
  const secao = useRef<HTMLElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const loja = LOJAS_EXEMPLO[ativo];
  const tema = TEMAS.find((t) => t.id === loja.tema)!;

  useEffect(() => {
    const el = secao.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // `espera.toque` entra nas dependências pra reiniciar a contagem mesmo
  // quando o toque é no tema que já estava ativo.
  useEffect(() => {
    if (!visivel || mouseEmCima) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setTimeout(() => {
      setAtivo((n) => (n + 1) % LOJAS_EXEMPLO.length);
      setEspera((e) => ({ ms: INTERVALO, toque: e.toque }));
    }, espera.ms);
    return () => window.clearTimeout(t);
  }, [ativo, visivel, mouseEmCima, espera]);

  // No celular a lista rola de lado: mantém o nome ativo à vista, rolando
  // só a lista (scrollIntoView rolaria a página inteira junto).
  useEffect(() => {
    const ul = lista.current;
    const li = ul?.children[ativo] as HTMLElement | undefined;
    if (!ul || !li || ul.scrollWidth <= ul.clientWidth) return;
    ul.scrollTo({ left: li.offsetLeft - ul.offsetLeft - 20, behavior: 'smooth' });
  }, [ativo]);

  return (
    <section
      ref={secao}
      id="temas"
      className="l-margem relative overflow-hidden bg-[var(--l-preto-2)] py-16 text-[var(--l-papel)] md:min-h-[88svh] md:py-20"
    >
      <div className="grid grid-cols-12 items-end gap-y-10">
        {/* Disco + cardápio */}
        <div className="order-1 col-span-12 flex justify-center md:order-2 md:col-span-7 md:col-start-6">
          <div className="relative flex w-full max-w-[640px] justify-center pt-[14vw] md:aspect-square md:w-[min(64vh,46vw)] md:items-center md:pt-0">
            {/* No celular o disco fica atrás da metade de cima do cardápio
                (se ele esticasse junto, viraria uma pílula). */}
            <div
              aria-hidden
              className="absolute left-1/2 top-0 aspect-square w-[86vw] -translate-x-1/2 rounded-full transition-colors duration-300 md:inset-0 md:w-auto md:translate-x-0"
              style={{ background: tema.acento }}
            />
            <div key={loja.tema} className="l-troca relative w-[78vw] max-w-[340px] md:-mt-[12%] md:w-[72%] md:max-w-[360px]">
              <CardapioFragmento loja={loja} />
            </div>
          </div>
        </div>

        {/* Índice */}
        <div className="order-2 col-span-12 md:order-1 md:col-span-5">
          <h2 className="l-revela text-[26px] font-medium leading-[1.15] tracking-[-0.03em] text-[#a3a3a3] md:text-[clamp(28px,2.9vw,44px)]">
            {TEMAS.length} temas de cor
          </h2>
          <ul
            ref={lista}
            className="l-rolagem-x -mx-[var(--l-margem)] mt-2 flex gap-6 overflow-x-auto px-[var(--l-margem)] md:mx-0 md:block md:overflow-visible md:px-0"
            aria-label="Lojas de exemplo por tema"
          >
            {LOJAS_EXEMPLO.map((l, i) => {
              const t = TEMAS.find((x) => x.id === l.tema)!;
              const selecionado = i === ativo;
              return (
                <li key={l.tema} className="shrink-0">
                  <button
                    type="button"
                    onPointerEnter={(e) => {
                      if (e.pointerType !== 'mouse') return;
                      setAtivo(i);
                      setMouseEmCima(true);
                    }}
                    onPointerLeave={(e) => {
                      if (e.pointerType !== 'mouse') return;
                      setMouseEmCima(false);
                      setEspera((x) => ({ ms: INTERVALO, toque: x.toque }));
                    }}
                    onPointerUp={(e) => {
                      if (e.pointerType === 'mouse') return;
                      setAtivo(i);
                      setEspera((x) => ({ ms: INTERVALO_APOS_TOQUE, toque: x.toque + 1 }));
                    }}
                    onFocus={() => setAtivo(i)}
                    onClick={() => setAtivo(i)}
                    aria-pressed={selecionado}
                    className={`flex items-center gap-3 text-[26px] font-medium leading-[1.15] tracking-[-0.03em] transition-colors duration-200 md:text-[clamp(28px,2.9vw,44px)] ${
                      selecionado ? 'text-[var(--l-papel)]' : 'text-[#a3a3a3] hover:text-[var(--l-papel)]'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`h-3 w-3 rounded-full transition-transform duration-200 md:h-4 md:w-4 ${
                        selecionado ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                      }`}
                      style={{ background: t.acento }}
                    />
                    {t.nome}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 max-w-[36ch] text-[16px] leading-snug md:mt-8 md:text-[17px]">
            <span className="font-medium">{tema.nome}:</span> {tema.descricao.toLowerCase()}. Na tela, a loja de
            exemplo {loja.nome}. O cardápio inteiro muda de cor num clique, no painel.
          </p>
        </div>
      </div>
    </section>
  );
}
