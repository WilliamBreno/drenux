import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listarProdutos,
  criarProduto,
  atualizarProduto,
  deletarProduto,
  listarCategorias,
  type ProdutoInput,
} from '../../api/admin';
import type { Produto } from '../../api/types';
import { Campo } from '../../components/Campo';
import { enviarImagem, logoMiniatura } from '../../api/upload';

const formVazio: ProdutoInput = {
  nome: '',
  descricao: '',
  preco: 0,
  foto_url: '',
  disponivel: true,
  categoria_id: 0,
};

export function Produtos() {
  const queryClient = useQueryClient();

  const { data: produtos, isLoading } = useQuery({
    queryKey: ['produtos'],
    queryFn: listarProdutos,
  });
  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: listarCategorias,
  });

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<ProdutoInput>(formVazio);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['produtos'] });

  const mutCriar = useMutation({
    mutationFn: criarProduto,
    onSuccess: () => {
      invalidar();
      fecharForm();
    },
    onError: () => setErro('Não foi possível salvar o produto.'),
  });

  const mutAtualizar = useMutation({
    mutationFn: ({ id, input }: { id: number; input: ProdutoInput }) =>
      atualizarProduto(id, input),
    onSuccess: () => {
      invalidar();
      fecharForm();
    },
    onError: () => setErro('Não foi possível salvar o produto.'),
  });

  const mutDeletar = useMutation({
    mutationFn: deletarProduto,
    onSuccess: invalidar,
  });

  function abrirNovo() {
    setEditandoId(null);
    setForm({ ...formVazio, categoria_id: categorias?.[0]?.id ?? 0 });
    setErro(null);
    setMostrarForm(true);
  }

  function abrirEdicao(produto: Produto) {
    setEditandoId(produto.id);
    setForm({
      nome: produto.nome,
      descricao: produto.descricao,
      preco: produto.preco,
      foto_url: produto.foto_url,
      disponivel: produto.disponivel,
      categoria_id: produto.categoria_id,
    });
    setErro(null);
    setMostrarForm(true);
  }

  function fecharForm() {
    setMostrarForm(false);
    setEditandoId(null);
  }

  // Aqui não salva sozinho como a logo — fica só na memória do
  // formulário, e vai junto quando o produto inteiro for salvo.
  async function selecionarFoto(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setEnviandoFoto(true);
    setErro(null);
    try {
      const url = await enviarImagem(arquivo);
      setForm((atual) => ({ ...atual, foto_url: url }));
    } catch {
      setErro('Não foi possível enviar a foto. Tenta um arquivo menor ou outro formato.');
    } finally {
      setEnviandoFoto(false);
    }
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || form.preco <= 0 || !form.categoria_id) {
      setErro('Preenche nome, preço e categoria.');
      return;
    }
    setErro(null);
    if (editandoId) {
      mutAtualizar.mutate({ id: editandoId, input: form });
    } else {
      mutCriar.mutate(form);
    }
  }

  // Atalho pra pausar/ativar sem abrir o formulário inteiro — manda o
  // produto completo de volta, só invertendo o campo disponivel (o PUT
  // espera o objeto inteiro, não uma atualização parcial).
  function alternarDisponibilidade(produto: Produto) {
    mutAtualizar.mutate({
      id: produto.id,
      input: {
        nome: produto.nome,
        descricao: produto.descricao,
        preco: produto.preco,
        foto_url: produto.foto_url,
        categoria_id: produto.categoria_id,
        disponivel: !produto.disponivel,
      },
    });
  }

  const salvando = mutCriar.isPending || mutAtualizar.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-wide text-tinta">Produtos</h1>
        {!mostrarForm && (
          <button
            onClick={abrirNovo}
            className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-superficie"
          >
            + Novo produto
          </button>
        )}
      </div>

      {mostrarForm && (
        <form onSubmit={salvar} className="space-y-4 rounded-2xl bg-superficie p-5 shadow-sm">
          <h2 className="font-display text-lg tracking-wide text-tinta">
            {editandoId ? 'Editar produto' : 'Novo produto'}
          </h2>

          <Campo label="Nome">
            <input
              required
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
            />
          </Campo>

          <Campo label="Descrição">
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
            />
          </Campo>

          <div className="flex gap-3">
            <Campo label="Preço (R$)" className="flex-1">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={form.preco || ''}
                onChange={(e) => setForm({ ...form, preco: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
              />
            </Campo>

            <Campo label="Categoria" className="flex-1">
              <select
                required
                value={form.categoria_id || ''}
                onChange={(e) => setForm({ ...form, categoria_id: Number(e.target.value) })}
                className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
              >
                <option value="" disabled>
                  Escolhe...
                </option>
                {categorias?.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-tinta-suave">
              Foto (opcional)
            </span>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-tinta/25 bg-fundo">
                {form.foto_url ? (
                  <img
                    src={logoMiniatura(form.foto_url)}
                    alt="Foto do produto"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="font-display text-xl text-tinta/30">
                    {form.nome.charAt(0).toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <label className="cursor-pointer rounded-full border border-tinta/20 px-4 py-2 text-sm font-semibold text-tinta transition hover:border-acento">
                {enviandoFoto ? 'Enviando...' : form.foto_url ? 'Trocar foto' : 'Enviar foto'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={selecionarFoto}
                  disabled={enviandoFoto}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-tinta">
            <input
              type="checkbox"
              checked={form.disponivel}
              onChange={(e) => setForm({ ...form, disponivel: e.target.checked })}
              className="h-4 w-4 accent-acento"
            />
            Disponível no cardápio
          </label>

          {erro && <p className="text-sm text-acento">{erro}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={fecharForm}
              className="rounded-full border border-tinta/20 px-4 py-2 text-sm font-semibold text-tinta"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-superficie disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-tinta-suave">Carregando produtos...</p>
      ) : produtos && produtos.length > 0 ? (
        <ul className="space-y-3">
          {produtos.map((produto) => (
            <li
              key={produto.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-superficie p-4 shadow-sm"
            >
              <div className={`flex items-center gap-3 ${!produto.disponivel ? 'opacity-50' : ''}`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-fundo">
                  {produto.foto_url ? (
                    <img
                      src={logoMiniatura(produto.foto_url)}
                      alt={produto.nome}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="font-display text-sm text-tinta/30">
                      {produto.nome.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-tinta">{produto.nome}</p>
                  <p className="font-carimbo text-sm text-tinta-suave">
                    R$ {produto.preco.toFixed(2).replace('.', ',')} ·{' '}
                    {produto.categoria?.nome ?? 'sem categoria'}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => alternarDisponibilidade(produto)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    produto.disponivel ? 'bg-douro/20 text-douro' : 'bg-tinta/10 text-tinta-suave'
                  }`}
                >
                  {produto.disponivel ? 'Disponível' : 'Pausado'}
                </button>
                <button
                  onClick={() => abrirEdicao(produto)}
                  className="text-sm font-medium text-acento hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir "${produto.nome}"?`)) mutDeletar.mutate(produto.id);
                  }}
                  className="text-sm text-tinta-suave hover:text-acento"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-tinta-suave">Nenhum produto cadastrado ainda.</p>
      )}
    </div>
  );
}