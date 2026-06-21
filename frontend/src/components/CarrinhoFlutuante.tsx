import { useCartStore } from '../store/cartStore';

interface Props {
  onAbrir: () => void;
}

export function CarrinhoFlutuante({ onAbrir }: Props) {
  const itens = useCartStore((state) => state.itens);
  const total = useCartStore((state) => state.total());

  const quantidadeTotal = itens.reduce((soma, item) => soma + item.quantidade, 0);

  if (quantidadeTotal === 0) return null;

  return (
    <button
      onClick={onAbrir}
      className="fixed inset-x-4 bottom-4 z-20 flex items-center justify-between rounded-2xl bg-tinta px-5 py-4 text-superficie shadow-lg transition active:scale-[0.98] sm:inset-x-auto sm:right-6 sm:w-80"
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-douro font-carimbo text-xs font-semibold text-tinta">
          {quantidadeTotal}
        </span>
        Ver carrinho
      </span>
      <span className="font-carimbo text-sm font-semibold">
        R$ {total.toFixed(2).replace('.', ',')}
      </span>
    </button>
  );
}