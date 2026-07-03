package domain

import "time"

// Categoria representa as abas do cardápio (ex: "Salgados", "Doces") de
// uma loja específica. O nome só precisa ser único dentro da mesma loja —
// duas lojas diferentes podem ter cada uma a sua "Salgados".
type Categoria struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	LojaID    uint      `gorm:"not null;index:idx_categoria_loja_nome,unique" json:"loja_id"`
	Nome      string    `gorm:"size:50;not null;index:idx_categoria_loja_nome,unique" json:"nome"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Categoria) TableName() string {
	return "categorias"
}
