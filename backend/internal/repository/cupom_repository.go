package repository

import (
	"strings"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type CupomRepository struct {
	db *gorm.DB
}

func NewCupomRepository(db *gorm.DB) *CupomRepository {
	return &CupomRepository{db: db}
}

func (r *CupomRepository) ListarPorLoja(lojaID uint) ([]domain.Cupom, error) {
	var cupons []domain.Cupom
	err := r.db.Where("loja_id = ?", lojaID).Order("created_at desc").Find(&cupons).Error
	return cupons, err
}

func (r *CupomRepository) BuscarPorID(id, lojaID uint) (*domain.Cupom, error) {
	var cupom domain.Cupom
	err := r.db.Where("id = ? AND loja_id = ?", id, lojaID).First(&cupom).Error
	return &cupom, err
}

func (r *CupomRepository) BuscarPorCodigo(codigo string, lojaID uint) (*domain.Cupom, error) {
	var cupom domain.Cupom
	err := r.db.Where("codigo = ? AND loja_id = ?",
		strings.ToUpper(strings.TrimSpace(codigo)), lojaID).First(&cupom).Error
	return &cupom, err
}

func (r *CupomRepository) Criar(cupom *domain.Cupom) error {
	cupom.Codigo = strings.ToUpper(strings.TrimSpace(cupom.Codigo))
	return r.db.Create(cupom).Error
}

func (r *CupomRepository) Atualizar(cupom *domain.Cupom) error {
	cupom.Codigo = strings.ToUpper(strings.TrimSpace(cupom.Codigo))
	return r.db.Save(cupom).Error
}

func (r *CupomRepository) Deletar(id, lojaID uint) error {
	return r.db.Where("id = ? AND loja_id = ?", id, lojaID).Delete(&domain.Cupom{}).Error
}

// IncrementarUso incrementa o uso do cupom de forma atômica pra evitar
// race condition quando dois pedidos usam o mesmo cupom ao mesmo tempo.
func (r *CupomRepository) IncrementarUso(cupomID uint) error {
	return r.db.Model(&domain.Cupom{}).
		Where("id = ?", cupomID).
		UpdateColumn("uso_atual", gorm.Expr("uso_atual + 1")).Error
}