package repository

import (
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type GrupoCorRepository struct {
	db *gorm.DB
}

func NewGrupoCorRepository(db *gorm.DB) *GrupoCorRepository {
	return &GrupoCorRepository{db: db}
}

func (r *GrupoCorRepository) Criar(grupoCor *domain.GrupoCor) error {
	return r.db.Create(grupoCor).Error
}

func (r *GrupoCorRepository) BuscarPorID(id uint) (*domain.GrupoCor, error) {
	var grupoCor domain.GrupoCor
	if err := r.db.First(&grupoCor, id).Error; err != nil {
		return nil, err
	}
	return &grupoCor, nil
}

func (r *GrupoCorRepository) Atualizar(grupoCor *domain.GrupoCor) error {
	return r.db.Save(grupoCor).Error
}

func (r *GrupoCorRepository) Deletar(id uint) error {
	return r.db.Delete(&domain.GrupoCor{}, id).Error
}

func (r *GrupoCorRepository) ListarPorSubcategoria(subcategoriaID uint) ([]domain.GrupoCor, error) {
	var lista []domain.GrupoCor
	if err := r.db.Where("subcategoria_id = ?", subcategoriaID).Order("ordem, id").Find(&lista).Error; err != nil {
		return nil, err
	}
	return lista, nil
}

// ListarPorLoja devolve os grupos de cor de todas as subcategorias de
// todas as categorias de uma loja de uma vez.
func (r *GrupoCorRepository) ListarPorLoja(lojaID uint) ([]domain.GrupoCor, error) {
	var lista []domain.GrupoCor
	if err := r.db.
		Joins("JOIN subcategorias ON subcategorias.id = grupos_cor.subcategoria_id").
		Joins("JOIN categorias ON categorias.id = subcategorias.categoria_id").
		Where("categorias.loja_id = ?", lojaID).
		Order("grupos_cor.ordem, grupos_cor.id").
		Find(&lista).Error; err != nil {
		return nil, err
	}
	return lista, nil
}
