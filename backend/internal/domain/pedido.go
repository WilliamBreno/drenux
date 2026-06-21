package domain

import "time"

type StatusPedido string

const (
	StatusAguardandoPagamento StatusPedido = "aguardando_pagamento"
	StatusPago                StatusPedido = "pago"
	StatusCancelado           StatusPedido = "cancelado"
)

// Pedido representa um pedido feito por um cliente final numa loja. Não
// existe conta de cliente nesse sistema — quem pede só informa nome e
// telefone, sem precisar se cadastrar.
type Pedido struct {
	ID               uint         `gorm:"primaryKey" json:"id"`
	LojaID           uint         `gorm:"not null;index" json:"loja_id"`
	ClienteNome      string       `gorm:"size:100;not null" json:"cliente_nome"`
	ClienteTelefone  string       `gorm:"size:20;not null" json:"cliente_telefone"`
	DataRetirada     time.Time    `gorm:"not null" json:"data_retirada"`
	Status           StatusPedido `gorm:"size:30;not null;default:aguardando_pagamento" json:"status"`
	Total            float64      `gorm:"not null" json:"total"`
	StripeSessionID  string       `gorm:"size:255" json:"-"`
	Itens            []ItemPedido `gorm:"foreignKey:PedidoID" json:"itens"`
	CreatedAt        time.Time    `json:"created_at"`
	UpdatedAt        time.Time    `json:"updated_at"`
}

func (Pedido) TableName() string {
	return "pedidos"
}