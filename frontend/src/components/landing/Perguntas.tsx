import { PERGUNTAS } from './dados';

// <details> com `name` compartilhado: abrir uma fecha a outra (nos
// navegadores que suportam; nos outros, só não fecha sozinho).
export function Perguntas() {
  return (
    <section
      id="perguntas"
      aria-label="Perguntas frequentes"
      className="l-margem grid grid-cols-12 gap-y-8 bg-[var(--l-hortela)] py-16 text-[var(--l-tinta)] md:py-28"
    >
      <h2 className="l-revela col-span-12 self-start text-[clamp(2.75rem,10vw,5rem)] font-medium leading-[0.92] tracking-[-0.045em] md:sticky md:top-24 md:col-span-4 md:text-[clamp(3rem,4.6vw,5rem)]">
        Perguntas
      </h2>
      <div className="col-span-12 space-y-1.5 md:col-span-8 md:col-start-5 md:space-y-2">
        {PERGUNTAS.map((q, i) => (
          <details
            key={q.p}
            name="perguntas"
            className="l-pergunta l-revela bg-[#c4eadf] open:bg-[var(--l-floresta)] open:text-[var(--l-papel)]"
            style={{ ['--l-ordem' as string]: Math.min(i, 4) }}
          >
            <summary className="flex min-h-[64px] items-center justify-between gap-6 px-5 py-4 text-[18px] font-medium md:min-h-[72px] md:px-6 md:text-[20px]">
              {q.p}
              <span className="l-mais" aria-hidden />
            </summary>
            <p className="max-w-[52ch] px-5 pb-6 text-[16px] leading-relaxed md:px-6 md:text-[17px]">{q.r}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
