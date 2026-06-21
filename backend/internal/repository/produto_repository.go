package repository

import (
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type ProdutoRepository struct {
	db *gorm.DB
}

func NewProdutoRepository(db *gorm.DB) *ProdutoRepository {
	return &ProdutoRepository{db: db}
}

func (r *ProdutoRepository) Criar(produto *domain.Produto) error {
	return r.db.Create(produto).Error
}

// BuscarPorID já vem com a Categoria carregada junto (Preload), pra toda
// resposta de criar/atualizar devolver o produto completo, não só o ID
// da categoria.
func (r *ProdutoRepository) BuscarPorID(id uint) (*domain.Produto, error) {
	var produto domain.Produto
	if err := r.db.Preload("Categoria").First(&produto, id).Error; err != nil {
		return nil, err
	}
	return &produto, nil
}

func (r *ProdutoRepository) Atualizar(produto *domain.Produto) error {
	return r.db.Save(produto).Error
}

func (r *ProdutoRepository) Deletar(id uint) error {
	return r.db.Delete(&domain.Produto{}, id).Error
}

// ContarPorCategoria é usado pra impedir excluir uma categoria que ainda
// tem produtos dentro dela.
func (r *ProdutoRepository) ContarPorCategoria(categoriaID uint) (int64, error) {
	var total int64
	if err := r.db.Model(&domain.Produto{}).Where("categoria_id = ?", categoriaID).Count(&total).Error; err != nil {
		return 0, err
	}
	return total, nil
}

// ListarPorLoja devolve os produtos de uma loja, com a categoria de cada
// um já carregada junto (Preload evita ficar fazendo uma query por
// produto pra saber o nome da categoria).
//
// apenasDisponiveis controla se produtos marcados como indisponíveis
// entram na lista — true pro cardápio público (cliente não deve ver item
// fora de estoque), false pro painel admin (o dono precisa ver tudo,
// inclusive o que está pausado, pra poder reativar).
func (r *ProdutoRepository) ListarPorLoja(lojaID uint, apenasDisponiveis bool) ([]domain.Produto, error) {
	query := r.db.Where("loja_id = ?", lojaID).Preload("Categoria")
	if apenasDisponiveis {
		query = query.Where("disponivel = ?", true)
	}

	var produtos []domain.Produto
	if err := query.Order("id").Find(&produtos).Error; err != nil {
		return nil, err
	}
	return produtos, nil
}