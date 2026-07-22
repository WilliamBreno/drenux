import type { VariacaoInput } from '../../api/admin';
import { Campo } from '../Campo';

interface Props {
  form: VariacaoInput;
  onChange: (form: VariacaoInput) => void;
}

// Campos do formulário de variação — usado na edição inline (Produtos.tsx)
// e no wizard de cadastro em massa. Não inclui a seção de fotos (só faz
// sentido depois que a variação já existe, com um variacaoId de verdade) —
// isso fica por conta de cada tela que usa este componente.
export function VariacaoFormFields({ form, onChange }: Props) {
  return (
    <>
      <Campo label="Modo de preço">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange({ ...form, modo_preco: 'aditivo' })}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${form.modo_preco === 'aditivo' ? 'border-acento bg-acento/10 text-acento' : 'border-tinta/20 text-tinta-suave hover:border-tinta/40'}`}
          >
            Acréscimo sobre o preço base
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...form, modo_preco: 'absoluto' })}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${form.modo_preco === 'absoluto' ? 'border-acento bg-acento/10 text-acento' : 'border-tinta/20 text-tinta-suave hover:border-tinta/40'}`}
          >
            Preço próprio da variação
          </button>
        </div>
      </Campo>

      <div className="flex gap-2">
        <Campo label="Nome (ex: M, G, Chocolate)" className="flex-1">
          <input required value={form.nome} onChange={(e) => onChange({ ...form, nome: e.target.value })} placeholder="P / M / G" className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-1.5 text-sm text-tinta outline-none focus:border-acento" />
        </Campo>
        <Campo label={form.modo_preco === 'absoluto' ? 'Preço (R$)' : 'Preço adicional (R$)'} className="w-32">
          <input type="number" step="0.01" min="0" value={form.preco_adicional || ''} onChange={(e) => onChange({ ...form, preco_adicional: parseFloat(e.target.value) || 0 })} placeholder="0,00" className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-1.5 text-sm text-tinta outline-none focus:border-acento" />
        </Campo>
      </div>

      <div className="flex gap-2">
        <Campo label="Estoque" className="flex-1">
          <input type="number" min="0" value={form.estoque_atual ?? ''} onChange={(e) => onChange({ ...form, estoque_atual: e.target.value === '' ? null : parseInt(e.target.value) })} placeholder="Sem limite" className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-1.5 text-sm text-tinta outline-none focus:border-acento" />
        </Campo>
        <Campo label="Alerta" className="flex-1">
          <input type="number" min="0" value={form.estoque_alerta ?? ''} onChange={(e) => onChange({ ...form, estoque_alerta: e.target.value === '' ? null : parseInt(e.target.value) })} placeholder="Não avisar" className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-1.5 text-sm text-tinta outline-none focus:border-acento" />
        </Campo>
        <Campo label="Ordem" className="w-20">
          <input type="number" min="0" value={form.ordem} onChange={(e) => onChange({ ...form, ordem: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-1.5 text-sm text-tinta outline-none focus:border-acento" />
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-xs text-tinta">
        <input type="checkbox" checked={form.disponivel} onChange={(e) => onChange({ ...form, disponivel: e.target.checked })} className="h-3.5 w-3.5 accent-acento" />
        Disponível
      </label>
      <label className="flex items-center gap-2 text-xs text-tinta">
        <input type="checkbox" checked={form.mostrar_valor_adicional} onChange={(e) => onChange({ ...form, mostrar_valor_adicional: e.target.checked })} className="h-3.5 w-3.5 accent-acento" />
        Mostrar o preço desta opção pro cliente no cardápio
      </label>
    </>
  );
}
