import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  deletarCategoria,
} from '../../api/admin';
import type { Categoria } from '../../api/types';
import { Campo } from '../../components/Campo';

export function Categorias() {
  const queryClient = useQueryClient();

  const { data: categorias, isLoading } = useQuery({
    queryKey: ['categorias'],
    queryFn: listarCategorias,
  });

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['categorias'] });

  const mutCriar = useMutation({
    mutationFn: criarCategoria,
    onSuccess: () => {
      invalidar();
      fecharForm();
    },
    onError: () =>
      setErro('Não foi possível criar — talvez já exista uma categoria com esse nome.'),
  });

  const mutAtualizar = useMutation({
    mutationFn: ({ id, nome }: { id: number; nome: string }) => atualizarCategoria(id, nome),
    onSuccess: () => {
      invalidar();
      fecharForm();
    },
    onError: () => setErro('Não foi possível salvar.'),
  });

  const mutDeletar = useMutation({
    mutationFn: deletarCategoria,
    onSuccess: () => {
      invalidar();
      setErroExclusao(null);
    },
    onError: (err) => {
      // O backend manda uma mensagem específica quando a categoria ainda
      // tem produto dentro — mostra ela de verdade, não um erro genérico.
      const mensagem =
        axios.isAxiosError(err) && err.response?.data?.erro
          ? err.response.data.erro
          : 'Não foi possível excluir.';
      setErroExclusao(mensagem);
    },
  });

  function abrirNovo() {
    setEditandoId(null);
    setNome('');
    setErro(null);
    setMostrarForm(true);
  }

  function abrirEdicao(categoria: Categoria) {
    setEditandoId(categoria.id);
    setNome(categoria.nome);
    setErro(null);
    setMostrarForm(true);
  }

  function fecharForm() {
    setMostrarForm(false);
    setEditandoId(null);
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Digita um nome.');
      return;
    }
    setErro(null);
    if (editandoId) {
      mutAtualizar.mutate({ id: editandoId, nome: nome.trim() });
    } else {
      mutCriar.mutate(nome.trim());
    }
  }

  const salvando = mutCriar.isPending || mutAtualizar.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-wide text-tinta">Categorias</h1>
        {!mostrarForm && (
          <button
            onClick={abrirNovo}
            className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-superficie"
          >
            + Nova categoria
          </button>
        )}
      </div>

      <p className="text-sm text-tinta-suave">
        São as abas que o cliente vê no cardápio (ex: Salgados, Doces). Toda loja já nasce com
        essas duas — adiciona mais se quiser organizar diferente.
      </p>

      {mostrarForm && (
        <form onSubmit={salvar} className="space-y-4 rounded-2xl bg-superficie p-5 shadow-sm">
          <h2 className="font-display text-lg tracking-wide text-tinta">
            {editandoId ? 'Editar categoria' : 'Nova categoria'}
          </h2>

          <Campo label="Nome">
            <input
              required
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Bebidas"
              className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
            />
          </Campo>

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

      {erroExclusao && (
        <p className="rounded-lg bg-acento/10 px-4 py-2 text-sm text-acento">{erroExclusao}</p>
      )}

      {isLoading ? (
        <p className="text-tinta-suave">Carregando categorias...</p>
      ) : categorias && categorias.length > 0 ? (
        <ul className="space-y-3">
          {categorias.map((categoria) => (
            <li
              key={categoria.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-superficie p-4 shadow-sm"
            >
              <p className="font-medium text-tinta">{categoria.nome}</p>

              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => abrirEdicao(categoria)}
                  className="text-sm font-medium text-acento hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir "${categoria.nome}"?`)) mutDeletar.mutate(categoria.id);
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
        <p className="text-tinta-suave">Nenhuma categoria ainda.</p>
      )}
    </div>
  );
}