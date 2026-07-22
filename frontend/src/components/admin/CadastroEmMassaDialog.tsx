import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  criarProduto, criarVariacao, adicionarFotoVariacao, deletarFotoVariacao,
  type ProdutoInput, type VariacaoInput,
} from '../../api/admin';
import type { Categoria, Produto, TipoProduto, VariacaoProduto } from '../../api/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { ProdutoFormFields } from './ProdutoFormFields';
import { VariacaoFormFields } from './VariacaoFormFields';
import { enviarImagem } from '../../api/upload';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categorias?: Categoria[];
  segmentoPadrao: TipoProduto;
}

function produtoVazio(categorias: Categoria[] | undefined, segmento: TipoProduto): ProdutoInput {
  return {
    nome: '', descricao: '', preco: 0, foto_url: '', disponivel: true,
    categoria_id: categorias?.[0]?.id ?? 0, estoque_atual: null, estoque_alerta: null,
    tipo_produto: segmento, peso_gramas: null,
  };
}

function variacaoVazia(segmento: TipoProduto): VariacaoInput {
  return {
    nome: '', preco_adicional: 0, disponivel: true, mostrar_valor_adicional: true,
    modo_preco: segmento === 'mercadoria' ? 'absoluto' : 'aditivo',
    estoque_atual: null, estoque_alerta: null, ordem: 0,
  };
}

