package repository

import (
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type CategoriaRepository struct {
	db *gorm.DB
}

func NewCategoriaRepository(db *gorm.DB) *CategoriaRepository {
	return &CategoriaRepository{db: db}
}

// CriarVarias insere várias categorias de uma vez (usado pra criar as
// categorias padrão — Salgados/Doces — no momento do cadastro da loja).
func (r *CategoriaRepository) CriarVarias(categorias []domain.Categoria) error {
	return r.db.Create(&categorias).Error
}

// Criar insere uma única categoria nova (usado pelo admin).
func (r *CategoriaRepository) Criar(categoria *domain.Categoria) error {
	return r.db.Create(categoria).Error
}

func (r *CategoriaRepository) BuscarPorID(id uint) (*domain.Categoria, error) {
	var categoria domain.Categoria
	if err := r.db.First(&categoria, id).Error; err != nil {
		return nil, err
	}
	return &categoria, nil
}

func (r *CategoriaRepository) Atualizar(categoria *domain.Categoria) error {
	return r.db.Save(categoria).Error
}

func (r *CategoriaRepository) Deletar(id uint) error {
	return r.db.Delete(&domain.Categoria{}, id).Error
}

// ListarPorLoja devolve as categorias de uma loja específica, em ordem
// de criação (Salgados antes de Doces, do jeito que foram criadas).
func (r *CategoriaRepository) ListarPorLoja(lojaID uint) ([]domain.Categoria, error) {
	var categorias []domain.Categoria
	if err := r.db.Where("loja_id = ?", lojaID).Order("id").Find(&categorias).Error; err != nil {
		return nil, err
	}
	return categorias, nil
}
