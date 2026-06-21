import { useCartStore } from '../store/cartStore';
import type { Produto } from '../api/types';

interface Props {
  produto: Produto;
}

export function ProdutoCard({ produto }: Props) {
  const adicionar = useCartStore((state) => state.adicionar);

  return (
    <div className="group flex gap-4 rounded-2xl bg-superficie p-4 shadow-[0_2px_0_0_rgba(43,33,24,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_rgba(43,33,24,0.08)]">
      {produto.foto_url ? (
        <img
          src={produto.foto_url}
          alt={produto.nome}
          className="h-20 w-20 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-tinta/25 bg-fundo">
          <span className="font-display text-2xl text-tinta/40">
            {produto.nome.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col justify-between gap-2">
        <div>
          <h3 className="font-display text-lg leading-none tracking-wide text-tinta">
            {produto.nome}
          </h3>
          {produto.descricao && (
            <p className="mt-1.5 text-sm text-tinta-suave">{produto.descricao}</p>
          )}
        </div>

        <div className="flex items-end justify-between gap-2">
          <span className="inline-flex items-center rounded-full border-2 border-acento px-3 py-0.5 font-carimbo text-sm font-semibold text-acento">
            R$ {produto.preco.toFixed(2).replace('.', ',')}
          </span>

          <button
            onClick={() => adicionar(produto)}
            className="rounded-full bg-acento px-4 py-1.5 text-sm font-semibold text-superficie transition active:scale-95 hover:bg-acento/90"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}