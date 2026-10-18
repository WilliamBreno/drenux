// Conteúdo da landing comercial. As lojas de exemplo são FICTÍCIAS (nome,
// produto e preço inventados pra mostrar o cardápio cheio) — as fotos são
// de acervo aberto com licença comercial, creditadas no rodapé
// (CREDITOS_FOTOS). Nenhuma delas é de cliente real do Drenux.

export interface ItemExemplo {
  nome: string;
  desc: string;
  preco: number;
  foto?: string;
}

export interface LojaExemplo {
  tema: string;
  nome: string;
  banner: string;
  categorias: string[];
  itens: ItemExemplo[];
}

export const LOJAS_EXEMPLO: LojaExemplo[] = [
  {
    tema: 'oceano',
    nome: 'Açaí da Orla',
    banner: '/landing/acai.jpg',
    categorias: ['Açaí', 'Adicionais', 'Sucos'],
    itens: [
      { nome: 'Açaí 500 ml', desc: 'Morango, mirtilo, coco em lascas e granola', preco: 24, foto: '/landing/acai.jpg' },
      { nome: 'Açaí 300 ml', desc: 'Escolha até 3 adicionais', preco: 17 },
    ],
  },
  {
    tema: 'rosa',
    nome: 'Ateliê do Brigadeiro',
    banner: '/landing/brigadeiro.jpg',
    categorias: ['Brigadeiros', 'Bolos', 'Presentes'],
    itens: [
      { nome: 'Caixa com 12 brigadeiros', desc: 'Tradicional de chocolate belga', preco: 42, foto: '/landing/brigadeiro.jpg' },
      { nome: 'Fatia de bolo de chocolate', desc: 'Com nozes e calda da casa', preco: 15, foto: '/landing/bolo.webp' },
    ],
  },
  {
    tema: 'brasa',
    nome: 'Espeto do Zé',
    banner: '/landing/churrasco.jpg',
    categorias: ['Espetos', 'Porções', 'Cervejas'],
    itens: [
      { nome: 'Picanha na chapa 400 g', desc: 'Com farofa, vinagrete e pão de alho', preco: 69, foto: '/landing/picanha.webp' },
      { nome: 'Espetinho misto', desc: 'Carne, linguiça e frango', preco: 12, foto: '/landing/churrasco.jpg' },
    ],
  },
  {
    tema: 'carvao',
    nome: 'Burger 77',
    banner: '/landing/burger-fritas.jpg',
    categorias: ['Burgers', 'Combos', 'Bebidas'],
    itens: [
      { nome: 'Cheddar duplo', desc: 'Dois blends de 90g, cheddar, alface e tomate', preco: 34, foto: '/landing/burger.jpg' },
      { nome: 'Combo burger + fritas', desc: 'Cheddar duplo, fritas média e refri lata', preco: 46, foto: '/landing/burger-fritas.jpg' },
    ],
  },
  {
    tema: 'terracota',
    nome: 'Forno da Vila',
    banner: '/landing/pizza.jpg',
    categorias: ['Pizzas', 'Calzones', 'Vinhos'],
    itens: [
      { nome: 'Margherita grande', desc: 'Molho de tomate, muçarela de búfala e manjericão', preco: 58, foto: '/landing/pizza.jpg' },
      { nome: 'Calabresa grande', desc: 'Calabresa artesanal e cebola roxa', preco: 54 },
    ],
  },
  {
    tema: 'kraft',
    nome: 'Salgados da Dona Ana',
    banner: '/landing/coxinha.jpg',
    categorias: ['Salgados', 'Cento', 'Bebidas'],
    itens: [
      { nome: 'Coxinha de frango', desc: 'Massa de batata, frango desfiado temperado', preco: 7, foto: '/landing/coxinha.jpg' },
      { nome: 'Pão de queijo (6 un.)', desc: 'Queijo canastra, assado na hora', preco: 12, foto: '/landing/pao-de-queijo.jpg' },
    ],
  },
  {
    tema: 'floresta',
    nome: 'Verde Bowl',
    banner: '/landing/salada.jpg',
    categorias: ['Bowls', 'Sucos', 'Sobremesas'],
    itens: [
      { nome: 'Bowl de legumes assados', desc: 'Grão-de-bico, abóbora, folhas e tahine', preco: 32, foto: '/landing/salada.jpg' },
      { nome: 'Suco verde 400 ml', desc: 'Couve, limão, gengibre e maçã', preco: 11 },
    ],
  },
];

export const VANTAGENS = [
  {
    frase: 'O cliente é seu',
    fundo: 'var(--l-rosa)',
    tinta: 'var(--l-papel)',
    foto: { src: '/landing/balcao.jpg', alt: 'Balcão de lanchonete com banquinhos e clientes', w: 900, h: 1200 },
    texto:
      'Aplicativo de delivery cobra de 12% a 27% por pedido e fica com o contato de quem compra. Aqui o link é seu, e o telefone do cliente fica no seu painel.',
    fatos: ['Link próprio: drenux.com.br/sualoja', 'QR code pronto pra mesa e balcão', 'Histórico de pedidos de cada cliente'],
  },
  {
    frase: 'Pix na sua conta',
    fundo: 'var(--l-marinho-claro)',
    tinta: 'var(--l-tinta)',
    foto: { src: '/landing/coxinha.jpg', alt: 'Coxinha de frango cortada ao meio num prato', w: 1000, h: 1333 },
    texto:
      'O pagamento cai direto na sua conta do Mercado Pago. Sem maquininha e sem conferir comprovante no WhatsApp: o pedido muda pra pago sozinho.',
    fatos: ['Pix e cartão pelo Mercado Pago', 'Pedido confirmado automaticamente', 'A partir do Basic, sem mensalidade'],
  },
  {
    frase: 'O carrinho vende junto',
    fundo: 'var(--l-floresta)',
    tinta: 'var(--l-papel)',
    foto: { src: '/landing/burger-fritas.jpg', alt: 'Cheeseburger com batata frita num prato', w: 1000, h: 689 },
    texto:
      'Combos, cupons e sugestão no carrinho aumentam o valor de cada pedido sem você precisar oferecer nada a ninguém.',
    fatos: ['"Quem pediu isso também levou", com desconto', 'Combos com escolha por item', 'Cupom de primeira compra'],
  },
  {
    frase: 'Não é só comida',
    fundo: 'var(--l-vinho-claro)',
    tinta: 'var(--l-tinta)',
    foto: { src: '/landing/arara.webp', alt: 'Arara com blusas penduradas em cabides de madeira', w: 1024, h: 683 },
    texto:
      'Vende roupa, calçado ou artesanato? A loja vira catálogo em grade, com filtro por categoria, tamanho e cor.',
    fatos: ['Catálogo em grade estilo loja online', 'Filtro por tamanho e grupo de cor', 'Cadastro de produtos em sequência'],
  },
];

