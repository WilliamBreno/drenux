import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Guia da página no formato das abas de categoria do cardápio público
// (mesmo desenho de components/AbasCategorias.tsx: pílula com borda, fonte
// display, aba ativa preenchida). Fica fixa no topo e acompanha a rolagem,
// marcando a "categoria" (seção) em que o visitante está.
const SECOES = [
  { id: 'topo', rotulo: 'Tudo' },
  { id: 'vantagens', rotulo: 'Vantagens' },
  { id: 'temas', rotulo: 'Temas' },
  { id: 'como-funciona', rotulo: 'Como funciona' },
  { id: 'planos', rotulo: 'Planos' },
  { id: 'perguntas', rotulo: 'Perguntas' },
];

export function Cabecalho() {
  const [ativa, setAtiva] = useState('topo');

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) setAtiva(e.target.id);
      },
      // Conta como "ativa" a seção que cruza a faixa logo abaixo do cabeçalho.
      { rootMargin: '-140px 0px -60% 0px' }
    );
    SECOES.forEach((s) => {
      const el = document.getElementById(s.id === 'topo' ? 'inicio' : s.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[var(--l-preto)] text-[var(--l-papel)]">
      <div className="l-margem flex h-16 items-center justify-between gap-4">
        <a href="#topo" className="text-[20px] font-medium tracking-[0.18em] text-[var(--l-ouro)]" aria-label="Drenux, voltar ao topo">
          DRENUX
        </a>
        <div className="flex items-center gap-5">
          <Link to="/login" className="l-link text-[15px]">
            Entrar
          </Link>
          <Link to="/cadastro" className="l-botao l-botao--ouro hidden !min-h-[40px] !px-4 !text-[15px] sm:inline-flex">
            Criar loja grátis
          </Link>
        </div>
      </div>
      <nav aria-label="Seções da página" className="pb-3">
        <ul className="l-rolagem-x l-margem flex gap-2.5 overflow-x-auto">
          {SECOES.map((s) => {
            const sel = ativa === s.id || (s.id === 'topo' && ativa === 'inicio');
            return (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#${s.id}`}
                  aria-current={sel ? 'true' : undefined}
                  className={`block rounded-full border-2 px-5 py-1.5 font-display text-[15px] tracking-wide transition-colors duration-200 ${
                    sel
                      ? 'border-[var(--l-ouro)] bg-[var(--l-ouro)] text-[var(--l-tinta)]'
                      : 'border-white/25 text-[var(--l-papel)] hover:border-white/60'
                  }`}
                >
                  {s.rotulo}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
