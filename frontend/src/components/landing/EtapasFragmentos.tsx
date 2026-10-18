import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Printer, ArrowRight, MapPin, CheckCheck } from 'lucide-react';
import { brl } from './dados';

// Fragmentos de interface das quatro etapas do pedido, montados em HTML
// com dado fictício e texto fiel ao sistema (mensagens do WhatsApp copiadas
// de backend/internal/notification/templates.go, etapas iguais às de
// Pedidos.tsx). Todos usam o tema "preto" do cardápio pra parecerem a
// mesma loja (Burger 77) do começo ao fim.

const PEDIDO = {
  id: 128,
  cliente: 'Maria',
  itens: [
    { q: 1, nome: 'Cheddar duplo', preco: 34 },
    { q: 1, nome: 'Fritas média', preco: 12 },
    { q: 1, nome: 'Refri lata', preco: 5.4 },
  ],
  frete: 5.9,
};
const SUBTOTAL = PEDIDO.itens.reduce((s, i) => s + i.q * i.preco, 0);
const TOTAL = SUBTOTAL + PEDIDO.frete;

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-ui
      className="w-full max-w-[400px] overflow-hidden rounded-[24px] bg-white font-corpo text-[#1c1c1c] ring-1 ring-black/10"
    >
      {children}
    </div>
  );
}

