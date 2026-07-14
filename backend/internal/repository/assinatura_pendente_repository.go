package repository

import (
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type AssinaturaPendenteRepository struct {
	db *gorm.DB
}

func NewAssinaturaPendenteRepository(db *gorm.DB) *AssinaturaPendenteRepository {
	return &AssinaturaPendenteRepository{db: db}
}

func (r *AssinaturaPendenteRepository) Criar(a *domain.AssinaturaPendente) error {
	return r.db.Create(a).Error
}

// BuscarPorToken é usado tanto pra mostrar a tela de "finalizar cadastro"
// quanto, na hora do submit, pra validar de novo antes de criar a loja.
func (r *AssinaturaPendenteRepository) BuscarPorToken(token string) (*domain.AssinaturaPendente, error) {
	var a domain.AssinaturaPendente
	if err := r.db.Where("token = ? AND usado = ?", token, false).First(&a).Error; err != nil {
		return nil, err
	}
	return &a, nil
}

// BuscarPorSessionID é usado quando o cliente é redirecionado direto da
// Stripe (?session_id=...), antes do webhook necessariamente ter
// processado ainda — o frontend tenta de novo por alguns segundos.
func (r *AssinaturaPendenteRepository) BuscarPorSessionID(sessionID string) (*domain.AssinaturaPendente, error) {
	var a domain.AssinaturaPendente
	if err := r.db.Where("stripe_session_id = ? AND usado = ?", sessionID, false).First(&a).Error; err != nil {
		return nil, err
	}
	return &a, nil
}

// MarcarUsado impede que a mesma assinatura seja usada pra criar duas
// lojas diferentes.
func (r *AssinaturaPendenteRepository) MarcarUsado(id uint) error {
	return r.db.Model(&domain.AssinaturaPendente{}).Where("id = ?", id).Update("usado", true).Error
}