package service

import (
	"errors"
	"fmt"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"gorm.io/gorm"
)

type ProdutoInput struct {
	Nome          string
	Descricao     string
	Preco         float64
	FotoURL       string
	Disponivel    bool
	CategoriaID   uint
	EstoqueAtual  *int
	EstoqueAlerta *int
}

type ProdutoService struct {
	produtoRepo   *repository.ProdutoRepository
	categoriaRepo *repository.CategoriaRepository
}

func NewProdutoService(db *gorm.DB) *ProdutoService {
	return &ProdutoService{
		produtoRepo:   repository.NewProdutoRepository(db),
		categoriaRepo: repository.NewCategoriaRepository(db),
	}
}

// Listar devolve todos os produtos da loja, inclusive os pausados — o
// dono precisa ver tudo pra poder reativar um item.
func (s *ProdutoService) Listar(lojaID uint) ([]domain.Produto, error) {
	return s.produtoRepo.ListarPorLoja(lojaID, false)
}

func (s *ProdutoService) Criar(lojaID uint, input ProdutoInput) (*domain.Produto, error) {
	if err := s.validarCategoriaDaLoja(lojaID, input.CategoriaID); err != nil {
		return nil, err
	}

	produto := domain.Produto{
		LojaID:        lojaID,
		CategoriaID:   input.CategoriaID,
		Nome:          input.Nome,
		Descricao:     input.Descricao,
		Preco:         input.Preco,
		FotoURL:       input.FotoURL,
		Disponivel:    input.Disponivel,
		EstoqueAtual:  input.EstoqueAtual,
		EstoqueAlerta: input.EstoqueAlerta,
	}
	if err := s.produtoRepo.Criar(&produto); err != nil {
		return nil, fmt.Errorf("criando produto: %w", err)
	}

	// Recarrega com a Categoria já preenchida — o struct que acabamos de
	// salvar só tem o CategoriaID, não os dados completos da categoria.
	return s.produtoRepo.BuscarPorID(produto.ID)
}

func (s *ProdutoService) Atualizar(lojaID, produtoID uint, input ProdutoInput) (*domain.Produto, error) {
	produto, err := s.buscarDaLoja(lojaID, produtoID)
	if err != nil {
		return nil, err
	}

	if err := s.validarCategoriaDaLoja(lojaID, input.CategoriaID); err != nil {
		return nil, err
	}

	produto.Nome = input.Nome
	produto.Descricao = input.Descricao
	produto.Preco = input.Preco
	produto.FotoURL = input.FotoURL
	produto.Disponivel = input.Disponivel
	produto.CategoriaID = input.CategoriaID
	produto.EstoqueAtual = input.EstoqueAtual
	produto.EstoqueAlerta = input.EstoqueAlerta

	if err := s.produtoRepo.Atualizar(produto); err != nil {
		return nil, fmt.Errorf("atualizando produto: %w", err)
	}

	// Recarrega: se a categoria mudou nessa atualização, o struct
	// Categoria que já estava em memória (carregado antes da mudança)
	// ainda apontaria pros dados da categoria antiga.
	return s.produtoRepo.BuscarPorID(produto.ID)
}

func (s *ProdutoService) Deletar(lojaID, produtoID uint) error {
	produto, err := s.buscarDaLoja(lojaID, produtoID)
	if err != nil {
		return err
	}
	return s.produtoRepo.Deletar(produto.ID)
}

func (s *ProdutoService) buscarDaLoja(lojaID, produtoID uint) (*domain.Produto, error) {
	produto, err := s.produtoRepo.BuscarPorID(produtoID)
	if err != nil {
		return nil, errors.New("produto não encontrado")
	}
	if produto.LojaID != lojaID {
		return nil, errors.New("produto não pertence a essa loja")
	}
	return produto, nil
}

// validarCategoriaDaLoja impede que um produto seja associado a uma
// categoria de outra loja — mesmo que alguém descubra o ID por fora.
func (s *ProdutoService) validarCategoriaDaLoja(lojaID, categoriaID uint) error {
	categoria, err := s.categoriaRepo.BuscarPorID(categoriaID)
	if err != nil {
		return errors.New("categoria não encontrada")
	}
	if categoria.LojaID != lojaID {
		return errors.New("categoria não pertence a essa loja")
	}
	return nil
}