export const PERGUNTAS = [
  {
    p: 'Qual a diferença pra um app de delivery?',
    r: 'No app de delivery, a loja aparece numa vitrine junto com a concorrência e paga comissão alta por pedido. No Drenux, o cardápio é seu, o cliente chega pelo seu link, QR code ou Instagram, e você paga no máximo 2,4% (ou nada, no Start).',
  },
  {
    p: 'É grátis mesmo pra começar?',
    r: 'Sim. O Start não tem mensalidade nem taxa: até 30 produtos e 30 pedidos por mês, renovando todo mês. O cliente paga direto na sua chave Pix. Quando passar disso, o Basic também não tem mensalidade.',
  },
  {
    p: 'Como a taxa é cobrada?',
    r: 'Nos planos com Pix automático, a taxa sai sozinha de cada pedido pago, no próprio Mercado Pago. A mensalidade do Pro e do Scale é cobrada uma vez por mês no cartão.',
  },
  {
    p: 'Preciso de conta no Mercado Pago?',
    r: 'Só pra receber Pix e cartão automático (Basic, Pro e Scale). A conexão é feita pelo painel em poucos cliques e o dinheiro cai na sua conta, não na nossa.',
  },
  {
    p: 'Como funciona o frete?',
    r: 'O cliente digita o endereço e o frete sai calculado pela distância até a sua loja. Também dá pra oferecer retirada no balcão.',
  },
  {
    p: 'Posso trocar de plano depois?',
    r: 'A qualquer momento, direto no painel, sem multa e sem fidelidade. Subir de plano vale na hora; descer vale a partir da próxima renovação.',
  },
  {
    p: 'Dá pra imprimir a comanda?',
    r: 'Sim, numa impressora térmica Bluetooth, direto do navegador no computador ou celular Android. No iPhone o navegador não permite Bluetooth.',
  },
  {
    p: 'Tem programa de indicação?',
    r: 'Tem. Afiliados recebem uma parte do que a Drenux ganha com cada loja indicada, todo mês, mais um bônus quando a loja engrena.',
  },
];

export const CREDITOS_FOTOS = [
  { titulo: 'Açaí bowl 1', autor: 'FASTILY', licenca: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/w/index.php?curid=70657556' },
  { titulo: 'Brigadeiro', autor: 'Mayra (Maych)', licenca: 'CC BY-SA 2.0', url: 'https://commons.wikimedia.org/w/index.php?curid=1682526' },
  { titulo: 'Chocolate Cake Slice', autor: 'rawpixel', licenca: 'CC0', url: 'https://www.rawpixel.com/image/5926110/photo-image-public-domain-food-chocolate' },
  { titulo: 'Churrasco carioca', autor: "Leonardo 'Leguas' Carvalho", licenca: 'CC BY-SA 2.5', url: 'https://commons.wikimedia.org/w/index.php?curid=981153' },
  { titulo: 'Picanha magra', autor: 'rawpixel', licenca: 'CC0', url: 'https://www.rawpixel.com/image/5919181/image-public-domain-food-free' },
  { titulo: 'Margherita D.O.C.', autor: 'marktristan', licenca: 'CC BY-SA 2.0', url: 'https://www.flickr.com/photos/63377549@N00/14807710296' },
  { titulo: 'Cheeseburger with fries', autor: 'Mark Miller', licenca: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/w/index.php?curid=82000109' },
  { titulo: 'Steamed cheeseburger', autor: 'Connie Ma', licenca: 'CC BY-SA 2.0', url: 'https://commons.wikimedia.org/w/index.php?curid=58337166' },
  { titulo: 'Coxinha, iguaria brasileira', autor: 'Sintegrity', licenca: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/w/index.php?curid=129908012' },
  { titulo: 'Pão de queijo', autor: 'Samory Santos', licenca: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/w/index.php?curid=1813092' },
  { titulo: 'Balcão, coifa e banquinhos', autor: 'Wagner Tamanaha', licenca: 'CC BY-SA 2.0', url: 'https://commons.wikimedia.org/wiki/File:Balc%C3%A3o,_coifa_e_banquinhos_(20883632295).jpg' },
  { titulo: 'Minimal clothes rack', autor: 'rawpixel', licenca: 'CC0', url: 'https://www.rawpixel.com/image/3283850/free-photo-image-clothes-closet-dressing-room' },
  { titulo: 'Veggie salad bowl', autor: 'Ella Olsson', licenca: 'CC BY 2.0', url: 'https://commons.wikimedia.org/w/index.php?curid=83080959' },
];

export function brl(v: number, casas = 2) {
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}
