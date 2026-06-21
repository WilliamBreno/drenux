package service

import (
	"errors"
	"fmt"
	"time"
	_ "time/tzdata" // embute o banco de fusos horários no binário, pra
	// "America/Sao_Paulo" funcionar mesmo em containers mínimos que não
	// têm timezone instalado no sistema (comum em deploy)

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"gorm.io/gorm"
)

type ItemPedidoInput struct {
	ProdutoID  uint
	Quantidade int
}

type PedidoInput struct {
	ClienteNome     string
	ClienteTelefone string
	DataRetirada    time.Time
	Itens           []ItemPedidoInput
}

type PedidoService struct {
	db         *gorm.DB
	lojaRepo   *repository.LojaRepository
	pedidoRepo *repository.PedidoRepository
}

func NewPedidoService(db *gorm.DB) *PedidoService {
	return &PedidoService{
		db:         db,
		lojaRepo:   repository.NewLojaRepository(db),
		pedidoRepo: repository.NewPedidoRepository(db),
	}
}

// CriarPorSlug monta o pedido de um cliente final pra uma loja
// específica. É a rota pública de checkout — antes de existir o Stripe
// (próxima etapa), o pedido nasce com status "aguardando_pagamento".
func (s *PedidoService) CriarPorSlug(slug string, input PedidoInput) (*domain.Pedido, error) {
	loja, err := s.lojaRepo.BuscarPorSlug(slug)
	if err != nil {
		return nil, errors.New("loja não encontrada")
	}

	if len(input.Itens) == 0 {
		return nil, errors.New("o pedido precisa ter pelo menos um item")
	}

	if err := validarDataRetirada(input.DataRetirada, loja.PermiteMesmoDia); err != nil {
		return nil, err
	}

	pedido := domain.Pedido{
		LojaID:          loja.ID,
		ClienteNome:     input.ClienteNome,
		ClienteTelefone: input.ClienteTelefone,
		DataRetirada:    input.DataRetirada,
		Status:          domain.StatusAguardandoPagamento,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		produtoRepo := repository.NewProdutoRepository(tx)
		pedidoRepo := repository.NewPedidoRepository(tx)

		var total float64
		itens := make([]domain.ItemPedido, 0, len(input.Itens))

		for _, itemInput := range input.Itens {
			if itemInput.Quantidade <= 0 {
				return fmt.Errorf("quantidade inválida pro produto %d", itemInput.ProdutoID)
			}

			produto, err := produtoRepo.BuscarPorID(itemInput.ProdutoID)
			if err != nil {
				return fmt.Errorf("produto %d não encontrado", itemInput.ProdutoID)
			}
			if produto.LojaID != loja.ID {
				return fmt.Errorf("produto %d não pertence a essa loja", itemInput.ProdutoID)
			}
			if !produto.Disponivel {
				return fmt.Errorf("produto %q está indisponível no momento", produto.Nome)
			}

			// Preço sempre vem do banco, nunca do que o cliente mandou —
			// é a única forma de garantir que ninguém edita o preço só
			// alterando a requisição.
			subtotal := produto.Preco * float64(itemInput.Quantidade)
			total += subtotal

			itens = append(itens, domain.ItemPedido{
				ProdutoID:   produto.ID,
				ProdutoNome: produto.Nome,
				Quantidade:  itemInput.Quantidade,
				PrecoUnit:   produto.Preco,
			})
		}

		pedido.Total = total
		pedido.Itens = itens

		if err := pedidoRepo.Criar(&pedido); err != nil {
			return fmt.Errorf("criando pedido: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return &pedido, nil
}

func (s *PedidoService) ListarPorLoja(lojaID uint) ([]domain.Pedido, error) {
	return s.pedidoRepo.ListarPorLoja(lojaID)
}

// validarDataRetirada compara as datas no fuso de São Paulo, não no fuso
// do servidor — importante porque o Render normalmente roda em UTC, e
// comparar "hoje" sem fixar o fuso geraria erro perto da meia-noite.
func validarDataRetirada(dataRetirada time.Time, permiteMesmoDia bool) error {
	fusoBrasil, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		fusoBrasil = time.UTC // fallback, não deveria acontecer em produção
	}

	hoje := time.Now().In(fusoBrasil).Format("2006-01-02")
	dataRetiradaStr := dataRetirada.In(fusoBrasil).Format("2006-01-02")

	if dataRetiradaStr < hoje {
		return errors.New("data de retirada não pode ser no passado")
	}
	if dataRetiradaStr == hoje && !permiteMesmoDia {
		return errors.New("essa loja não aceita pedidos para o mesmo dia")
	}
	return nil
}