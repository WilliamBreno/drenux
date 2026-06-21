import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { criarPedido, criarCheckout } from '../api/pedidos';
import { Campo } from './Campo';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  slug: string;
  permiteMesmoDia: boolean;
}

function formatarDataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function dataMinima(permiteMesmoDia: boolean): string {
  const data = new Date();
  if (!permiteMesmoDia) data.setDate(data.getDate() + 1);
  return formatarDataLocal(data);
}

// O cliente só digita DDD + número — o "55" na frente é adicionado aqui
// automaticamente, pra não depender dele lembrar (já vimos como esse
// detalhe é fácil de esquecer e quebrar o envio do WhatsApp).
function normalizarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, '');
  return digitos.startsWith('55') ? digitos : `55${digitos}`;
}

export function CarrinhoDrawer({ aberto, onFechar, slug, permiteMesmoDia }: Props) {
  const itens = useCartStore((state) => state.itens);
  const total = useCartStore((state) => state.total());
  const alterarQuantidade = useCartStore((state) => state.alterarQuantidade);
  const remover = useCartStore((state) => state.remover);

  const [etapa, setEtapa] = useState<'carrinho' | 'dados'>('carrinho');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('12:00');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

  async function confirmarPedido() {
    if (!nome.trim() || !telefone.trim() || !data) {
      setErro('Preenche nome, WhatsApp e data de retirada.');
      return;
    }

    setEnviando(true);
    setErro(null);

    try {
      const dataRetirada = new Date(`${data}T${hora}:00`).toISOString();

      const pedido = await criarPedido(slug, {
        cliente_nome: nome.trim(),
        cliente_telefone: normalizarTelefone(telefone),
        data_retirada: dataRetirada,
        itens: itens.map((item) => ({
          produto_id: item.produto.id,
          quantidade: item.quantidade,
        })),
      });

      const { url } = await criarCheckout(pedido.id);
      window.location.href = url;
    } catch {
      setErro('Não foi possível confirmar o pedido. Confere os dados e tenta de novo.');
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center sm:items-center">
      <button
        aria-label="Fechar carrinho"
        onClick={onFechar}
        className="absolute inset-0 bg-tinta/50"
      />

      <div className="relative flex max-h-[85vh] w-full flex-col rounded-t-3xl bg-superficie sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-tinta/10 px-6 py-4">
          <h2 className="font-display text-xl tracking-wide text-tinta">
            {etapa === 'carrinho' ? 'Seu pedido' : 'Dados pra retirada'}
          </h2>
          <button
            onClick={onFechar}
            className="text-xl leading-none text-tinta-suave hover:text-tinta"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {etapa === 'carrinho' ? (
            <ul className="space-y-4">
              {itens.map((item) => (
                <li key={item.produto.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-tinta">{item.produto.nome}</p>
                    <p className="font-carimbo text-sm text-tinta-suave">
                      R$ {item.produto.preco.toFixed(2).replace('.', ',')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 rounded-full border border-tinta/15 px-2 py-1">
                    <button
                      onClick={() => alterarQuantidade(item.produto.id, item.quantidade - 1)}
                      className="h-6 w-6 rounded-full text-tinta hover:bg-fundo"
                      aria-label="Diminuir quantidade"
                    >
                      −
                    </button>
                    <span className="w-5 text-center font-carimbo text-sm">
                      {item.quantidade}
                    </span>
                    <button
                      onClick={() => alterarQuantidade(item.produto.id, item.quantidade + 1)}
                      className="h-6 w-6 rounded-full text-tinta hover:bg-fundo"
                      aria-label="Aumentar quantidade"
                    >
                      +
                    </button>
                  </div>

                  <button
                    onClick={() => remover(item.produto.id)}
                    className="text-sm text-acento/70 hover:text-acento"
                    aria-label={`Remover ${item.produto.nome}`}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-4">
              <Campo label="Seu nome">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Maria Silva"
                  className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
                />
              </Campo>

              <Campo label="WhatsApp">
                <input
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(79) 99999-9999"
                  className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
                />
              </Campo>

              <div className="flex gap-3">
                <Campo label="Data de retirada" className="flex-1">
                  <input
                    type="date"
                    value={data}
                    min={dataMinima(permiteMesmoDia)}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
                  />
                </Campo>

                <Campo label="Hora" className="w-28">
                  <input
                    type="time"
                    value={hora}
                    onChange={(e) => setHora(e.target.value)}
                    className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
                  />
                </Campo>
              </div>

              {!permiteMesmoDia && (
                <p className="text-xs text-tinta-suave">
                  Essa loja não aceita retirada no mesmo dia — a data mais próxima é amanhã.
                </p>
              )}

              {erro && <p className="text-sm text-acento">{erro}</p>}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-tinta/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-tinta-suave">Total</span>
            <span className="font-carimbo text-lg font-semibold text-tinta">
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </div>

          {etapa === 'carrinho' ? (
            <button
              onClick={() => setEtapa('dados')}
              disabled={itens.length === 0}
              className="w-full rounded-full bg-acento py-3 font-semibold text-superficie transition disabled:opacity-40"
            >
              Continuar
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setEtapa('carrinho')}
                className="rounded-full border border-tinta/20 px-4 py-3 font-semibold text-tinta"
              >
                Voltar
              </button>
              <button
                onClick={confirmarPedido}
                disabled={enviando}
                className="flex-1 rounded-full bg-acento py-3 font-semibold text-superficie transition disabled:opacity-60"
              >
                {enviando ? 'Confirmando...' : 'Confirmar e pagar'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}