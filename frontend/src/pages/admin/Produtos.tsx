import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listarProdutos, criarProduto, atualizarProduto, deletarProduto,
  listarCategorias, criarVariacao, atualizarVariacao, deletarVariacao,
  adicionarFoto, deletarFoto,
  type ProdutoInput, type VariacaoInput,
} from '../../api/admin';
import type { Produto, VariacaoProduto } from '../../api/types';
import { Campo } from '../../components/Campo';
import { enviarImagem, logoMiniatura } from '../../api/upload';

const formVazio: ProdutoInput = {
  nome: '',
  descricao: '',
  preco: 0,
  foto_url: '',
  disponivel: true,
  categoria_id: 0,
  estoque_atual: null,
  estoque_alerta: null,
  tipo_produto: 'alimenticio',
  peso_gramas: null,
};

const variacaoVazia: VariacaoInput = {
  nome: '',
  preco_adicional: 0,
  disponivel: true,
  estoque_atual: null,
  estoque_alerta: null,
  ordem: 0,
};

export function Produtos() {
  const queryClient = useQueryClient();

  const { data: produtos, isLoading } = useQuery({ queryKey: ['produtos'], queryFn: listarProdutos });
  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: listarCategorias });

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<ProdutoInput>(formVazio);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  // Variações
  const [produtoExpandido, setProdutoExpandido] = useState<number | null>(null);
  const [editandoVariacaoId, setEditandoVariacaoId] = useState<number | null>(null);
  const [mostrarFormVariacao, setMostrarFormVariacao] = useState(false);
  const [formVariacao, setFormVariacao] = useState<VariacaoInput>(variacaoVazia);
  const [erroVariacao, setErroVariacao] = useState<string | null>(null);

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['produtos'] });

  const mutCriar = useMutation({ mutationFn: criarProduto, onSuccess: () => { invalidar(); fecharForm(); }, onError: () => setErro('Não foi possível salvar o produto.') });
  const mutAtualizar = useMutation({ mutationFn: ({ id, input }: { id: number; input: ProdutoInput }) => atualizarProduto(id, input), onSuccess: () => { invalidar(); fecharForm(); }, onError: () => setErro('Não foi possível salvar o produto.') });
  const mutDeletar = useMutation({ mutationFn: deletarProduto, onSuccess: invalidar });

  const mutCriarVar = useMutation({ mutationFn: ({ pid, input }: { pid: number; input: VariacaoInput }) => criarVariacao(pid, input), onSuccess: () => { invalidar(); fecharFormVariacao(); }, onError: () => setErroVariacao('Não foi possível salvar.') });
  const mutAtualizarVar = useMutation({ mutationFn: ({ pid, vid, input }: { pid: number; vid: number; input: VariacaoInput }) => atualizarVariacao(pid, vid, input), onSuccess: () => { invalidar(); fecharFormVariacao(); }, onError: () => setErroVariacao('Não foi possível salvar.') });
  const mutDeletarVar = useMutation({ mutationFn: ({ pid, vid }: { pid: number; vid: number }) => deletarVariacao(pid, vid), onSuccess: invalidar });

  function abrirNovo() {
    setEditandoId(null);
    setForm({ ...formVazio, categoria_id: categorias?.[0]?.id ?? 0 });
    setErro(null);
    setMostrarForm(true);
  }

  function abrirEdicao(produto: Produto) {
    setEditandoId(produto.id);
    setForm({ nome: produto.nome, descricao: produto.descricao, preco: produto.preco, foto_url: produto.foto_url, disponivel: produto.disponivel, categoria_id: produto.categoria_id, estoque_atual: produto.estoque_atual, estoque_alerta: produto.estoque_alerta, tipo_produto: produto.tipo_produto, peso_gramas: produto.peso_gramas });
    setErro(null);
    setMostrarForm(true);
  }

  function fecharForm() { setMostrarForm(false); setEditandoId(null); }

  async function selecionarFoto(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoFoto(true);
    setErro(null);
    try {
      const url = await enviarImagem(arquivo);
      setForm((atual) => ({ ...atual, foto_url: url }));
    } catch {
      setErro('Não foi possível enviar a foto.');
    } finally {
      setEnviandoFoto(false);
    }
  }

  function salvar(e: FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || form.preco <= 0 || !form.categoria_id) { setErro('Preenche nome, preço e categoria.'); return; }
    if (form.tipo_produto === 'mercadoria' && (!form.peso_gramas || form.peso_gramas <= 0)) { setErro('Produtos do tipo Mercadoria precisam de um peso (em gramas).'); return; }
    setErro(null);
    if (editandoId) { mutAtualizar.mutate({ id: editandoId, input: form }); }
    else { mutCriar.mutate(form); }
  }

  function alternarDisponibilidade(produto: Produto) {
    mutAtualizar.mutate({ id: produto.id, input: { nome: produto.nome, descricao: produto.descricao, preco: produto.preco, foto_url: produto.foto_url, categoria_id: produto.categoria_id, disponivel: !produto.disponivel, estoque_atual: produto.estoque_atual, estoque_alerta: produto.estoque_alerta, tipo_produto: produto.tipo_produto, peso_gramas: produto.peso_gramas } });
  }

  // Variações
  function abrirNovaVariacao(produtoId: number) {
    setProdutoExpandido(produtoId);
    setEditandoVariacaoId(null);
    setFormVariacao(variacaoVazia);
    setErroVariacao(null);
    setMostrarFormVariacao(true);
  }

  function abrirEdicaoVariacao(produtoId: number, variacao: VariacaoProduto) {
    setProdutoExpandido(produtoId);
    setEditandoVariacaoId(variacao.id);
    setFormVariacao({ nome: variacao.nome, preco_adicional: variacao.preco_adicional, disponivel: variacao.disponivel, estoque_atual: variacao.estoque_atual, estoque_alerta: variacao.estoque_alerta, ordem: variacao.ordem });
    setErroVariacao(null);
    setMostrarFormVariacao(true);
  }

  function fecharFormVariacao() { setMostrarFormVariacao(false); setEditandoVariacaoId(null); }

  function salvarVariacao(e: FormEvent, produtoId: number) {
    e.preventDefault();
    if (!formVariacao.nome.trim()) { setErroVariacao('Digita um nome.'); return; }
    setErroVariacao(null);
    if (editandoVariacaoId) { mutAtualizarVar.mutate({ pid: produtoId, vid: editandoVariacaoId, input: formVariacao }); }
    else { mutCriarVar.mutate({ pid: produtoId, input: formVariacao }); }
  }

  // Fotos
  const [produtoFotos, setProdutoFotos] = useState<number | null>(null);
  const [enviandoFotoProduto, setEnviandoFotoProduto] = useState(false);

  const salvando = mutCriar.isPending || mutAtualizar.isPending;

  async function adicionarFotoProduto(produtoId: number, e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoFotoProduto(true);
    try {
      const url = await enviarImagem(arquivo);
      const produto = produtos?.find(p => p.id === produtoId);
      const ordem = produto?.fotos?.length ?? 0;
      await adicionarFoto(produtoId, url, ordem);
      invalidar();
    } finally {
      setEnviandoFotoProduto(false);
    }
  }

  async function removerFotoProduto(produtoId: number, fotoId: number) {
    if (!confirm('Remover esta foto?')) return;
    await deletarFoto(produtoId, fotoId);
    invalidar();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-wide text-tinta">Produtos</h1>
        {!mostrarForm && (
          <button onClick={abrirNovo} className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-superficie">
            + Novo produto
          </button>
        )}
      </div>

      {mostrarForm && (
        <form onSubmit={salvar} className="space-y-4 rounded-2xl bg-superficie p-5 shadow-sm">
          <h2 className="font-display text-lg tracking-wide text-tinta">{editandoId ? 'Editar produto' : 'Novo produto'}</h2>

          <Campo label="Nome">
            <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento" />
          </Campo>
          <Campo label="Descrição">
            <textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={2} className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento" />
          </Campo>
          <div className="flex gap-3">
            <Campo label="Preço (R$)" className="flex-1">
              <input type="number" step="0.01" min="0.01" required value={form.preco || ''} onChange={(e) => setForm({ ...form, preco: parseFloat(e.target.value) || 0 })} className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento" />
            </Campo>
            <Campo label="Categoria" className="flex-1">
              <select required value={form.categoria_id || ''} onChange={(e) => setForm({ ...form, categoria_id: Number(e.target.value) })} className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento">
                <option value="" disabled>Escolhe...</option>
                {categorias?.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </Campo>
          </div>

          <div className="flex gap-3">
            <Campo label="Tipo de produto" className="flex-1">
              <select
                value={form.tipo_produto}
                onChange={(e) => setForm({ ...form, tipo_produto: e.target.value as 'alimenticio' | 'mercadoria', peso_gramas: e.target.value === 'alimenticio' ? null : form.peso_gramas })}
                className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
              >
                <option value="alimenticio">Alimentício</option>
                <option value="mercadoria">Mercadoria (roupas, artesanato...)</option>
              </select>
            </Campo>
            {form.tipo_produto === 'mercadoria' && (
              <Campo label="Peso (g)" className="flex-1">
                <input type="number" min="1" required value={form.peso_gramas ?? ''} onChange={(e) => setForm({ ...form, peso_gramas: e.target.value === '' ? null : parseInt(e.target.value) })} placeholder="Ex: 300" className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento" />
              </Campo>
            )}
          </div>
          {form.tipo_produto === 'mercadoria' && (
            <p className="text-xs text-tinta-suave">Produtos "Mercadoria" podem ser guardados pelo cliente e entregues depois (se a loja tiver essa opção ativada em Configurações). Alimentícios nunca podem, por segurança.</p>
          )}

          {/* Upload de foto */}
          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-tinta-suave">Foto (opcional)</span>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-tinta/25 bg-fundo">
                {form.foto_url ? <img src={logoMiniatura(form.foto_url)} alt="Foto" className="h-full w-full object-cover" /> : <span className="font-display text-xl text-tinta/30">{form.nome.charAt(0).toUpperCase() || '?'}</span>}
              </div>
              <label className="cursor-pointer rounded-full border border-tinta/20 px-4 py-2 text-sm font-semibold text-tinta hover:border-acento">
                {enviandoFoto ? 'Enviando...' : form.foto_url ? 'Trocar foto' : 'Enviar foto'}
                <input type="file" accept="image/*" onChange={selecionarFoto} disabled={enviandoFoto} className="hidden" />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-tinta">
            <input type="checkbox" checked={form.disponivel} onChange={(e) => setForm({ ...form, disponivel: e.target.checked })} className="h-4 w-4 accent-acento" />
            Disponível no cardápio
          </label>

          {/* Estoque */}
          <div className="space-y-3 rounded-xl border border-tinta/10 bg-fundo p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">Controle de estoque <span className="normal-case font-normal">(opcional)</span></p>
            <div className="flex gap-3">
              <Campo label="Quantidade em estoque" className="flex-1">
                <input type="number" min="0" value={form.estoque_atual ?? ''} onChange={(e) => setForm({ ...form, estoque_atual: e.target.value === '' ? null : parseInt(e.target.value) })} placeholder="Sem limite" className="w-full rounded-lg border border-tinta/20 bg-superficie px-3 py-2 text-tinta outline-none focus:border-acento" />
              </Campo>
              <Campo label="Alerta quando restar" className="flex-1">
                <input type="number" min="0" value={form.estoque_alerta ?? ''} onChange={(e) => setForm({ ...form, estoque_alerta: e.target.value === '' ? null : parseInt(e.target.value) })} placeholder="Não avisar" className="w-full rounded-lg border border-tinta/20 bg-superficie px-3 py-2 text-tinta outline-none focus:border-acento" />
              </Campo>
            </div>
            <p className="text-xs text-tinta-suave">Se o produto tem variações, o estoque é gerenciado por variação, não aqui.</p>
          </div>

          {erro && <p className="text-sm text-acento">{erro}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={fecharForm} className="rounded-full border border-tinta/20 px-4 py-2 text-sm font-semibold text-tinta">Cancelar</button>
            <button type="submit" disabled={salvando} className="rounded-full bg-acento px-4 py-2 text-sm font-semibold text-superficie disabled:opacity-60">{salvando ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-tinta-suave">Carregando produtos...</p>
      ) : produtos && produtos.length > 0 ? (
        <ul className="space-y-3">
          {produtos.map((produto) => (
            <li key={produto.id} className="rounded-2xl bg-superficie shadow-sm">
              {/* Card do produto */}
              <div className="p-4 space-y-2">
                {/* Linha 1: foto + nome */}
                <div className={`flex items-center gap-3 ${!produto.disponivel ? 'opacity-50' : ''}`}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-fundo">
                    {produto.foto_url ? <img src={logoMiniatura(produto.foto_url)} alt={produto.nome} className="h-full w-full object-cover" /> : <span className="font-display text-sm text-tinta/30">{produto.nome.charAt(0).toUpperCase()}</span>}
                  </div>
                  <p className="font-medium text-tinta truncate">{produto.nome}</p>
                </div>

                {/* Linha 2: preço + botões */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-carimbo text-sm text-tinta-suave">
                      R$ {produto.preco.toFixed(2).replace('.', ',')} · {produto.categoria?.nome ?? 'sem categoria'}
                    </p>
                    {produto.estoque_atual !== null && produto.variacoes?.length === 0 && (
                      <p className={`text-xs ${produto.estoque_atual === 0 ? 'text-acento' : 'text-tinta-suave'}`}>
                        {produto.estoque_atual === 0 ? 'Esgotado' : `${produto.estoque_atual} em estoque`}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1 shrink-0">
                    <button
                      onClick={() => setProdutoFotos(produtoFotos === produto.id ? null : produto.id)}
                      className="rounded-full border border-tinta/15 px-2 py-1 text-xs font-semibold text-tinta-suave hover:border-acento hover:text-acento"
                    >
                      Fotos {produto.fotos && produto.fotos.length > 0 && `(${produto.fotos.length})`}
                    </button>
                    <button
                      onClick={() => setProdutoExpandido(produtoExpandido === produto.id ? null : produto.id)}
                      className="rounded-full border border-tinta/15 px-2 py-1 text-xs font-semibold text-tinta-suave hover:border-acento hover:text-acento"
                    >
                      Variações
                    </button>
                    <button onClick={() => alternarDisponibilidade(produto)} className={`rounded-full px-2 py-1 text-xs font-semibold ${produto.disponivel ? 'bg-douro/20 text-douro' : 'bg-tinta/10 text-tinta-suave'}`}>
                      {produto.disponivel ? 'Disponível' : 'Pausado'}
                    </button>
                    <button onClick={() => abrirEdicao(produto)} className="rounded-full border border-acento/30 px-2 py-1 text-xs font-medium text-acento hover:bg-acento/5">Editar</button>
                    <button onClick={() => { if (confirm(`Excluir "${produto.nome}"?`)) mutDeletar.mutate(produto.id); }} className="rounded-full border border-tinta/15 px-2 py-1 text-xs text-tinta-suave hover:text-acento col-span-2">Excluir</button>
                  </div>
                </div>
              </div>

              {/* Painel de fotos */}
              {produtoFotos === produto.id && (
                <div className="border-t border-tinta/10 px-4 pb-4 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">Galeria de fotos</p>
                    <label className="cursor-pointer rounded-full bg-tinta px-3 py-1 text-xs font-semibold text-superficie">
                      {enviandoFotoProduto ? 'Enviando...' : '+ Adicionar'}
                      <input type="file" accept="image/*" className="hidden" disabled={enviandoFotoProduto}
                        onChange={(e) => adicionarFotoProduto(produto.id, e)} />
                    </label>
                  </div>
                  {produto.fotos && produto.fotos.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {produto.fotos.map((foto, i) => (
                        <div key={foto.id} className="relative group">
                          <img src={foto.url} alt={`Foto ${i + 1}`}
                            className="h-16 w-16 rounded-xl object-cover" />
                          <button
                            onClick={() => removerFotoProduto(produto.id, foto.id)}
                            className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-acento text-xs text-superficie group-hover:flex"
                          >×</button>
                          {i === 0 && (
                            <span className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-tinta/60 py-0.5 text-center text-xs text-superficie">
                              Principal
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-tinta-suave">Nenhuma foto ainda. A primeira foto adicionada será a principal.</p>
                  )}
                </div>
              )}
              {produtoExpandido === produto.id && (
                <div className="border-t border-tinta/10 px-4 pb-4 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-tinta-suave">Variações (tamanhos, sabores, etc.)</p>
                    {!mostrarFormVariacao && (
                      <button onClick={() => abrirNovaVariacao(produto.id)} className="rounded-full bg-tinta px-3 py-1 text-xs font-semibold text-superficie">
                        + Adicionar
                      </button>
                    )}
                  </div>

                  {/* Lista de variações existentes */}
                  {produto.variacoes && produto.variacoes.length > 0 ? (
                    <ul className="space-y-2">
                      {produto.variacoes.map((v) => (
                        <li key={v.id} className="flex items-center justify-between rounded-xl bg-fundo px-3 py-2">
                          <div className={!v.disponivel ? 'opacity-50' : ''}>
                            <p className="text-sm font-medium text-tinta">{v.nome}</p>
                            <p className="text-xs text-tinta-suave">
                              {v.preco_adicional > 0 ? `+R$ ${v.preco_adicional.toFixed(2).replace('.', ',')}` : 'Sem adicional'}
                              {v.estoque_atual !== null && ` · ${v.estoque_atual === 0 ? 'Esgotada' : `${v.estoque_atual} em estoque`}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => abrirEdicaoVariacao(produto.id, v)} className="text-xs font-medium text-acento hover:underline">Editar</button>
                            <button onClick={() => { if (confirm(`Excluir "${v.nome}"?`)) mutDeletarVar.mutate({ pid: produto.id, vid: v.id }); }} className="text-xs text-tinta-suave hover:text-acento">Excluir</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-tinta-suave">Nenhuma variação — produto funciona sem seleção de opção.</p>
                  )}

                  {/* Formulário de variação */}
                  {mostrarFormVariacao && produtoExpandido === produto.id && (
                    <form onSubmit={(e) => salvarVariacao(e, produto.id)} className="space-y-3 rounded-xl border border-tinta/15 p-3">
                      <p className="text-xs font-medium text-tinta">{editandoVariacaoId ? 'Editar variação' : 'Nova variação'}</p>
                      <div className="flex gap-2">
                        <Campo label="Nome (ex: M, G, Chocolate)" className="flex-1">
                          <input required value={formVariacao.nome} onChange={(e) => setFormVariacao({ ...formVariacao, nome: e.target.value })} placeholder="P / M / G" className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-1.5 text-sm text-tinta outline-none focus:border-acento" />
                        </Campo>
                        <Campo label="Preço adicional (R$)" className="w-32">
                          <input type="number" step="0.01" min="0" value={formVariacao.preco_adicional || ''} onChange={(e) => setFormVariacao({ ...formVariacao, preco_adicional: parseFloat(e.target.value) || 0 })} placeholder="0,00" className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-1.5 text-sm text-tinta outline-none focus:border-acento" />
                        </Campo>
                      </div>
                      <div className="flex gap-2">
                        <Campo label="Estoque" className="flex-1">
                          <input type="number" min="0" value={formVariacao.estoque_atual ?? ''} onChange={(e) => setFormVariacao({ ...formVariacao, estoque_atual: e.target.value === '' ? null : parseInt(e.target.value) })} placeholder="Sem limite" className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-1.5 text-sm text-tinta outline-none focus:border-acento" />
                        </Campo>
                        <Campo label="Alerta" className="flex-1">
                          <input type="number" min="0" value={formVariacao.estoque_alerta ?? ''} onChange={(e) => setFormVariacao({ ...formVariacao, estoque_alerta: e.target.value === '' ? null : parseInt(e.target.value) })} placeholder="Não avisar" className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-1.5 text-sm text-tinta outline-none focus:border-acento" />
                        </Campo>
                        <Campo label="Ordem" className="w-20">
                          <input type="number" min="0" value={formVariacao.ordem} onChange={(e) => setFormVariacao({ ...formVariacao, ordem: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-1.5 text-sm text-tinta outline-none focus:border-acento" />
                        </Campo>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-tinta">
                        <input type="checkbox" checked={formVariacao.disponivel} onChange={(e) => setFormVariacao({ ...formVariacao, disponivel: e.target.checked })} className="h-3.5 w-3.5 accent-acento" />
                        Disponível
                      </label>
                      {erroVariacao && <p className="text-xs text-acento">{erroVariacao}</p>}
                      <div className="flex gap-2">
                        <button type="button" onClick={fecharFormVariacao} className="rounded-full border border-tinta/20 px-3 py-1 text-xs font-semibold text-tinta">Cancelar</button>
                        <button type="submit" disabled={mutCriarVar.isPending || mutAtualizarVar.isPending} className="rounded-full bg-acento px-3 py-1 text-xs font-semibold text-superficie disabled:opacity-60">Salvar</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-tinta-suave">Nenhum produto cadastrado ainda.</p>
      )}
    </div>
  );
}