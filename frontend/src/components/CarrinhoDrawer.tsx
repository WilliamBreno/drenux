import { useState } from 'react';
import { useCartStore } from '../store/cartStore';
import { criarPedido, criarCheckout } from '../api/pedidos';
import { validarCupom } from '../api/cupons';
import { Campo } from './Campo';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  slug: string;
  modoPedido: 'imediato' | 'agendado';
  antecedenciaMinimaHoras: number;
  aceitaRetirada: boolean;
  aceitaEntrega: boolean;
  taxaEntregaTipo: string;
  taxaEntregaValor: number;
  valorMinimoPedido: number;
}

function formatarDataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarHoraLocal(data: Date): string {
  return `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
}

function dataMinima(antecedenciaHoras: number): string {
  const data = new Date();
  data.setHours(data.getHours() + antecedenciaHoras);
  return formatarDataLocal(data);
}

// Calcula a hora mínima que pode ser escolhida para uma data específica.
// Se a data escolhida for o mesmo dia do mínimo possível (agora +
// antecedência), bloqueia as horas anteriores ao mínimo. Qualquer data
// além disso libera todas as horas (00:00).
function horaMinima(dataSelecionada: string, antecedenciaHoras: number): string {
  if (!dataSelecionada) return '00:00';

  const agora = new Date();
  const minimo = new Date(agora.getTime() + antecedenciaHoras * 60 * 60 * 1000);
  const diaMinimo = formatarDataLocal(minimo);

  if (dataSelecionada === diaMinimo) {
    // Arredonda pra cima pro próximo intervalo de 15 min pra não deixar
    // uma hora "quase válida" que o backend vai rejeitar mesmo assim
    const mins = minimo.getMinutes();
    const arredondado = Math.ceil(mins / 15) * 15;
    minimo.setMinutes(arredondado, 0, 0);
    return formatarHoraLocal(minimo);
  }

  return '00:00';
}

function normalizarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, '');
  return digitos.startsWith('55') ? digitos : `55${digitos}`;
}

export function CarrinhoDrawer({ aberto, onFechar, slug, modoPedido, antecedenciaMinimaHoras, aceitaRetirada, aceitaEntrega, taxaEntregaTipo, taxaEntregaValor, valorMinimoPedido }: Props) {
  const itens = useCartStore((state) => state.itens);
  const total = useCartStore((state) => state.total());
  const alterarQuantidade = useCartStore((state) => state.alterarQuantidade);
  const remover = useCartStore((state) => state.remover);

  const [etapa, setEtapa] = useState<'carrinho' | 'dados'>('carrinho');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [modoEntrega, setModoEntrega] = useState<'retirada' | 'entrega'>(
    aceitaRetirada ? 'retirada' : 'entrega'
  );
  const [endereco, setEndereco] = useState('');
  const [cupomCodigo, setCupomCodigo] = useState('');
  const [desconto, setDesconto] = useState(0);
  const [cupomMsg, setCupomMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!aberto) return null;

  const taxaEntrega = modoEntrega === 'entrega' && taxaEntregaTipo === 'fixa' ? taxaEntregaValor : 0;
  const totalComEntrega = total + taxaEntrega - desconto;

  async function aplicarCupom() {
    if (!cupomCodigo.trim()) return;
    setValidandoCupom(true);
    setCupomMsg(null);
    try {
      const resultado = await validarCupom(slug, cupomCodigo, total);
      setDesconto(resultado.desconto);
      setCupomMsg({
        tipo: 'ok',
        texto: resultado.tipo === 'percentual'
          ? `Cupom aplicado — ${resultado.valor}% de desconto`
          : `Cupom aplicado — R$ ${resultado.desconto.toFixed(2).replace('.', ',')} de desconto`,
      });
    } catch {
      setDesconto(0);
      setCupomMsg({ tipo: 'erro', texto: 'Cupom inválido ou não aplicável.' });
    } finally {
      setValidandoCupom(false);
    }
  }

  function removerCupom() {
    setCupomCodigo('');
    setDesconto(0);
    setCupomMsg(null);
  }

  // Quando o cliente muda a data, recalcula a hora mínima e reseta o
  // campo de hora se o valor atual ficou abaixo do novo mínimo.
  function handleDataChange(novaData: string) {
    setData(novaData);
    const min = horaMinima(novaData, antecedenciaMinimaHoras);
    if (!hora || hora < min) {
      setHora(min);
    }
  }

  async function confirmarPedido() {
    if (!nome.trim() || !telefone.trim()) {
      setErro('Preenche nome e WhatsApp.');
      return;
    }
    if (modoEntrega === 'entrega' && !endereco.trim()) {
      setErro('Preenche o endereço de entrega.');
      return;
    }
    if (modoPedido === 'agendado') {
      if (!data) { setErro('Escolhe a data de retirada.'); return; }
      if (!hora) { setErro('Escolhe a hora.'); return; }
      const escolhida = new Date(`${data}T${hora}:00`);
      const minimo = new Date(Date.now() + antecedenciaMinimaHoras * 60 * 60 * 1000);
      if (escolhida < minimo) {
        const horaMin = horaMinima(data, antecedenciaMinimaHoras);
        setErro(`Horário inválido — essa loja exige pelo menos ${antecedenciaMinimaHoras}h de antecedência. Escolhe a partir das ${horaMin}.`);
        setHora(horaMin);
        return;
      }
    }

    setEnviando(true);
    setErro(null);

    try {
      const dataRetirada = modoPedido === 'agendado'
        ? new Date(`${data}T${hora}:00`).toISOString()
        : new Date().toISOString();

      const pedido = await criarPedido(slug, {
        cliente_nome: nome.trim(),
        cliente_telefone: normalizarTelefone(telefone),
        data_retirada: dataRetirada,
        modo_entrega: modoEntrega,
        endereco_entrega: modoEntrega === 'entrega' ? endereco.trim() : undefined,
        cupom_codigo: desconto > 0 ? cupomCodigo : undefined,
        itens: itens.map((item) => ({
          produto_id: item.produto.id,
          variacao_id: item.variacao?.id,
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
              {itens.map((item) => {
                const chave = item.variacao ? `${item.produto.id}-${item.variacao.id}` : `${item.produto.id}`;
                const precoUnit = item.produto.preco + (item.variacao?.preco_adicional ?? 0);
                return (
                  <li key={chave} className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-tinta">
                        {item.produto.nome}
                        {item.variacao && (
                          <span className="ml-1.5 rounded-full bg-fundo px-2 py-0.5 text-xs text-tinta-suave">
                            {item.variacao.nome}
                          </span>
                        )}
                      </p>
                      <p className="font-carimbo text-sm text-tinta-suave">
                        R$ {precoUnit.toFixed(2).replace('.', ',')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-full border border-tinta/15 px-2 py-1">
                      <button
                        onClick={() => alterarQuantidade(item.produto.id, item.quantidade - 1, item.variacao?.id)}
                        className="h-6 w-6 rounded-full text-tinta hover:bg-fundo"
                        aria-label="Diminuir quantidade"
                      >
                        −
                      </button>
                      <span className="w-5 text-center font-carimbo text-sm">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => alterarQuantidade(item.produto.id, item.quantidade + 1, item.variacao?.id)}
                        className="h-6 w-6 rounded-full text-tinta hover:bg-fundo"
                        aria-label="Aumentar quantidade"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => remover(item.produto.id, item.variacao?.id)}
                      className="text-sm text-acento/70 hover:text-acento"
                      aria-label={`Remover ${item.produto.nome}`}
                    >
                      Remover
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="space-y-4">
              {/* Seletor retirada / entrega — só aparece se a loja aceita os dois */}
              {aceitaRetirada && aceitaEntrega && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModoEntrega('retirada')}
                    className={`flex-1 rounded-full border-2 py-2 text-sm font-semibold transition ${modoEntrega === 'retirada' ? 'border-acento bg-acento text-superficie' : 'border-tinta/20 text-tinta'}`}
                  >
                    🏪 Retirada
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoEntrega('entrega')}
                    className={`flex-1 rounded-full border-2 py-2 text-sm font-semibold transition ${modoEntrega === 'entrega' ? 'border-acento bg-acento text-superficie' : 'border-tinta/20 text-tinta'}`}
                  >
                    🛵 Entrega
                  </button>
                </div>
              )}

              <Campo label="Seu nome">
                <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Maria Silva" className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento" />
              </Campo>

              <Campo label="WhatsApp">
                <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(79) 99999-9999" className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento" />
              </Campo>

              {modoEntrega === 'entrega' && (
                <Campo label="Endereço de entrega">
                  <input
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                    placeholder="Rua, número, bairro"
                    className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
                  />
                  {taxaEntregaTipo === 'combinado' && (
                    <p className="mt-1 text-xs text-tinta-suave">Taxa de entrega a combinar com a loja.</p>
                  )}
                </Campo>
              )}

              {modoPedido === 'agendado' && (
                <div className="flex gap-3">
                  <Campo label="Data de retirada" className="flex-1">
                    <input
                      type="date"
                      value={data}
                      min={dataMinima(antecedenciaMinimaHoras)}
                      onChange={(e) => handleDataChange(e.target.value)}
                      className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
                    />
                  </Campo>
                  <Campo label="Hora" className="w-28">
                    <input
                      type="time"
                      value={hora}
                      min={horaMinima(data, antecedenciaMinimaHoras)}
                      onChange={(e) => setHora(e.target.value)}
                      className="w-full rounded-lg border border-tinta/20 bg-fundo px-3 py-2 text-tinta outline-none focus:border-acento"
                    />
                  </Campo>
                </div>
              )}

              {modoPedido === 'agendado' && antecedenciaMinimaHoras > 0 && (
                <p className="text-xs text-tinta-suave">
                  Essa loja exige pelo menos {antecedenciaMinimaHoras}h de antecedência.
                </p>
              )}
              {erro && <p className="text-sm text-acento">{erro}</p>}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-tinta/10 px-6 py-4">
          <div className="space-y-1">
            {/* Campo de cupom */}
            {etapa === 'carrinho' && (
              <div className="mb-3 flex gap-2">
                <input
                  value={cupomCodigo}
                  onChange={(e) => { setCupomCodigo(e.target.value.toUpperCase()); setDesconto(0); setCupomMsg(null); }}
                  placeholder="Código do cupom"
                  className="min-w-0 flex-1 rounded-lg border border-tinta/20 bg-fundo px-3 py-2 font-carimbo text-sm tracking-widest text-tinta outline-none focus:border-acento"
                />
                {desconto > 0 ? (
                  <button onClick={removerCupom} className="rounded-lg border border-acento/30 px-3 py-2 text-xs text-acento">
                    Remover
                  </button>
                ) : (
                  <button onClick={aplicarCupom} disabled={validandoCupom || !cupomCodigo.trim()} className="rounded-lg bg-tinta px-3 py-2 text-xs font-semibold text-superficie disabled:opacity-40">
                    {validandoCupom ? '...' : 'Aplicar'}
                  </button>
                )}
              </div>
            )}
            {cupomMsg && (
              <p className={`mb-2 text-xs ${cupomMsg.tipo === 'ok' ? 'text-emerald-600' : 'text-acento'}`}>
                {cupomMsg.texto}
              </p>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-tinta-suave">Subtotal</span>
              <span className="text-tinta">R$ {total.toFixed(2).replace('.', ',')}</span>
            </div>
            {modoEntrega === 'entrega' && taxaEntregaTipo === 'fixa' && taxaEntregaValor > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-tinta-suave">Taxa de entrega</span>
                <span className="text-tinta">R$ {taxaEntregaValor.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            {modoEntrega === 'entrega' && taxaEntregaTipo === 'combinado' && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-tinta-suave">Taxa de entrega</span>
                <span className="text-tinta-suave italic">a combinar</span>
              </div>
            )}
            {desconto > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-600">Desconto ({cupomCodigo})</span>
                <span className="text-emerald-600">- R$ {desconto.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-tinta/10 pt-2">
              <span className="text-tinta-suave">Total</span>
              <span className="font-carimbo text-lg font-semibold text-tinta">
                R$ {totalComEntrega.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>

          {etapa === 'carrinho' ? (
            <>
              {valorMinimoPedido > 0 && total < valorMinimoPedido && (
                <p className="text-center text-xs text-acento">
                  Pedido mínimo de R$ {valorMinimoPedido.toFixed(2).replace('.', ',')} — faltam R$ {(valorMinimoPedido - total).toFixed(2).replace('.', ',')}
                </p>
              )}
              <button
                onClick={() => setEtapa('dados')}
                disabled={itens.length === 0 || (valorMinimoPedido > 0 && total < valorMinimoPedido)}
                className="w-full rounded-full bg-acento py-3 font-semibold text-superficie transition disabled:opacity-40"
              >
                Continuar
              </button>
            </>
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