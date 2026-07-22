package domain

// VariacaoProduto representa uma opção de um produto (ex: "P", "M", "G",
// "Chocolate", "Com queijo"). Cada variação tem seu próprio estoque e pode
// ter um preço adicional sobre o preço base do produto.
//
// Quando um produto não tem variações, o comportamento é exatamente igual
// ao que já existe — nada muda no fluxo de pedido. Quando tem variações, o
// cliente precisa escolher uma antes de adicionar ao carrinho, e o preço
// final é produto.Preco + variacao.PrecoAdicional.
type VariacaoProduto struct {
	ID             uint    `gorm:"primaryKey" json:"id"`
	ProdutoID      uint    `gorm:"not null;index" json:"produto_id"`
	Nome           string  `gorm:"size:50;not null" json:"nome"`
	PrecoAdicional float64 `gorm:"default:0" json:"preco_adicional"`
	Disponivel     bool    `gorm:"default:true" json:"disponivel"`

	// MostrarValorAdicional decide se o preço de PrecoAdicional aparece pro
	// cliente no cardápio público (ex: "+R$5,00" no botão da variação) ou
	// fica escondido — o preço final continua sendo cobrado normalmente,
	// só a exibição por opção é que some.
	MostrarValorAdicional bool `gorm:"default:true" json:"mostrar_valor_adicional"`

	// ModoPreco decide como PrecoAdicional é interpretado: "aditivo" (soma
	// ao preço base do produto — comportamento original) ou "absoluto"
	// (é o preço final da variação, ignora o preço base do produto).
	// Pensado pro segmento "mercadoria", onde cada variação pode ter preço
	// próprio (ex: modelos diferentes de um mesmo tênis).
	ModoPreco ModoPrecoVariacao `gorm:"size:20;default:'aditivo'" json:"modo_preco"`

	// Fotos próprias da variação — só faz sentido no modo "absoluto"
	// (cada modelo/opção com sua própria imagem).
	Fotos []FotoVariacao `gorm:"foreignKey:VariacaoID;constraint:OnDelete:CASCADE" json:"fotos,omitempty"`

	// Estoque próprio da variação — nil = sem controle (herda do produto).
	// Quando preenchido, tem precedência sobre o estoque geral do produto.
	EstoqueAtual  *int `gorm:"default:null" json:"estoque_atual"`
	EstoqueAlerta *int `gorm:"default:null" json:"estoque_alerta"`

	// Ordem de exibição no cardápio — deixa o dono controlar a sequência
	// sem depender da ordem de inserção no banco.
	Ordem int `gorm:"default:0" json:"ordem"`
}

type ModoPrecoVariacao string

const (
	ModoPrecoAditivo  ModoPrecoVariacao = "aditivo"
	ModoPrecoAbsoluto ModoPrecoVariacao = "absoluto"
)

func (VariacaoProduto) TableName() string {
	return "variacoes_produto"
}