export function Carrinho() {
  return (
    <Moldura>
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <p className="font-display text-xl tracking-wide">Seu pedido</p>
        <span className="text-xs text-[#6b6b6b]">Burger 77</span>
      </div>
      <div className="space-y-2 px-5">
        {PEDIDO.itens.slice(0, 2).map((i) => (
          <div key={i.nome} className="flex justify-between text-sm">
            <span>
              {i.q}x {i.nome}
            </span>
            <span className="font-semibold tabular-nums">{brl(i.preco)}</span>
          </div>
        ))}
      </div>
      <div className="mx-5 mt-4 rounded-2xl bg-[#f6efe2] p-3">
        <p className="text-[11px] font-semibold text-[#8a6a3a]">Quem pediu isso também levou</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Refri lata</p>
            <p className="font-semibold tabular-nums text-xs">
              <span className="text-[#5f5f5f] line-through">R$ 6,00</span> R$ 5,40
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-[#1c1c1c] px-3 py-1 text-xs font-semibold text-white">
            <Check className="h-3 w-3" /> Adicionado
          </span>
        </div>
      </div>
      <div className="mt-4 space-y-1.5 px-5 text-sm">
        <div className="flex justify-between text-[#6b6b6b]">
          <span>Subtotal</span>
          <span className="font-semibold tabular-nums">{brl(SUBTOTAL)}</span>
        </div>
        <div className="flex justify-between text-[#6b6b6b]">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> Frete · 2,1 km
          </span>
          <span className="font-semibold tabular-nums">{brl(PEDIDO.frete)}</span>
        </div>
        <div className="flex justify-between pt-1 text-base font-semibold">
          <span>Total</span>
          <span className="font-semibold tabular-nums">{brl(TOTAL)}</span>
        </div>
      </div>
      <div className="p-5">
        <div className="rounded-full bg-[#1c1c1c] py-3 text-center text-sm font-semibold text-white">Pagar com Pix</div>
      </div>
    </Moldura>
  );
}

export function Pix() {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL('https://drenux.com.br', { margin: 0, width: 360, color: { dark: '#1c1c1c', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, []);
  return (
    <Moldura>
      <div className="px-5 pt-5 text-center">
        <p className="text-xs text-[#6b6b6b]">Pedido #{PEDIDO.id} · Burger 77</p>
        <p className="mt-1 font-semibold tabular-nums text-3xl font-semibold">{brl(TOTAL)}</p>
      </div>
      <div className="mx-auto mt-4 w-44">
        {qr ? (
          <img src={qr} alt="QR code de exemplo" width={176} height={176} className="h-44 w-44" />
        ) : (
          <div className="h-44 w-44 bg-[#eee]" />
        )}
      </div>
      <p className="mt-3 text-center text-xs text-[#6b6b6b]">Escaneie ou copie o código no app do banco</p>
      <div className="mx-5 mt-3 rounded-full py-2.5 text-center text-sm font-semibold ring-1 ring-[#1c1c1c]">
        Copiar código Pix
      </div>
      <div className="m-5 flex items-center gap-3 rounded-2xl bg-[#e3f6ec] p-3 text-[#14663d]">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14663d] text-white">
          <Check className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-semibold">Pagamento aprovado</p>
          <p className="text-xs">Pix recebido via Mercado Pago</p>
        </div>
      </div>
    </Moldura>
  );
}

const COLUNAS = [
  { nome: 'A preparar', n: 1 },
  { nome: 'Preparando', n: 2 },
  { nome: 'Saiu para entrega', n: 1 },
  { nome: 'Entregue', n: 6 },
];

export function Quadro() {
  return (
    <Moldura>
      <div className="flex items-center justify-between px-5 pb-2 pt-5">
        <p className="font-display text-xl tracking-wide">Pedidos</p>
        <div className="flex rounded-full bg-[#f0f0f0] p-0.5 text-xs">
          <span className="rounded-full px-3 py-1 text-[#6b6b6b]">Lista</span>
          <span className="rounded-full bg-white px-3 py-1 font-semibold">Quadro</span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5 px-5 pb-3 text-[10px] leading-tight text-[#6b6b6b]">
        {COLUNAS.map((c, i) => (
          <div key={c.nome} className={`rounded-lg px-2 py-1.5 ${i === 0 ? 'bg-[#1c1c1c] text-white' : 'bg-[#f3f3f3]'}`}>
            {c.nome}
            <span className="block font-semibold tabular-nums text-sm">{c.n}</span>
          </div>
        ))}
      </div>
      <div className="mx-5 rounded-2xl bg-[#f7f7f5] p-4 ring-1 ring-black/5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold">
              {PEDIDO.cliente} <span className="font-normal text-[#6b6b6b]">· #{PEDIDO.id}</span>
            </p>
            <p className="text-xs text-[#6b6b6b]">Entrega · Rua das Flores, 210</p>
          </div>
          <span className="rounded-full bg-[#e3f6ec] px-2 py-0.5 text-[11px] font-semibold text-[#14663d]">Pago · Pix</span>
        </div>
        <div className="mt-3 space-y-1 text-sm">
          {PEDIDO.itens.map((i) => (
            <p key={i.nome}>
              {i.q}x {i.nome}
              {i.nome === 'Refri lata' && (
                <span className="ml-1.5 rounded bg-[#fbf1dd] px-1.5 py-0.5 text-[10px] font-semibold text-[#8a6a3a]">Sugestão</span>
              )}
            </p>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-semibold tabular-nums text-sm font-semibold">{brl(TOTAL)}</span>
          <span className="text-xs text-[#6b6b6b]">há 2 min</span>
        </div>
        <div className="mt-3 flex gap-2">
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#1c1c1c] py-2.5 text-xs font-semibold text-white">
            Avançar <ArrowRight className="h-3.5 w-3.5" /> Preparando
          </span>
          <span className="flex items-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-semibold ring-1 ring-[#1c1c1c]">
            <Printer className="h-3.5 w-3.5" /> Comanda
          </span>
        </div>
      </div>
      <div className="h-5" />
    </Moldura>
  );
}

export function WhatsApp() {
  const msgs = [
    {
      hora: '19:42',
      texto: `Oi, Maria! Seu pedido #${PEDIDO.id} na Burger 77 foi confirmado.\n\n- 1x Cheddar duplo - R$ 34,00\n- 1x Fritas média - R$ 12,00\n- 1x Refri lata - R$ 5,40\n\nTotal: R$ 57,30`,
    },
    {
      hora: '20:05',
      texto: `Oba, Maria! Seu pedido #${PEDIDO.id} na Burger 77 saiu para entrega.\n\nAcompanhe em tempo real: drenux.com.br/burger77/pedido/${PEDIDO.id}/rastrear`,
    },
  ];
  return (
    <div data-ui className="w-full max-w-[400px] overflow-hidden rounded-[24px] bg-[#efe7dd] font-corpo ring-1 ring-black/10">
      <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0d0d0d] font-display text-sm text-[#e8b86d]">
          77
        </span>
        <div>
          <p className="text-sm font-semibold">Burger 77</p>
          <p className="text-[11px] text-white/75">online</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        {msgs.map((m) => (
          <div key={m.hora} className="max-w-[92%] rounded-xl rounded-tl-sm bg-white px-3 py-2 text-[13px] leading-snug text-[#111]">
            <p className="whitespace-pre-line">{m.texto}</p>
            <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#667781]">
              {m.hora} <CheckCheck className="h-3 w-3 text-[#53bdeb]" />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
