package domain

import "time"

type ModoPedido string

const (
	// ModoPedidoImediato: cliente faz o pedido sem agendar data, retira
	// quando disponível. Ideal pra produtos já prontos.
	ModoPedidoImediato ModoPedido = "imediato"

	// ModoPedidoAgendado: cliente precisa escolher uma data/hora futura
	// com antecedência mínima configurável pelo dono (ex: 24h). Ideal pra
	// encomendas que precisam de preparo.
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

	// Modo de pedido
	ModoPedido              ModoPedido `gorm:"size:20;default:'imediato'" json:"modo_pedido"`
	AntecedenciaMinimaHoras int        `gorm:"default:24" json:"antecedencia_minima_horas"`

	// Horário de funcionamento — armazenados como string "HH:MM".
	// Vazios = sem restrição de horário.
	HorarioAbertura   string `gorm:"size:5" json:"horario_abertura"`
	HorarioFechamento string `gorm:"size:5" json:"horario_fechamento"`

	// Margem de fechamento: para de aceitar pedidos N minutos antes do
	// horário de fechamento. Valores válidos: 0, 5, 10, 15, 20, 25, 30.
	MargemFechamentoMinutos int `gorm:"default:0" json:"margem_fechamento_minutos"`

	// Pausa manual: o dono pode fechar a loja temporariamente com um
	// aviso personalizado (ex: "em férias até dia X").
	Pausado       bool   `gorm:"default:false" json:"pausado"`
	MensagemPausa string `gorm:"size:300" json:"mensagem_pausa"`

	// Tema visual do cardápio público — não afeta o painel admin.
	// Valores válidos: kraft, oceano, floresta, rosa, noite, carvao, brasa, hortela
	Tema string `gorm:"size:20;default:'kraft'" json:"tema"`

	// Valor mínimo de pedido — 0 = sem restrição.
	ValorMinimoPedido float64 `gorm:"default:0" json:"valor_minimo_pedido"`

	// Modos de recebimento — o dono define quais aceita.
	// Pelo menos um dos dois deve estar ativo.
	AceitaRetirada bool    `gorm:"default:true" json:"aceita_retirada"`
	AceitaEntrega  bool    `gorm:"default:false" json:"aceita_entrega"`
	Endereco       string  `gorm:"size:300" json:"endereco"`
	Latitude       float64 `gorm:"default:0" json:"latitude"`
	Longitude      float64 `gorm:"default:0" json:"longitude"`

	// Cidade/Estado são capturados junto com Latitude/Longitude na
	// geocodificação do endereço da loja — usados pra decidir se um
	// destino de entrega de itens guardados está na mesma região
	// (cálculo por km) ou fora dela (estimativa por peso+distância).
	// Vêm como texto livre do Nominatim (ex: "Sergipe", não "SE") — o
	// que importa é bater com o mesmo formato retornado na geocodificação
	// do endereço de destino, não seguir um padrão de sigla.
	Cidade string `gorm:"size:100" json:"cidade"`
	Estado string `gorm:"size:100" json:"estado"`
	// Taxa de entrega:
	// "fixa"      → valor fixo definido pelo dono, somado ao total no checkout
	// "combinado" → cliente informa o endereço, dono combina o valor fora do sistema
	TaxaEntregaTipo  string  `gorm:"size:20;default:'combinado'" json:"taxa_entrega_tipo"`
	TaxaEntregaValor float64 `gorm:"default:0" json:"taxa_entrega_valor"`
	TaxaEntregaBase  float64 `gorm:"default:0" json:"taxa_entrega_base"`
	TaxaEntregaPorKm float64 `gorm:"default:0" json:"taxa_entrega_por_km"`

	// Mantido por compatibilidade — substituído por ModoPedido.
	// Será removido numa migration futura.
	PermiteMesmoDia bool `gorm:"default:false" json:"permite_mesmo_dia"`

	// AceitaGuardarEntregar: opt-in explícito pro fluxo de "guardar e
	// entregar depois" — a maioria das lojas de comida não vai querer
	// isso, então fica desligado por padrão.
	AceitaGuardarEntregar bool `gorm:"default:false" json:"aceita_guardar_entregar"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Loja) TableName() string {
	return "lojas"
}
