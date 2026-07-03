package domain

import "time"

type TipoCupom string

const (
	TipoCupomPercentual TipoCupom = "percentual" // desconto em %
	TipoCupomFixo       TipoCupom = "fixo"       // desconto em R$
)

// Cupom representa um código promocional criado pelo dono da loja.
// Cada loja tem seus próprios cupons — nunca compartilhados entre lojas.
type Cupom struct {
	ID     uint   `gorm:"primaryKey" json:"id"`
	LojaID uint   `gorm:"not null;index" json:"loja_id"`
	Codigo string `gorm:"size:30;not null" json:"codigo"` // sempre uppercase

	// Tipo e valor do desconto
	Tipo  TipoCupom `gorm:"size:20;not null" json:"tipo"`
	Valor float64   `gorm:"not null" json:"valor"` // 10 = 10% ou R$10,00

	Ativo bool `gorm:"default:true" json:"ativo"`

	// Limites opcionais — nil = sem restrição
	UsoMaximo         *int       `gorm:"default:null" json:"uso_maximo"`
	UsoAtual          int        `gorm:"default:0" json:"uso_atual"`
	Validade          *time.Time `gorm:"default:null" json:"validade"`
	ValorMinimoPedido float64    `gorm:"default:0" json:"valor_minimo_pedido"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Cupom) TableName() string { return "cupons" }
