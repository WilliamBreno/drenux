package service

import (
	"errors"
	"fmt"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"gorm.io/gorm"
)

type CatalogoService struct {
	lojaRepo      *repository.LojaRepository
	categoriaRepo *repository.CategoriaRepository
	produtoRepo   *repository.ProdutoRepository
}

func NewCatalogoService(db *gorm.DB) *CatalogoService {
	return &CatalogoService{
		lojaRepo:      repository.NewLojaRepository(db),
		categoriaRepo: repository.NewCategoriaRepository(db),
		produtoRepo:   repository.NewProdutoRepository(db),
	}
}

// CardapioPublico é tudo que a página pública de uma loja precisa pra
// renderizar de uma vez: dados da loja, abas (categorias) e os produtos.
type CardapioPublico struct {
	Loja       domain.Loja
	Categorias []domain.Categoria
	Produtos   []domain.Produto
}

// BuscarCardapioPorSlug é o que alimenta a rota pública GET /lojas/:slug.
func (s *CatalogoService) BuscarCardapioPorSlug(slug string) (*CardapioPublico, error) {
	loja, err := s.lojaRepo.BuscarPorSlug(slug)
	if err != nil {
		return nil, errors.New("loja não encontrada")
	}

	categorias, err := s.categoriaRepo.ListarPorLoja(loja.ID)
	if err != nil {
		return nil, fmt.Errorf("listando categorias: %w", err)
	}

	// true = só produtos disponíveis — cardápio público não mostra item
	// pausado pelo dono.
	produtos, err := s.produtoRepo.ListarPorLoja(loja.ID, true)
	if err != nil {
		return nil, fmt.Errorf("listando produtos: %w", err)
	}

	return &CardapioPublico{Loja: *loja, Categorias: categorias, Produtos: produtos}, nil
}