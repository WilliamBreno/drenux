package domain

import "time"

// GrupoCor é um recorte opcional sempre aninhado dentro de uma
// Subcategoria (ex: "Tons escuros", "Branco" dentro do tamanho "42") —
// não existe solto direto numa Categoria. Uma combinação
// Subcategoria+GrupoCor pode conter vários produtos diferentes (não é uma
// relação 1:1 produto↔combinação).
type GrupoCor struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	SubcategoriaID uint      `gorm:"not null;index:idx_grupocor_subcategoria_nome,unique" json:"subcategoria_id"`
	Nome           string    `gorm:"size:50;not null;index:idx_grupocor_subcategoria_nome,unique" json:"nome"`
	Ordem          int       `gorm:"default:0" json:"ordem"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (GrupoCor) TableName() string {
	return "grupos_cor"
}
