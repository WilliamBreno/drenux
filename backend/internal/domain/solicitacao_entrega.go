package domain

import "time"

type StatusSolicitacao string

const (
	StatusSolicitacaoAguardandoPagamento StatusSolicitacao = "aguardando_pagamento"
	StatusSolicitacaoPaga                StatusSolicitacao = "paga"
	StatusSolicitacaoCancelada           StatusSolicitacao = "cancelada"
)

// SolicitacaoEntrega representa o pedido de entrega de itens que já foram
// pagos e ficaram guardados (ver ModoEntregaGuardar). É uma entidade
// separada do Pedido original porque um cliente pode combinar itens de
// compras diferentes numa única entrega — cada ItemPedido reivindicado
// aponta pra cá via SolicitacaoEntregaID.
type SolicitacaoEntrega struct {
	ID              uint    `gorm:"primaryKey" json:"id"`
	LojaID          uint    `gorm:"not null;index" json:"loja_id"`
	ClienteNome     string  `gorm:"size:100;not null" json:"cliente_nome"`
	ClienteTelefone string  `gorm:"size:20;not null;index" json:"cliente_telefone"`
	EnderecoEntrega string  `gorm:"size:300;not null" json:"endereco_entrega"`
	Latitude        float64 `gorm:"default:0" json:"latitude"`
	Longitude       float64 `gorm:"default:0" json:"longitude"`
	DistanciaKm     float64 `gorm:"default:0" json:"distancia_km"`

	// TipoCalculo registra qual fórmula foi usada — "regional" (por km,
	// mesma cidade/estado da loja) ou "correios_estimado" (peso +
	// distância, fora da região) — só pra auditoria/exibição.
	TipoCalculo     string  `gorm:"size:30" json:"tipo_calculo"`
	PesoTotalGramas int     `gorm:"default:0" json:"peso_total_gramas"`
	ValorFrete      float64 `gorm:"not null" json:"valor_frete"`

	// PesoPendente é true quando essa entrega ficou fora da região da loja
	// (TipoCalculo == "correios_estimado") e pelo menos um item mercadoria
	// não tinha peso cadastrado — o frete foi calculado mesmo assim
	// (tratando o peso ausente como zero), então o valor pode estar
	// incorreto. Fica marcado até o lojista resolver.
	PesoPendente bool `gorm:"default:false" json:"peso_pendente"`

	Status          StatusSolicitacao `gorm:"size:30;not null;default:aguardando_pagamento" json:"status"`
	StripeSessionID string            `gorm:"size:255" json:"-"`

	// constraint:false — de propósito, mesmo motivo do ItemPedido não ter
	// FK real pro Produto: evita o GORM tentar criar a foreign key numa
	// ordem que trava a migração (a tabela referenciada às vezes ainda
	// não existe no momento em que o GORM tenta o ALTER TABLE). O
	// relacionamento continua funcionando normalmente via consultas
	// (Preload, WHERE solicitacao_entrega_id = ?), só não vira uma regra
	// no banco.
	Itens []ItemPedido `gorm:"foreignKey:SolicitacaoEntregaID;constraint:-" json:"itens"`

	// Mesmo padrão de rastreamento em tempo real já usado em Pedido —
	// reaproveitado aqui, não reinventado.
	StatusEntrega          string     `gorm:"size:30;default:''" json:"status_entrega"`
	EntregadorLatitude     float64    `gorm:"default:0" json:"entregador_latitude"`
	EntregadorLongitude    float64    `gorm:"default:0" json:"entregador_longitude"`
	EntregadorAtualizadoEm *time.Time `json:"entregador_atualizado_em"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (SolicitacaoEntrega) TableName() string {
	return "solicitacoes_entrega"
}
