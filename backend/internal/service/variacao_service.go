package service

import (
	"errors"
	"fmt"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"gorm.io/gorm"
)

type VariacaoInput struct {
	Nome           string
	PrecoAdicional float64
	Disponivel     bool
	EstoqueAtual   *int
	EstoqueAlerta  *int
	Ordem          int
}

type VariacaoService struct {
	variacaoRepo *repository.VariacaoRepository
	produtoRepo  *repository.ProdutoRepository
}

func NewVariacaoService(db *gorm.DB) *VariacaoService {
	return &VariacaoService{
		variacaoRepo: repository.NewVariacaoRepository(db),
		produtoRepo:  repository.NewProdutoRepository(db),
	}
}

func (s *VariacaoService) Listar(lojaID, produtoID uint) ([]domain.VariacaoProduto, error) {
	if err := s.validarDono(lojaID, produtoID); err != nil {
		return nil, err
	}
	return s.variacaoRepo.ListarPorProduto(produtoID)
}

func (s *VariacaoService) Criar(lojaID, produtoID uint, input VariacaoInput) (*domain.VariacaoProduto, error) {
	if err := s.validarDono(lojaID, produtoID); err != nil {
		return nil, err
	}
	if input.Nome == "" {
		return nil, errors.New("nome da variação é obrigatório")
	}

	v := domain.VariacaoProduto{
		ProdutoID:      produtoID,
		Nome:           input.Nome,
		PrecoAdicional: input.PrecoAdicional,
		Disponivel:     input.Disponivel,
		EstoqueAtual:   input.EstoqueAtual,
		EstoqueAlerta:  input.EstoqueAlerta,
		Ordem:          input.Ordem,
	}
	if err := s.variacaoRepo.Criar(&v); err != nil {
		return nil, fmt.Errorf("criando variação: %w", err)
	}
	return &v, nil
}

func (s *VariacaoService) Atualizar(lojaID, produtoID, variacaoID uint, input VariacaoInput) (*domain.VariacaoProduto, error) {
	if err := s.validarDono(lojaID, produtoID); err != nil {
		return nil, err
	}

	v, err := s.variacaoRepo.BuscarPorID(variacaoID)
	if err != nil || v.ProdutoID != produtoID {
		return nil, errors.New("variação não encontrada")
	}

	v.Nome = input.Nome
	v.PrecoAdicional = input.PrecoAdicional
	v.Disponivel = input.Disponivel
	v.EstoqueAtual = input.EstoqueAtual
	v.EstoqueAlerta = input.EstoqueAlerta
	v.Ordem = input.Ordem

	if err := s.variacaoRepo.Atualizar(v); err != nil {
		return nil, fmt.Errorf("atualizando variação: %w", err)
	}
	return v, nil
}

func (s *VariacaoService) Deletar(lojaID, produtoID, variacaoID uint) error {
	if err := s.validarDono(lojaID, produtoID); err != nil {
		return err
	}

	v, err := s.variacaoRepo.BuscarPorID(variacaoID)
	if err != nil || v.ProdutoID != produtoID {
		return errors.New("variação não encontrada")
	}

	return s.variacaoRepo.Deletar(variacaoID)
}

func (s *VariacaoService) validarDono(lojaID, produtoID uint) error {
	produto, err := s.produtoRepo.BuscarPorID(produtoID)
	if err != nil {
		return errors.New("produto não encontrado")
	}
	if produto.LojaID != lojaID {
		return errors.New("produto não pertence a essa loja")
	}
	return nil
}