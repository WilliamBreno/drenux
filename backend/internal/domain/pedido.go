package domain

import "time"

type StatusPedido string

const (
	StatusAguardandoPagamento StatusPedido = "aguardando_pagamento"
	StatusPago                StatusPedido = "pago"
	StatusCancelado           StatusPedido = "cancelado"
)

type ModoEntrega string

const (
	ModoEntregaRetirada ModoEntrega = "retirada"
	ModoEntregaEntrega  ModoEntrega = "entrega"
)

// Pedido representa um pedido feito por um cliente final numa loja.
type Pedido struct {
	ID              uint         `gorm:"primaryKey" json:"id"`
	LojaID          uint         `gorm:"not null;index" json:"loja_id"`
	ClienteNome     string       `gorm:"size:100;not null" json:"cliente_nome"`
	ClienteTelefone string       `gorm:"size:20;not null" json:"cliente_telefone"`
	DataRetirada    time.Time    `gorm:"not null" json:"data_retirada"`
	Status          StatusPedido `gorm:"size:30;not null;default:aguardando_pagamento" json:"status"`
	Total           float64      `gorm:"not null" json:"total"`

	// Modo de recebimento — preenchido pelo cliente no momento do pedido.
	ModoEntrega     ModoEntrega `gorm:"size:20;default:'retirada'" json:"modo_entrega"`
	EnderecoEntrega string      `gorm:"size:300" json:"endereco_entrega"`

	// Cupom aplicado — snapshot do código no momento do pedido.
	// Guardamos o código (não o ID) porque se o cupom for deletado depois,
	// o histórico do pedido ainda faz sentido.
	CupomCodigo string  `gorm:"size:30" json:"cupom_codigo"`
	Desconto    float64 `gorm:"default:0" json:"desconto"`

	StripeSessionID string       `gorm:"size:255" json:"-"`
	Itens           []ItemPedido `gorm:"foreignKey:PedidoID" json:"itens"`
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
	TaxaEntrega float64 `gorm:"default:0" json:"taxa_entrega"`
	StatusEntrega string `gorm:"size:30;default:''" json:"status_entrega"`
	EntregadorLatitude     float64    `gorm:"default:0" json:"entregador_latitude"`
	EntregadorLongitude    float64    `gorm:"default:0" json:"entregador_longitude"`
	EntregadorAtualizadoEm *time.Time `json:"entregador_atualizado_em"`
}

func (Pedido) TableName() string {
	return "pedidos"
}
