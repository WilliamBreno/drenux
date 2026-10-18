import { useEffect, useRef } from 'react';
import '../components/landing/landing.css';
import { Hero } from '../components/landing/Hero';
import { Vantagens } from '../components/landing/Vantagens';
import { Temas } from '../components/landing/Temas';
import { ComoFunciona } from '../components/landing/ComoFunciona';
import { Precos } from '../components/landing/Precos';
import { Perguntas } from '../components/landing/Perguntas';
import { Fechamento } from '../components/landing/Fechamento';

// Landing comercial (rota "/"). Cada seção é um "capítulo" com a cor
// chapada de um tema real do cardápio — ver components/landing/landing.css.
export function Planos() {
  const raiz = useRef<HTMLDivElement>(null);

  // Entradas ao rolar: só marca a raiz com .l-anima depois que o JS roda,
  // então sem JS (ou sem IntersectionObserver) nada fica escondido.
  useEffect(() => {
    const el = raiz.current;
    if (!el || !('IntersectionObserver' in window)) return;
    el.classList.add('l-anima');
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add('l-visivel');
            obs.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    el.querySelectorAll('.l-revela').forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const anterior = document.title;
    document.title = 'Drenux · Cardápio digital com Pix e WhatsApp';
    return () => {
      document.title = anterior;
    };
  }, []);

  return (
    <div ref={raiz} id="topo" className="drx-l min-h-[100svh]">
      <Hero />
      <Vantagens />
      <Temas />
      <ComoFunciona />
      <Precos />
      <Perguntas />
      <Fechamento />
    </div>
  );
}