// Wizard de cadastro em massa: cria um produto, deixa adicionar variações
// pra ele sem fechar, e permite emendar direto no próximo produto — pensado
// pra lojas de mercadoria com catálogos maiores, mas funciona pra qualquer
// segmento. Cada etapa é montada de novo (dialog é desmontado ao fechar, ver
// Produtos.tsx), então o estado interno nasce limpo a cada abertura.
export function CadastroEmMassaDialog({ open, onOpenChange, categorias, segmentoPadrao }: Props) {
  const queryClient = useQueryClient();
  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['produtos'] });

  const [etapa, setEtapa] = useState<'produto' | 'variacoes'>('produto');
  const [form, setForm] = useState<ProdutoInput>(() => produtoVazio(categorias, segmentoPadrao));
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [produtoCriado, setProdutoCriado] = useState<Produto | null>(null);
  const [contador, setContador] = useState(0);

  const [formVariacao, setFormVariacao] = useState<VariacaoInput>(() => variacaoVazia(segmentoPadrao));
  const [mostrarFormVariacao, setMostrarFormVariacao] = useState(false);
  const [erroVariacao, setErroVariacao] = useState<string | null>(null);
  const [enviandoFotoVariacao, setEnviandoFotoVariacao] = useState(false);

  const mutCriarProduto = useMutation({
    mutationFn: criarProduto,
    onSuccess: (produto) => {
      invalidar();
      setProdutoCriado(produto);
      setContador((c) => c + 1);
      setEtapa('variacoes');
    },
    onError: () => setErro('Não foi possível salvar o produto.'),
  });

  const mutCriarVariacao = useMutation({
    mutationFn: ({ pid, input }: { pid: number; input: VariacaoInput }) => criarVariacao(pid, input),
    onSuccess: (variacao) => {
      setProdutoCriado((atual) => atual ? { ...atual, variacoes: [...(atual.variacoes ?? []), variacao] } : atual);
      setFormVariacao(variacaoVazia(segmentoPadrao));
      setMostrarFormVariacao(false);
      invalidar();
    },
    onError: () => setErroVariacao('Não foi possível salvar a variação.'),
  });

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

  function salvarProduto(e: FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || form.preco <= 0 || !form.categoria_id) { setErro('Preenche nome, preço e categoria.'); return; }
    if (form.tipo_produto === 'mercadoria' && (!form.peso_gramas || form.peso_gramas <= 0)) { setErro('Produtos do tipo Mercadoria precisam de um peso (em gramas).'); return; }
    setErro(null);
    mutCriarProduto.mutate(form);
  }

  function salvarVariacao(e: FormEvent) {
    e.preventDefault();
    if (!produtoCriado) return;
    if (!formVariacao.nome.trim()) { setErroVariacao('Digita um nome.'); return; }
    setErroVariacao(null);
    mutCriarVariacao.mutate({ pid: produtoCriado.id, input: formVariacao });
  }

  async function adicionarFotoDaVariacao(variacao: VariacaoProduto, e: ChangeEvent<HTMLInputElement>) {
    if (!produtoCriado) return;
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoFotoVariacao(true);
    try {
      const url = await enviarImagem(arquivo);
      const ordem = variacao.fotos?.length ?? 0;
      const foto = await adicionarFotoVariacao(produtoCriado.id, variacao.id, url, ordem);
      setProdutoCriado((atual) => atual ? {
        ...atual,
        variacoes: atual.variacoes?.map((v) => v.id === variacao.id ? { ...v, fotos: [...(v.fotos ?? []), foto] } : v),
      } : atual);
      invalidar();
    } finally {
      setEnviandoFotoVariacao(false);
    }
  }

  async function removerFotoDaVariacao(variacaoId: number, fotoId: number) {
    if (!produtoCriado) return;
    await deletarFotoVariacao(produtoCriado.id, variacaoId, fotoId);
    setProdutoCriado((atual) => atual ? {
      ...atual,
      variacoes: atual.variacoes?.map((v) => v.id === variacaoId ? { ...v, fotos: v.fotos?.filter((f) => f.id !== fotoId) } : v),
    } : atual);
    invalidar();
  }

  function proximoProduto() {
    setForm(produtoVazio(categorias, segmentoPadrao));
    setProdutoCriado(null);
    setErro(null);
    setMostrarFormVariacao(false);
    setEtapa('produto');
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onOpenChange(false); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Cadastro em massa{contador > 0 && ` · ${contador} produto${contador > 1 ? 's' : ''} adicionado${contador > 1 ? 's' : ''}`}
          </DialogTitle>
          <DialogDescription>
            {etapa === 'produto'
              ? 'Preenche os dados do produto. Depois de salvar dá pra adicionar variações antes de ir pro próximo.'
              : `Adicione variações de "${produtoCriado?.nome}" (opcional) ou siga pro próximo produto.`}
          </DialogDescription>
        </DialogHeader>

        {etapa === 'produto' ? (
          <form onSubmit={salvarProduto} className="space-y-4">
            <ProdutoFormFields form={form} onChange={setForm} categorias={categorias} enviandoFoto={enviandoFoto} onSelecionarFoto={selecionarFoto} />
            {erro && <p className="text-sm text-acento">{erro}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={mutCriarProduto.isPending}>
                {mutCriarProduto.isPending ? 'Salvando...' : 'Salvar e continuar'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            {produtoCriado?.variacoes && produtoCriado.variacoes.length > 0 && (
              <ul className="space-y-2">
                {produtoCriado.variacoes.map((v) => (
                  <li key={v.id} className="space-y-2 rounded-xl bg-fundo px-3 py-2">
                    <p className="text-sm">
                      <span className="font-medium text-tinta">{v.nome}</span>{' '}
                      <span className="text-tinta-suave">
                        {v.modo_preco === 'absoluto'
                          ? `R$ ${v.preco_adicional.toFixed(2).replace('.', ',')} (preço próprio)`
                          : v.preco_adicional > 0 ? `+R$ ${v.preco_adicional.toFixed(2).replace('.', ',')}` : 'sem adicional'}
                      </span>
                    </p>
                    {v.modo_preco === 'absoluto' && (
                      <div className="flex flex-wrap items-center gap-2">
                        {v.fotos?.map((foto) => (
                          <div key={foto.id} className="relative group">
                            <img src={foto.url} alt={v.nome} className="h-12 w-12 rounded-lg object-cover" />
                            <button
                              type="button"
                              onClick={() => removerFotoDaVariacao(v.id, foto.id)}
                              className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-acento text-xs text-superficie group-hover:flex"
                            >×</button>
                          </div>
                        ))}
                        <label className="cursor-pointer rounded-full border border-tinta/20 px-2.5 py-1 text-xs font-medium text-tinta-suave hover:border-acento">
                          {enviandoFotoVariacao ? 'Enviando...' : '+ Foto'}
                          <input type="file" accept="image/*" className="hidden" disabled={enviandoFotoVariacao}
                            onChange={(e) => adicionarFotoDaVariacao(v, e)} />
                        </label>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {mostrarFormVariacao ? (
              <form onSubmit={salvarVariacao} className="space-y-3 rounded-xl border border-tinta/15 p-3">
                <VariacaoFormFields form={formVariacao} onChange={setFormVariacao} />
                {erroVariacao && <p className="text-xs text-acento">{erroVariacao}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setMostrarFormVariacao(false)}>Cancelar</Button>
                  <Button type="submit" size="sm" disabled={mutCriarVariacao.isPending}>
                    {mutCriarVariacao.isPending ? 'Salvando...' : 'Adicionar variação'}
                  </Button>
                </div>
              </form>
            ) : (
              <Button type="button" variant="outline" onClick={() => { setFormVariacao(variacaoVazia(segmentoPadrao)); setMostrarFormVariacao(true); }}>
                + Adicionar variação
              </Button>
            )}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={proximoProduto}>+ Adicionar outro produto</Button>
              <Button type="button" onClick={() => onOpenChange(false)}>Concluir</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
