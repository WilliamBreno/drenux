package service

import (
	"errors"
	"fmt"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"gorm.io/gorm"
)

type SubcategoriaService struct {
	subcategoriaRepo *repository.SubcategoriaRepository
	categoriaRepo    *repository.CategoriaRepository
	produtoRepo      *repository.ProdutoRepository
}

func NewSubcategoriaService(db *gorm.DB) *SubcategoriaService {
	return &SubcategoriaService{
		subcategoriaRepo: repository.NewSubcategoriaRepository(db),
		categoriaRepo:    repository.NewCategoriaRepository(db),
		produtoRepo:      repository.NewProdutoRepository(db),
	}
}

// ListarPorLoja devolve todas as subcategorias da loja de uma vez — usado
// pra montar a hierarquia completa no admin sem uma chamada por categoria.
func (s *SubcategoriaService) ListarPorLoja(lojaID uint) ([]domain.Subcategoria, error) {
	return s.subcategoriaRepo.ListarPorLoja(lojaID)
}

func (s *SubcategoriaService) Criar(lojaID, categoriaID uint, nome string) (*domain.Subcategoria, error) {
	if err := s.validarCategoriaDaLoja(lojaID, categoriaID); err != nil {
		return nil, err
	}
	subcategoria := domain.Subcategoria{CategoriaID: categoriaID, Nome: nome}
	if err := s.subcategoriaRepo.Criar(&subcategoria); err != nil {
		return nil, fmt.Errorf("não foi possível criar a subcategoria (nome já existe nessa categoria?): %w", err)
	}
	return &subcategoria, nil
}

func (s *SubcategoriaService) Atualizar(lojaID, subcategoriaID uint, nome string) (*domain.Subcategoria, error) {
	subcategoria, err := s.buscarDaLoja(lojaID, subcategoriaID)
	if err != nil {
		return nil, err
	}
	subcategoria.Nome = nome
	if err := s.subcategoriaRepo.Atualizar(subcategoria); err != nil {
		return nil, fmt.Errorf("atualizando subcategoria: %w", err)
	}
	return subcategoria, nil
}

func (s *SubcategoriaService) Deletar(lojaID, subcategoriaID uint) error {
	subcategoria, err := s.buscarDaLoja(lojaID, subcategoriaID)
	if err != nil {
		return err
	}

	total, err := s.produtoRepo.ContarPorSubcategoria(subcategoria.ID)
	if err != nil {
		return fmt.Errorf("verificando produtos da subcategoria: %w", err)
	}
	if total > 0 {
		return errors.New("não é possível excluir uma subcategoria que ainda tem produtos — mova ou exclua os produtos primeiro")
	}

	return s.subcategoriaRepo.Deletar(subcategoria.ID)
}

func (s *SubcategoriaService) validarCategoriaDaLoja(lojaID, categoriaID uint) error {
	categoria, err := s.categoriaRepo.BuscarPorID(categoriaID)
	if err != nil {
		return errors.New("categoria não encontrada")
	}
	if categoria.LojaID != lojaID {
		return errors.New("categoria não pertence a essa loja")
	}
	return nil
}

// buscarDaLoja busca a subcategoria e confirma, subindo até a categoria,
// que ela pertence à loja do token.
func (s *SubcategoriaService) buscarDaLoja(lojaID, subcategoriaID uint) (*domain.Subcategoria, error) {
	subcategoria, err := s.subcategoriaRepo.BuscarPorID(subcategoriaID)
	if err != nil {
		return nil, errors.New("subcategoria não encontrada")
	}
	if err := s.validarCategoriaDaLoja(lojaID, subcategoria.CategoriaID); err != nil {
		return nil, errors.New("subcategoria não pertence a essa loja")
	}
	return subcategoria, nil
}
