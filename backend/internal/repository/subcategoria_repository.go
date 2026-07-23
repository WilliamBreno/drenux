package repository

import (
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type SubcategoriaRepository struct {
	db *gorm.DB
}

func NewSubcategoriaRepository(db *gorm.DB) *SubcategoriaRepository {
	return &SubcategoriaRepository{db: db}
}

func (r *SubcategoriaRepository) Criar(subcategoria *domain.Subcategoria) error {
	return r.db.Create(subcategoria).Error
}

func (r *SubcategoriaRepository) BuscarPorID(id uint) (*domain.Subcategoria, error) {
	var subcategoria domain.Subcategoria
	if err := r.db.First(&subcategoria, id).Error; err != nil {
		return nil, err
	}
	return &subcategoria, nil
}

func (r *SubcategoriaRepository) Atualizar(subcategoria *domain.Subcategoria) error {
	return r.db.Save(subcategoria).Error
}

func (r *SubcategoriaRepository) Deletar(id uint) error {
	return r.db.Delete(&domain.Subcategoria{}, id).Error
}

func (r *SubcategoriaRepository) ListarPorCategoria(categoriaID uint) ([]domain.Subcategoria, error) {
	var lista []domain.Subcategoria
	if err := r.db.Where("categoria_id = ?", categoriaID).Order("ordem, id").Find(&lista).Error; err != nil {
		return nil, err
	}
	return lista, nil
}

// ListarPorLoja devolve as subcategorias de todas as categorias de uma
// loja de uma vez — usado pra montar a navegação hierárquica do admin e
// do catálogo público sem precisar de uma chamada por categoria.
func (r *SubcategoriaRepository) ListarPorLoja(lojaID uint) ([]domain.Subcategoria, error) {
	var lista []domain.Subcategoria
	if err := r.db.
		Joins("JOIN categorias ON categorias.id = subcategorias.categoria_id").
		Where("categorias.loja_id = ?", lojaID).
		Order("subcategorias.ordem, subcategorias.id").
		Find(&lista).Error; err != nil {
		return nil, err
	}
	return lista, nil
}
