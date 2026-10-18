import { ShoppingBag } from 'lucide-react';
import type { LojaExemplo } from './dados';
import { brl } from './dados';

// Pedaço do cardápio público montado em HTML com o MESMO sistema de temas
// do cardápio de verdade (data-tema + bg-acento/bg-superficie etc. de
// index.css) — trocar o tema aqui é exatamente o que o lojista vê ao trocar
// no painel. `data-ui` marca que as bordas/raios são da interface do
// produto, não da página.
export function CardapioFragmento({ loja }: { loja: LojaExemplo }) {
  const total = loja.itens[0].preco;
  return (
    <div
      data-ui
      data-tema={loja.tema}
      className="relative w-full overflow-hidden rounded-[28px] bg-fundo font-corpo text-tinta ring-1 ring-black/10"
    >
      <div className="relative h-28 overflow-hidden sm:h-32">
        <img
          key={loja.banner}
          src={loja.banner}
          alt={`Banner da loja de exemplo ${loja.nome}`}
          width={1000}
          height={667}
          className="l-respira h-full w-full object-cover"
        />
      </div>
      <div className="bg-acento px-4 pb-4 pt-3 text-center">
        <p className="font-display text-2xl tracking-wide text-texto-claro">{loja.nome}</p>
        <p className="mt-0.5 text-xs text-texto-claro/80">Aberto agora · entrega e retirada</p>
      </div>
      <div className="flex gap-2 overflow-hidden px-4 pt-4">
        {['Tudo', ...loja.categorias].map((c, i) => (
          <span
            key={c}
            className={`shrink-0 rounded-full px-3.5 py-1.5 font-display text-sm tracking-wide ${
              i === 0 ? 'bg-acento text-texto-claro' : 'bg-superficie text-tinta-suave ring-1 ring-tinta/10'
            }`}
          >
            {c}
          </span>
        ))}
      </div>
      <div className="space-y-3 p-4 pb-20">
        {loja.itens.map((item, i) => (
          <div key={item.nome} className="flex gap-3 rounded-2xl bg-superficie p-3">
            {item.foto ? (
              <img
                src={item.foto}
                alt={item.nome}
                width={64}
                height={64}
                loading="lazy"
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-acento/15 font-display text-xl text-acento">
                {item.nome.charAt(0)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-display text-base leading-tight tracking-wide">{item.nome}</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-tinta-suave">{item.desc}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="rounded-full px-2.5 py-0.5 font-semibold tabular-nums text-sm text-acento ring-1 ring-acento">
                  {brl(item.preco)}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    i === 0 ? 'bg-tinta text-fundo' : 'bg-acento text-texto-claro'
                  }`}
                >
                  {i === 0 ? '1 no carrinho' : 'Adicionar'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between rounded-2xl bg-tinta px-4 py-3 text-fundo">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <ShoppingBag className="h-4 w-4" strokeWidth={2} />
          Ver carrinho
        </span>
        <span className="font-semibold tabular-nums text-sm">{brl(total)}</span>
      </div>
    </div>
  );
}
