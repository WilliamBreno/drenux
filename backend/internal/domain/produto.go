package domain

import "time"

// Produto representa um item do cardápio de uma loja.
//
// LojaID está duplicado aqui mesmo já existindo via Categoria — é
// proposital: assim toda checagem de "esse produto é desse dono?" vira um
// WHERE loja_id = ? direto, sem precisar de join com Categoria toda vez.
type Produto struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	LojaID      uint      `gorm:"not null;index" json:"loja_id"`
	CategoriaID uint      `gorm:"not null" json:"categoria_id"`
	Categoria   Categoria `gorm:"foreignKey:CategoriaID" json:"categoria,omitempty"`
	Nome        string    `gorm:"size:100;not null" json:"nome"`
	Descricao   string    `gorm:"type:text" json:"descricao"`
	Preco       float64   `gorm:"not null" json:"preco"`
	FotoURL     string    `gorm:"size:255" json:"foto_url"`
	Disponivel  bool      `gorm:"default:true" json:"disponivel"`

	// Variações (ex: tamanhos, sabores). Quando vazio, o produto não tem
	// opções — funciona igual ao comportamento anterior.
	Variacoes []VariacaoProduto `gorm:"foreignKey:ProdutoID;constraint:OnDelete:CASCADE" json:"variacoes,omitempty"`

	// Controle de estoque geral — nil = sem controle (ilimitado).
	// Se o produto tem variações com EstoqueAtual próprio, esses têm
	// precedência e este campo é ignorado pra cada variação específica.
	EstoqueAtual  *int `gorm:"default:null" json:"estoque_atual"`
	EstoqueAlerta *int `gorm:"default:null" json:"estoque_alerta"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Produto) TableName() string {
	return "produtos"
}