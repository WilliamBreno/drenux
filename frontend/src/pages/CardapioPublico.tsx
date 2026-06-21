import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { buscarCardapio } from '../api/catalogo';
import { ProdutoCard } from '../components/ProdutoCard';
import { AbasCategorias } from '../components/AbasCategorias';
import { CarrinhoFlutuante } from '../components/CarrinhoFlutuante';
import { CarrinhoDrawer } from '../components/CarrinhoDrawer';

export function CardapioPublico() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const pagamentoConfirmado = searchParams.get('pago') === '1';
  const [categoriaAtiva, setCategoriaAtiva] = useState<number | null>(null);
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cardapio', slug],
    queryFn: () => buscarCardapio(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fundo">
        <p className="font-display tracking-wide text-tinta-suave">Abrindo o cardápio...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-fundo px-6 text-center">
        <p className="font-display text-2xl text-tinta">Loja não encontrada</p>
        <p className="text-tinta-suave">
          Confere se o link está certo — pode ser que essa loja ainda não exista.
        </p>
      </div>
    );
  }

  const produtosFiltrados = categoriaAtiva
    ? data.produtos.filter((produto) => produto.categoria_id === categoriaAtiva)
    : data.produtos;

  return (
    <div className="min-h-screen bg-fundo pb-28">
      {pagamentoConfirmado && (
        <div className="bg-emerald-600 px-6 py-3 text-center text-sm font-medium text-white">
          Pedido confirmado! Você vai receber uma mensagem no WhatsApp com os detalhes.
        </div>
      )}

      {/* Faixa de toldo */}
      <header className="bg-acento px-6 py-8 text-center">
        {data.loja.logo_url && (
          <img
            src={data.loja.logo_url}
            alt={data.loja.nome}
            className="mx-auto mb-3 h-16 w-16 rounded-full border-2 border-superficie/40 object-cover"
          />
        )}
        <h1 className="font-display text-3xl tracking-wide text-superficie sm:text-4xl">
          {data.loja.nome}
        </h1>
        <p className="mt-1 font-carimbo text-xs uppercase tracking-[0.2em] text-superficie/70">
          Cardápio online
        </p>
      </header>

      <div className="sticky top-0 z-10 bg-fundo/95 py-3 backdrop-blur">
        <AbasCategorias
          categorias={data.categorias}
          ativa={categoriaAtiva}
          onSelecionar={setCategoriaAtiva}
        />
      </div>

      <main className="mx-auto max-w-2xl space-y-3 px-4 pt-2">
        {produtosFiltrados.length === 0 ? (
          <p className="py-12 text-center text-tinta-suave">Nenhum produto por aqui ainda.</p>
        ) : (
          produtosFiltrados.map((produto) => <ProdutoCard key={produto.id} produto={produto} />)
        )}
      </main>

      <CarrinhoFlutuante onAbrir={() => setCarrinhoAberto(true)} />

      <CarrinhoDrawer
        aberto={carrinhoAberto}
        onFechar={() => setCarrinhoAberto(false)}
        slug={slug!}
        permiteMesmoDia={data.loja.permite_mesmo_dia}
      />
    </div>
  );
}