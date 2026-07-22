package repository

import (
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type FotoVariacaoRepository struct {
	db *gorm.DB
}

func NewFotoVariacaoRepository(db *gorm.DB) *FotoVariacaoRepository {
	return &FotoVariacaoRepository{db: db}
}

func (r *FotoVariacaoRepository) Adicionar(foto *domain.FotoVariacao) error {
	return r.db.Create(foto).Error
}

func (r *FotoVariacaoRepository) Deletar(id, variacaoID uint) error {
	return r.db.Where("id = ? AND variacao_id = ?", id, variacaoID).Delete(&domain.FotoVariacao{}).Error
}
