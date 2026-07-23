package domain

import "time"

// Produto representa um item do cardápio de uma loja.
//
// LojaID está duplicado aqui mesmo já existindo via Categoria — é
// proposital: assim toda checagem de "esse produto é desse dono?" vira um
// WHERE loja_id = ? direto, sem precisar de join com Categoria toda vez.
type Produto struct {
	ID          uint          `gorm:"primaryKey" json:"id"`
	LojaID      uint          `gorm:"not null;index" json:"loja_id"`
	CategoriaID uint          `gorm:"not null" json:"categoria_id"`
	Categoria   Categoria     `gorm:"foreignKey:CategoriaID" json:"categoria,omitempty"`

	// SubcategoriaID/GrupoCorID são exclusivos do segmento "mercadoria" —
	// drill-down opcional Categoria → Subcategoria → Grupo de Cor usado
	// pra organizar catálogo de varejo (tamanho, cor). Nunca usados por
	// lojas "alimenticio". GrupoCorID só faz sentido quando SubcategoriaID
	// também está preenchido (grupo de cor é sempre aninhado numa
	// subcategoria, nunca solto).
	SubcategoriaID *uint         `gorm:"index" json:"subcategoria_id"`
	Subcategoria   *Subcategoria `gorm:"foreignKey:SubcategoriaID" json:"subcategoria,omitempty"`
	GrupoCorID     *uint         `gorm:"index" json:"grupo_cor_id"`
	GrupoCor       *GrupoCor     `gorm:"foreignKey:GrupoCorID" json:"grupo_cor,omitempty"`

	Nome        string        `gorm:"size:100;not null" json:"nome"`
	Descricao   string        `gorm:"type:text" json:"descricao"`
	Preco       float64       `gorm:"not null" json:"preco"`
	FotoURL     string        `gorm:"size:255" json:"foto_url"` // mantido pra compatibilidade
	Fotos       []FotoProduto `gorm:"foreignKey:ProdutoID;constraint:OnDelete:CASCADE" json:"fotos,omitempty"`
	Disponivel  bool          `gorm:"default:true" json:"disponivel"`

	// Variações (ex: tamanhos, sabores). Quando vazio, o produto não tem
	// opções — funciona igual ao comportamento anterior.
	Variacoes []VariacaoProduto `gorm:"foreignKey:ProdutoID;constraint:OnDelete:CASCADE" json:"variacoes,omitempty"`

	// Controle de estoque geral — nil = sem controle (ilimitado).
	// Se o produto tem variações com EstoqueAtual próprio, esses têm
	// precedência e este campo é ignorado pra cada variação específica.
	EstoqueAtual  *int `gorm:"default:null" json:"estoque_atual"`
	EstoqueAlerta *int `gorm:"default:null" json:"estoque_alerta"`

	// TipoProduto distingue itens perecíveis (comida) de mercadoria em
	// geral (roupas, artesanato etc.) — só "mercadoria" pode ser usado
	// no fluxo de "guardar e entregar depois", já que reter comida por
	// tempo indeterminado é um risco de segurança alimentar.
	TipoProduto TipoProduto `gorm:"size:20;default:'alimenticio'" json:"tipo_produto"`

	// PesoGramas é obrigatório quando TipoProduto == mercadoria — usado
	// pra estimar o frete quando o destino fica fora da região da loja.
	// nil pra produtos alimentícios (não se aplica).
	PesoGramas *int `gorm:"default:null" json:"peso_gramas"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type TipoProduto string

const (
	TipoProdutoAlimenticio TipoProduto = "alimenticio"
	TipoProdutoMercadoria  TipoProduto = "mercadoria"
)

func (Produto) TableName() string {
	return "produtos"
}
