package repository

import (
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type PedidoRepository struct {
	db *gorm.DB
}

func NewPedidoRepository(db *gorm.DB) *PedidoRepository {
	return &PedidoRepository{db: db}
}

// Criar salva o pedido. Como Pedido.Itens vem preenchido, o GORM cria os
// ItemPedido junto automaticamente (associação has-many), na mesma
// operação — não precisa de um Criar separado pros itens.
func (r *PedidoRepository) Criar(pedido *domain.Pedido) error {
	return r.db.Create(pedido).Error
}

// ListarPorLoja devolve os pedidos de uma loja, mais recentes primeiro,
// com os itens de cada um já carregados.
func (r *PedidoRepository) ListarPorLoja(lojaID uint) ([]domain.Pedido, error) {
	var pedidos []domain.Pedido
	if err := r.db.Where("loja_id = ?", lojaID).Preload("Itens").Order("id desc").Find(&pedidos).Error; err != nil {
		return nil, err
	}
	return pedidos, nil
}

// BuscarPorID vem com os itens carregados — necessário pra montar a
// sessão de checkout (cada item vira uma linha no Stripe).
func (r *PedidoRepository) BuscarPorID(id uint) (*domain.Pedido, error) {
	var pedido domain.Pedido
	if err := r.db.Preload("Itens").First(&pedido, id).Error; err != nil {
		return nil, err
	}
	return &pedido, nil
}

func (r *PedidoRepository) AtualizarStatus(pedidoID uint, status domain.StatusPedido) error {
	return r.db.Model(&domain.Pedido{}).Where("id = ?", pedidoID).Update("status", status).Error
}

func (r *PedidoRepository) AtualizarStripeSessionID(pedidoID uint, sessionID string) error {
	return r.db.Model(&domain.Pedido{}).Where("id = ?", pedidoID).Update("stripe_session_id", sessionID).Error
}

// ResumoSemana agrega os pedidos pagos de uma loja em um período.
type ResumoSemana struct {
	TotalPedidos    int
	Faturamento     float64
	ProdutoTop      string
	QuantidadeTop   int
}

// BuscarResumoSemana retorna os dados agregados de pedidos pagos
// num intervalo de datas, pra montar o relatório semanal.
func (r *PedidoRepository) BuscarResumoSemana(lojaID uint, inicio, fim interface{}) (*ResumoSemana, error) {
	var pedidos []domain.Pedido
	if err := r.db.
		Where("loja_id = ? AND status = ? AND updated_at BETWEEN ? AND ?",
			lojaID, domain.StatusPago, inicio, fim).
		Preload("Itens").
		Find(&pedidos).Error; err != nil {
		return nil, err
	}

	resumo := &ResumoSemana{}
	resumo.TotalPedidos = len(pedidos)

	contagem := map[string]int{}
	for _, pedido := range pedidos {
		resumo.Faturamento += pedido.Total
		for _, item := range pedido.Itens {
			nome := item.ProdutoNome
			if item.VariacaoNome != "" {
				nome += " (" + item.VariacaoNome + ")"
			}
			contagem[nome] += item.Quantidade
		}
	}

	for nome, qtd := range contagem {
		if qtd > resumo.QuantidadeTop {
			resumo.QuantidadeTop = qtd
			resumo.ProdutoTop = nome
		}
	}

	return resumo, nil
}