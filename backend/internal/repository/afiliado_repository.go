package repository

import (
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type AfiliadoRepository struct {
	db *gorm.DB
}

func NewAfiliadoRepository(db *gorm.DB) *AfiliadoRepository {
	return &AfiliadoRepository{db: db}
}

func (r *AfiliadoRepository) Criar(afiliado *domain.Afiliado) error {
	return r.db.Create(afiliado).Error
}

func (r *AfiliadoRepository) BuscarPorEmail(email string) (*domain.Afiliado, error) {
	var afiliado domain.Afiliado
	if err := r.db.Where("email = ?", email).First(&afiliado).Error; err != nil {
		return nil, err
	}
	return &afiliado, nil
}

func (r *AfiliadoRepository) BuscarPorID(id uint) (*domain.Afiliado, error) {
	var afiliado domain.Afiliado
	if err := r.db.First(&afiliado, id).Error; err != nil {
		return nil, err
	}
	return &afiliado, nil
}

// BuscarPorCodigo é usado no cadastro de lojas — resolve o ?ref=CODIGO
// pro afiliado dono desse código.
func (r *AfiliadoRepository) BuscarPorCodigo(codigo string) (*domain.Afiliado, error) {
	var afiliado domain.Afiliado
	if err := r.db.Where("codigo = ?", codigo).First(&afiliado).Error; err != nil {
		return nil, err
	}
	return &afiliado, nil
}

func (r *AfiliadoRepository) AtualizarStripeAccountID(afiliadoID uint, stripeAccountID string) error {
	return r.db.Model(&domain.Afiliado{}).Where("id = ?", afiliadoID).Update("stripe_account_id", stripeAccountID).Error
}

// ListarLojasIndicadas retorna as lojas vinculadas a esse afiliado —
// usado no painel dele pra mostrar quem já indicou.
func (r *AfiliadoRepository) ListarLojasIndicadas(afiliadoID uint) ([]domain.Loja, error) {
	var lojas []domain.Loja
	if err := r.db.Where("afiliado_id = ?", afiliadoID).Find(&lojas).Error; err != nil {
		return nil, err
	}
	return lojas, nil
}

// SomarComissoes soma tudo que já foi repassado (ComissaoAfiliado) de
// pedidos pagos das lojas indicadas por esse afiliado.
func (r *AfiliadoRepository) SomarComissoes(afiliadoID uint) (float64, error) {
	var total float64
	err := r.db.Model(&domain.Pedido{}).
		Joins("JOIN lojas ON lojas.id = pedidos.loja_id").
		Where("lojas.afiliado_id = ? AND pedidos.comissao_afiliado > 0", afiliadoID).
		Select("COALESCE(SUM(pedidos.comissao_afiliado), 0)").
		Scan(&total).Error
	return total, err
}