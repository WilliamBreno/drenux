package domain

import "time"

type ModoPedido string

const (
	ModoPedidoImediato ModoPedido = "imediato"
	ModoPedidoAgendado ModoPedido = "agendado"
)

// Loja representa o cardápio de um usuário.
type Loja struct {
	ID              uint    `gorm:"primaryKey" json:"id"`
	UsuarioID       uint    `gorm:"not null;unique" json:"usuario_id"`
	Usuario         Usuario `gorm:"foreignKey:UsuarioID" json:"-"`
	Nome            string  `gorm:"size:100;not null" json:"nome"`
	Slug            string  `gorm:"size:100;not null;unique" json:"slug"`
	WhatsappNumero  string  `gorm:"size:20" json:"whatsapp_numero"`
	LogoURL         string  `gorm:"size:500" json:"logo_url"`
	StripeAccountID string  `gorm:"size:100" json:"-"`

	ModoPedido              ModoPedido `gorm:"size:20;default:'imediato'" json:"modo_pedido"`
	AntecedenciaMinimaHoras int        `gorm:"default:24" json:"antecedencia_minima_horas"`

	HorarioAbertura   string `gorm:"size:5" json:"horario_abertura"`
	HorarioFechamento string `gorm:"size:5" json:"horario_fechamento"`

	MargemFechamentoMinutos int `gorm:"default:0" json:"margem_fechamento_minutos"`

	Pausado       bool   `gorm:"default:false" json:"pausado"`
	MensagemPausa string `gorm:"size:300" json:"mensagem_pausa"`

	Tema string `gorm:"size:20;default:'kraft'" json:"tema"`

	ValorMinimoPedido float64 `gorm:"default:0" json:"valor_minimo_pedido"`

	AceitaRetirada bool    `gorm:"default:true" json:"aceita_retirada"`
	AceitaEntrega  bool    `gorm:"default:false" json:"aceita_entrega"`
	Endereco       string  `gorm:"size:300" json:"endereco"`
	Latitude       float64 `gorm:"default:0" json:"latitude"`
	Longitude      float64 `gorm:"default:0" json:"longitude"`

	Cidade string `gorm:"size:100" json:"cidade"`
	Estado string `gorm:"size:100" json:"estado"`

	TaxaEntregaTipo  string  `gorm:"size:20;default:'combinado'" json:"taxa_entrega_tipo"`
	TaxaEntregaValor float64 `gorm:"default:0" json:"taxa_entrega_valor"`
	TaxaEntregaBase  float64 `gorm:"default:0" json:"taxa_entrega_base"`
	TaxaEntregaPorKm float64 `gorm:"default:0" json:"taxa_entrega_por_km"`

	PermiteMesmoDia bool `gorm:"default:false" json:"permite_mesmo_dia"`

	AceitaGuardarEntregar bool `gorm:"default:false" json:"aceita_guardar_entregar"`

	// SegmentoPrincipal reaproveita o enum TipoProduto (alimenticio/mercadoria):
	// define o tipo padrão de produtos novos e o fluxo de catálogo sugerido.
	SegmentoPrincipal TipoProduto `gorm:"size:20;default:'alimenticio'" json:"segmento_principal"`

	AfiliadoID *uint `gorm:"index" json:"-"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Plano: "start" (padrão) | "pro" | "scale". StripeCustomerID e
	// StripeSubscriptionID só são preenchidos quando há mensalidade
	// (Pro/Scale) — Start nunca tem assinatura Stripe.
	Plano                string `gorm:"size:20;default:'start'" json:"plano"`
	StripeCustomerID     string `gorm:"size:100" json:"-"`
	StripeSubscriptionID string `gorm:"size:100" json:"-"`

	// PlanoAgendado: quando não-nulo, indica que um downgrade foi pedido
	// e vai aplicar sozinho na próxima renovação da assinatura (fim do
	// ciclo atual). Populado por MudarPlano, limpo depois que o webhook
	// de renovação aplica a troca.
	PlanoAgendado *string `gorm:"size:20" json:"plano_agendado"`
}

func (Loja) TableName() string {
	return "lojas"
}
