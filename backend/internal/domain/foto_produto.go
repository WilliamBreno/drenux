package domain

// FotoProduto representa uma das fotos de um produto.
// O produto pode ter quantas fotos quiser. A primeira (menor Ordem)
// é exibida como foto principal no cardápio — as demais formam a galeria.
type FotoProduto struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	ProdutoID uint   `gorm:"not null;index" json:"produto_id"`
	URL       string `gorm:"size:255;not null" json:"url"`
	Ordem     int    `gorm:"default:0" json:"ordem"`
}

func (FotoProduto) TableName() string { return "fotos_produto" }
