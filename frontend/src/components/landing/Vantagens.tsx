import { VANTAGENS } from './dados';

// Quatro campos de cor chapados, um benefício por campo: frase enorme
// embaixo, explicação + fatos concretos num canto do topo e uma foto do
// mundo do lojista no canto oposto. Campos alternados espelham no desktop.
export function Vantagens() {
  return (
    <section id="vantagens" aria-label="Vantagens">
      {VANTAGENS.map((v, i) => {
        const espelhado = i % 2 === 1;
        return (
          <div
            key={v.frase}
            className="l-margem grid min-h-[64svh] grid-cols-12 content-between gap-y-10 py-10 md:min-h-[86svh] md:gap-y-14 md:py-12"
            style={{ background: v.fundo, color: v.tinta }}
          >
            <div
              className={`col-span-12 md:col-span-5 md:row-start-1 ${espelhado ? 'md:col-start-2' : 'md:col-start-8'}`}
            >
              <p className="l-revela max-w-[34ch] text-[length:var(--l-destaque)] leading-snug">{v.texto}</p>
              <ul className="mt-6 space-y-1.5 text-[length:var(--l-corpo)]" aria-label={`Detalhes: ${v.frase}`}>
                {v.fatos.map((f, j) => (
                  <li key={f} className="l-revela flex gap-3" style={{ ['--l-ordem' as string]: j + 1 }}>
                    <span aria-hidden className="mt-[0.6em] h-2 w-2 shrink-0" style={{ background: v.tinta }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div
              className={`l-revela col-span-12 overflow-hidden md:row-start-1 ${
                espelhado ? 'md:col-span-4 md:col-start-8' : 'md:col-span-4 md:col-start-1'
              }`}
              style={{ ['--l-ordem' as string]: 2 }}
            >
              <img
                src={v.foto.src}
                alt={v.foto.alt}
                width={v.foto.w}
                height={v.foto.h}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover md:aspect-[4/5] md:max-h-[44svh]"
              />
            </div>
            <h2
              className={`l-revela col-span-12 self-end text-[clamp(3.25rem,13vw,9.5rem)] font-medium leading-[0.9] tracking-[-0.05em] md:text-[clamp(3.5rem,9vw,9.5rem)] ${
                espelhado ? 'md:col-span-11 md:col-start-2 md:text-right' : 'md:col-span-11'
              }`}
              style={{ ['--l-ordem' as string]: 3 }}
            >
              {v.frase}
            </h2>
          </div>
        );
      })}
    </section>
  );
}
