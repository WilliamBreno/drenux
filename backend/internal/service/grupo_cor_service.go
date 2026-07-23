package service

import (
	"errors"
	"fmt"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"gorm.io/gorm"
)

type GrupoCorService struct {
	grupoCorRepo     *repository.GrupoCorRepository
	subcategoriaRepo *repository.SubcategoriaRepository
	categoriaRepo    *repository.CategoriaRepository
	produtoRepo      *repository.ProdutoRepository
}

func NewGrupoCorService(db *gorm.DB) *GrupoCorService {
	return &GrupoCorService{
		grupoCorRepo:     repository.NewGrupoCorRepository(db),
		subcategoriaRepo: repository.NewSubcategoriaRepository(db),
		categoriaRepo:    repository.NewCategoriaRepository(db),
		produtoRepo:      repository.NewProdutoRepository(db),
	}
}

// ListarPorLoja devolve todos os grupos de cor da loja de uma vez — usado
// pra montar a hierarquia completa no admin sem uma chamada por subcategoria.
func (s *GrupoCorService) ListarPorLoja(lojaID uint) ([]domain.GrupoCor, error) {
	return s.grupoCorRepo.ListarPorLoja(lojaID)
}

func (s *GrupoCorService) Criar(lojaID, subcategoriaID uint, nome string) (*domain.GrupoCor, error) {
	if err := s.validarSubcategoriaDaLoja(lojaID, subcategoriaID); err != nil {
		return nil, err
	}
	grupoCor := domain.GrupoCor{SubcategoriaID: subcategoriaID, Nome: nome}
	if err := s.grupoCorRepo.Criar(&grupoCor); err != nil {
		return nil, fmt.Errorf("não foi possível criar o grupo de cor (nome já existe nessa subcategoria?): %w", err)
	}
	return &grupoCor, nil
}

func (s *GrupoCorService) Atualizar(lojaID, grupoCorID uint, nome string) (*domain.GrupoCor, error) {
	grupoCor, err := s.buscarDaLoja(lojaID, grupoCorID)
	if err != nil {
		return nil, err
	}
	grupoCor.Nome = nome
	if err := s.grupoCorRepo.Atualizar(grupoCor); err != nil {
		return nil, fmt.Errorf("atualizando grupo de cor: %w", err)
	}
	return grupoCor, nil
}

func (s *GrupoCorService) Deletar(lojaID, grupoCorID uint) error {
	grupoCor, err := s.buscarDaLoja(lojaID, grupoCorID)
	if err != nil {
		return err
	}

	total, err := s.produtoRepo.ContarPorGrupoCor(grupoCor.ID)
	if err != nil {
		return fmt.Errorf("verificando produtos do grupo de cor: %w", err)
	}
	if total > 0 {
		return errors.New("não é possível excluir um grupo de cor que ainda tem produtos — mova ou exclua os produtos primeiro")
	}

	return s.grupoCorRepo.Deletar(grupoCor.ID)
}

func (s *GrupoCorService) validarSubcategoriaDaLoja(lojaID, subcategoriaID uint) error {
	subcategoria, err := s.subcategoriaRepo.BuscarPorID(subcategoriaID)
	if err != nil {
		return errors.New("subcategoria não encontrada")
	}
	categoria, err := s.categoriaRepo.BuscarPorID(subcategoria.CategoriaID)
	if err != nil || categoria.LojaID != lojaID {
		return errors.New("subcategoria não pertence a essa loja")
	}
	return nil
}

// buscarDaLoja busca o grupo de cor e confirma, subindo até a categoria,
// que ele pertence à loja do token.
func (s *GrupoCorService) buscarDaLoja(lojaID, grupoCorID uint) (*domain.GrupoCor, error) {
	grupoCor, err := s.grupoCorRepo.BuscarPorID(grupoCorID)
	if err != nil {
		return nil, errors.New("grupo de cor não encontrado")
	}
	if err := s.validarSubcategoriaDaLoja(lojaID, grupoCor.SubcategoriaID); err != nil {
		return nil, errors.New("grupo de cor não pertence a essa loja")
	}
	return grupoCor, nil
}
