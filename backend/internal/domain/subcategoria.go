package domain

import "time"

// Subcategoria é um recorte opcional dentro de uma Categoria, pensado pro
// segmento "mercadoria" (ex: tamanho "40", "41", "42" dentro da categoria
// "Tênis"). Não tem relação com VariacaoProduto (que é aditiva sobre o
// preço, recurso de cardápio) — Subcategoria é um nível de organização do
// catálogo. Uma categoria pode não ter nenhuma subcategoria: cadastro
// simples de produto continua funcionando sem essa camada.
type Subcategoria struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	CategoriaID uint      `gorm:"not null;index:idx_subcategoria_categoria_nome,unique" json:"categoria_id"`
	Nome        string    `gorm:"size:50;not null;index:idx_subcategoria_categoria_nome,unique" json:"nome"`
	Ordem       int       `gorm:"default:0" json:"ordem"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (Subcategoria) TableName() string {
	return "subcategorias"
}
