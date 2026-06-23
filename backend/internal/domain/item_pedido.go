package domain

// ItemPedido guarda o nome e o preço do produto no momento da compra
// (uma "foto" daquele instante) — se o dono mudar o preço ou o nome do
// produto depois, o histórico do pedido não muda. É o registro do que
// foi cobrado de verdade, não um espelho do estado atual do produto.
//
// De propósito não existe um campo Produto (struct aninhado) aqui — só
// ProdutoID como referência solta, sem chave estrangeira de verdade no
// banco. Assim, mesmo que o produto seja excluído no futuro, o pedido
// continua íntegro e legível.
type ItemPedido struct {
	ID          uint    `gorm:"primaryKey" json:"id"`
	PedidoID    uint    `gorm:"not null;index" json:"pedido_id"`
	ProdutoID   uint    `gorm:"not null" json:"produto_id"`
	ProdutoNome string  `gorm:"size:100;not null" json:"produto_nome"`
	Quantidade  int     `gorm:"not null" json:"quantidade"`
	PrecoUnit   float64 `gorm:"not null" json:"preco_unit"`

	// Variação escolhida (snapshot do momento da compra, igual ao nome
	// do produto — se a variação mudar depois, o histórico não muda).
	VariacaoID   *uint  `gorm:"default:null" json:"variacao_id"`
	VariacaoNome string `gorm:"size:50" json:"variacao_nome"`
}

func (ItemPedido) TableName() string {
	return "itens_pedido"
}