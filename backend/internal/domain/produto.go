package domain

import "time"

// Produto representa um item do cardápio de uma loja.
//
// LojaID está duplicado aqui mesmo já existindo via Categoria — é
// proposital: assim toda checagem de "esse produto é desse dono?" vira um
// WHERE loja_id = ? direto, sem precisar de join com Categoria toda vez.
// Em sistema multi-tenant, simplicidade na checagem de dono é mais
// importante que evitar essa pequena duplicação.
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
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (Produto) TableName() string {
	return "produtos"
}