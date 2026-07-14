package domain

import "time"

// AssinaturaPendente representa um pagamento de mensalidade (Pro/Scale)
// já confirmado na Stripe, aguardando o cliente completar o cadastro da
// loja (nome, senha, nome da loja). Não tem prazo de expiração de
// propósito — o cliente já pagou, então o link pra finalizar continua
// válido até ser usado, mesmo que isso demore dias.
type AssinaturaPendente struct {
	ID                   uint   `gorm:"primaryKey" json:"id"`
	Email                string `gorm:"size:150;not null" json:"email"`
	Plano                string `gorm:"size:20;not null" json:"plano"`
	StripeCustomerID     string `gorm:"size:100;not null" json:"-"`
	StripeSubscriptionID string `gorm:"size:100;not null" json:"-"`
	Token                string `gorm:"size:100;not null;unique" json:"-"`
	Usado                bool   `gorm:"default:false" json:"-"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	StripeSessionID string `gorm:"size:100;index" json:"-"`
}

func (AssinaturaPendente) TableName() string {
	return "assinaturas_pendentes"
}