package domain

import "time"

// Loja representa o cardápio de um usuário. Por enquanto, 1 usuário = 1
// loja (UsuarioID é unique) — dá pra relaxar isso depois se algum dia
// quisermos permitir múltiplas lojas por dono.
type Loja struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	UsuarioID       uint      `gorm:"not null;unique" json:"usuario_id"`
	Usuario         Usuario   `gorm:"foreignKey:UsuarioID" json:"-"`
	Nome            string    `gorm:"size:100;not null" json:"nome"`
	Slug            string    `gorm:"size:100;not null;unique" json:"slug"` // usado na URL pública: site.com/{slug}
	WhatsappNumero  string    `gorm:"size:20" json:"whatsapp_numero"`
	LogoURL         string    `gorm:"size:500" json:"logo_url"`
	StripeAccountID string    `gorm:"size:100" json:"-"` // preenchido quando integrarmos Stripe Connect
	PermiteMesmoDia bool      `gorm:"default:false" json:"permite_mesmo_dia"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

func (Loja) TableName() string {
	return "lojas"
}