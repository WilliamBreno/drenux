import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { buscarCardapio } from '../api/catalogo';
import { ProdutoCard } from '../components/ProdutoCard';
import { AbasCategorias } from '../components/AbasCategorias';
import { CarrinhoFlutuante } from '../components/CarrinhoFlutuante';
import { CarrinhoDrawer } from '../components/CarrinhoDrawer';

function lojaEstaAberta(loja: {
  horario_abertura: string;
  horario_fechamento: string;
  margem_fechamento_minutos: number;
  pausado: boolean;
}): boolean {
  if (loja.pausado) return false;
  if (!loja.horario_abertura || !loja.horario_fechamento) return true;

  const agora = new Date();
  const hhmm = agora.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  });

  let fechamento = loja.horario_fechamento;
  if (loja.margem_fechamento_minutos > 0) {
    const [h, m] = loja.horario_fechamento.split(':').map(Number);
    const total = h * 60 + m - loja.margem_fechamento_minutos;
    const hf = Math.floor(total / 60).toString().padStart(2, '0');
    const mf = (total % 60).toString().padStart(2, '0');
    fechamento = `${hf}:${mf}`;
  }

  return hhmm >= loja.horario_abertura && hhmm < fechamento;
}

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
    refetchInterval: 60_000, // revalida o status de aberta a cada minuto
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
        <p className="text-tinta-suave">Confere se o link está certo.</p>
      </div>
    );
  }

  const aberta = lojaEstaAberta(data.loja);

  // Se a loja está pausada ou fechada, mostra só o aviso
  if (!aberta) {
    const mensagem = data.loja.pausado
      ? data.loja.mensagem_pausa || 'Loja temporariamente fechada.'
      : `Estamos fechados no momento. Funcionamos das ${data.loja.horario_abertura} às ${data.loja.horario_fechamento}.`;

    return (
      <div className="min-h-screen bg-fundo" data-tema={data.loja.tema || 'kraft'}>
        <header className="bg-acento px-6 py-8 text-center">
          {data.loja.logo_url && (
            <img src={data.loja.logo_url} alt={data.loja.nome}
              className="mx-auto mb-3 h-16 w-16 rounded-full border-2 border-superficie/40 object-cover" />
          )}
          <h1 className="font-display text-3xl tracking-wide text-superficie">{data.loja.nome}</h1>
        </header>
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="rounded-full bg-tinta/10 px-4 py-1 font-carimbo text-xs uppercase tracking-widest text-tinta-suave">
            {data.loja.pausado ? 'Produção pausada' : 'Fechado'}
          </span>
          <p className="max-w-sm text-tinta-suave">{mensagem}</p>
        </div>
      </div>
    );
  }

  const produtosFiltrados = categoriaAtiva
    ? data.produtos.filter((produto) => produto.categoria_id === categoriaAtiva)
    : data.produtos;

  return (
    <div className="min-h-screen bg-fundo pb-28" data-tema={data.loja.tema || 'kraft'}>
      {pagamentoConfirmado && (
        <div className="bg-emerald-600 px-6 py-3 text-center text-sm font-medium text-white">
          Pedido confirmado! Você vai receber uma mensagem no WhatsApp com os detalhes.
        </div>
      )}

      <header className="bg-acento px-6 py-8 text-center">
        {data.loja.logo_url && (
          <img src={data.loja.logo_url} alt={data.loja.nome}
            className="mx-auto mb-3 h-16 w-16 rounded-full border-2 border-superficie/40 object-cover" />
        )}
        <h1 className="font-display text-3xl tracking-wide text-superficie sm:text-4xl">
          {data.loja.nome}
        </h1>
        {data.loja.horario_abertura && data.loja.horario_fechamento && (
          <p className="mt-1 font-carimbo text-xs uppercase tracking-[0.2em] text-superficie/70">
            {data.loja.horario_abertura} – {data.loja.horario_fechamento}
          </p>
        )}
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
        modoPedido={data.loja.modo_pedido}
        antecedenciaMinimaHoras={data.loja.antecedencia_minima_horas}
        aceitaRetirada={data.loja.aceita_retirada}
        aceitaEntrega={data.loja.aceita_entrega}
        taxaEntregaTipo={data.loja.taxa_entrega_tipo}
        taxaEntregaValor={data.loja.taxa_entrega_valor}
        valorMinimoPedido={data.loja.valor_minimo_pedido}
      />
    </div>
  );
}