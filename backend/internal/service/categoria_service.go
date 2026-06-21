package service

import (
	"errors"
	"fmt"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"gorm.io/gorm"
)

type CategoriaService struct {
	categoriaRepo *repository.CategoriaRepository
	produtoRepo   *repository.ProdutoRepository
}

func NewCategoriaService(db *gorm.DB) *CategoriaService {
	return &CategoriaService{
		categoriaRepo: repository.NewCategoriaRepository(db),
		produtoRepo:   repository.NewProdutoRepository(db),
	}
}

func (s *CategoriaService) Listar(lojaID uint) ([]domain.Categoria, error) {
	return s.categoriaRepo.ListarPorLoja(lojaID)
}

func (s *CategoriaService) Criar(lojaID uint, nome string) (*domain.Categoria, error) {
	categoria := domain.Categoria{LojaID: lojaID, Nome: nome}
	if err := s.categoriaRepo.Criar(&categoria); err != nil {
		return nil, fmt.Errorf("não foi possível criar a categoria (nome já existe nessa loja?): %w", err)
	}
	return &categoria, nil
}

func (s *CategoriaService) Atualizar(lojaID, categoriaID uint, novoNome string) (*domain.Categoria, error) {
	categoria, err := s.buscarDaLoja(lojaID, categoriaID)
	if err != nil {
		return nil, err
	}

	categoria.Nome = novoNome
	if err := s.categoriaRepo.Atualizar(categoria); err != nil {
		return nil, fmt.Errorf("atualizando categoria: %w", err)
	}
	return categoria, nil
}

func (s *CategoriaService) Deletar(lojaID, categoriaID uint) error {
	categoria, err := s.buscarDaLoja(lojaID, categoriaID)
	if err != nil {
		return err
	}

	totalProdutos, err := s.produtoRepo.ContarPorCategoria(categoria.ID)
	if err != nil {
		return fmt.Errorf("verificando produtos da categoria: %w", err)
	}
	if totalProdutos > 0 {
		return errors.New("não é possível excluir uma categoria que ainda tem produtos — mova ou exclua os produtos primeiro")
	}

	return s.categoriaRepo.Deletar(categoria.ID)
}

// buscarDaLoja busca a categoria e confirma que ela pertence à loja do
// token. Esse é o ponto central que impede uma loja mexer no que não é
// dela.
func (s *CategoriaService) buscarDaLoja(lojaID, categoriaID uint) (*domain.Categoria, error) {
	categoria, err := s.categoriaRepo.BuscarPorID(categoriaID)
	if err != nil {
		return nil, errors.New("categoria não encontrada")
	}
	if categoria.LojaID != lojaID {
		return nil, errors.New("categoria não pertence a essa loja")
	}
	return categoria, nil
}