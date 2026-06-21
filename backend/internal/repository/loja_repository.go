package repository

import (
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type LojaRepository struct {
	db *gorm.DB
}

func NewLojaRepository(db *gorm.DB) *LojaRepository {
	return &LojaRepository{db: db}
}

func (r *LojaRepository) Criar(loja *domain.Loja) error {
	return r.db.Create(loja).Error
}

func (r *LojaRepository) BuscarPorUsuarioID(usuarioID uint) (*domain.Loja, error) {
	var loja domain.Loja
	if err := r.db.Where("usuario_id = ?", usuarioID).First(&loja).Error; err != nil {
		return nil, err
	}
	return &loja, nil
}

func (r *LojaRepository) BuscarPorID(id uint) (*domain.Loja, error) {
	var loja domain.Loja
	if err := r.db.First(&loja, id).Error; err != nil {
		return nil, err
	}
	return &loja, nil
}

// AtualizarStripeAccountID grava o ID da conta Stripe Connect da loja,
// gerado na primeira vez que o onboarding é iniciado.
func (r *LojaRepository) AtualizarStripeAccountID(lojaID uint, stripeAccountID string) error {
	return r.db.Model(&domain.Loja{}).Where("id = ?", lojaID).Update("stripe_account_id", stripeAccountID).Error
}

// AtualizarConfiguracoes grava as configurações editáveis da loja: o
// WhatsApp pra onde vão os avisos de pedido pago, se aceita pedido pro
// mesmo dia, e a logo (link já hospedado no Cloudinary).
func (r *LojaRepository) AtualizarConfiguracoes(lojaID uint, whatsappNumero string, permiteMesmoDia bool, logoURL string) error {
	return r.db.Model(&domain.Loja{}).Where("id = ?", lojaID).Updates(map[string]interface{}{
		"whatsapp_numero":   whatsappNumero,
		"permite_mesmo_dia": permiteMesmoDia,
		"logo_url":          logoURL,
	}).Error
}

// BuscarPorSlug é usado pelo cardápio público — é assim que o cliente
// final acessa a loja, sem precisar saber o ID interno dela.
func (r *LojaRepository) BuscarPorSlug(slug string) (*domain.Loja, error) {
	var loja domain.Loja
	if err := r.db.Where("slug = ?", slug).First(&loja).Error; err != nil {
		return nil, err
	}
	return &loja, nil
}

// SlugExiste confere se um slug já está em uso, pra geração de slug único
// no cadastro.
func (r *LojaRepository) SlugExiste(slug string) (bool, error) {
	var total int64
	if err := r.db.Model(&domain.Loja{}).Where("slug = ?", slug).Count(&total).Error; err != nil {
		return false, err
	}
	return total > 0, nil
}