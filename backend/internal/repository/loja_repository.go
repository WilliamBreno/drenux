package repository

import (
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type LojaRepository struct {
	db *gorm.DB
}

func NewLojaRepository(db *gorm.DB) *LojaRepository {
	return &LojaRepository{db: db}
}

func (r *LojaRepository) Criar(loja *domain.Loja) error {
	return r.db.Create(loja).Error
}

func (r *LojaRepository) BuscarPorUsuarioID(usuarioID uint) (*domain.Loja, error) {
	var loja domain.Loja
	if err := r.db.Where("usuario_id = ?", usuarioID).First(&loja).Error; err != nil {
		return nil, err
	}
	return &loja, nil
}

func (r *LojaRepository) BuscarPorID(id uint) (*domain.Loja, error) {
	var loja domain.Loja
	if err := r.db.First(&loja, id).Error; err != nil {
		return nil, err
	}
	return &loja, nil
}

// AtualizarStripeAccountID grava o ID da conta Stripe Connect da loja,
// gerado na primeira vez que o onboarding é iniciado.
func (r *LojaRepository) AtualizarStripeAccountID(lojaID uint, stripeAccountID string) error {
	return r.db.Model(&domain.Loja{}).Where("id = ?", lojaID).Update("stripe_account_id", stripeAccountID).Error
}

// ConfiguracoesLoja agrupa todos os campos editáveis pelo dono no painel.
type ConfiguracoesLoja struct {
	WhatsappNumero          string
	LogoURL                 string
	ModoPedido              string
	AntecedenciaMinimaHoras int
	HorarioAbertura         string
	HorarioFechamento       string
	MargemFechamentoMinutos int
	Pausado                 bool
	MensagemPausa           string
	AceitaRetirada          bool
	AceitaEntrega           bool
	TaxaEntregaTipo         string
	TaxaEntregaValor        float64
	TaxaEntregaBase         float64
	TaxaEntregaPorKm        float64
	ValorMinimoPedido       float64
	Tema                    string
	AceitaGuardarEntregar   bool

	// Endereço de origem da loja, usado como ponto de partida no cálculo
	// de frete por quilometragem e no fluxo de guardar/entregar depois.
	// Latitude/Longitude/Cidade/Estado são preenchidas pelo handler (via
	// geocodificação) antes de chegar aqui — esse repositório só grava o
	// que já vier pronto.
	Endereco  string
	Latitude  float64
	Longitude float64
	Cidade    string
	Estado    string
}

// AtualizarConfiguracoes grava todos os campos editáveis da loja de uma vez.
func (r *LojaRepository) AtualizarConfiguracoes(lojaID uint, cfg ConfiguracoesLoja) error {
	return r.db.Model(&domain.Loja{}).Where("id = ?", lojaID).Updates(map[string]interface{}{
		"whatsapp_numero":           cfg.WhatsappNumero,
		"logo_url":                  cfg.LogoURL,
		"modo_pedido":               cfg.ModoPedido,
		"antecedencia_minima_horas": cfg.AntecedenciaMinimaHoras,
		"horario_abertura":          cfg.HorarioAbertura,
		"horario_fechamento":        cfg.HorarioFechamento,
		"margem_fechamento_minutos": cfg.MargemFechamentoMinutos,
		"pausado":                   cfg.Pausado,
		"mensagem_pausa":            cfg.MensagemPausa,
		"aceita_retirada":           cfg.AceitaRetirada,
		"aceita_entrega":            cfg.AceitaEntrega,
		"taxa_entrega_tipo":         cfg.TaxaEntregaTipo,
		"taxa_entrega_valor":        cfg.TaxaEntregaValor,
		"taxa_entrega_base":         cfg.TaxaEntregaBase,
		"taxa_entrega_por_km":       cfg.TaxaEntregaPorKm,
		"valor_minimo_pedido":       cfg.ValorMinimoPedido,
		"tema":                      cfg.Tema,
		"aceita_guardar_entregar":   cfg.AceitaGuardarEntregar,
		"endereco":                  cfg.Endereco,
		"latitude":                  cfg.Latitude,
		"longitude":                 cfg.Longitude,
		"cidade":                    cfg.Cidade,
		"estado":                    cfg.Estado,
	}).Error
}

// BuscarPorSlug é usado pelo cardápio público — é assim que o cliente
// final acessa a loja, sem precisar saber o ID interno dela.
func (r *LojaRepository) BuscarPorSlug(slug string) (*domain.Loja, error) {
	var loja domain.Loja
	if err := r.db.Where("slug = ?", slug).First(&loja).Error; err != nil {
		return nil, err
	}
	return &loja, nil
}

// ListarComWhatsapp retorna todas as lojas que têm número de WhatsApp
// configurado — usada pelo relatório semanal pra saber quem notificar.
func (r *LojaRepository) ListarComWhatsapp() ([]domain.Loja, error) {
	var lojas []domain.Loja
	if err := r.db.Where("whatsapp_numero != ''").Find(&lojas).Error; err != nil {
		return nil, err
	}
	return lojas, nil
}

// SlugExiste confere se um slug já está em uso, pra geração de slug único
// no cadastro.
func (r *LojaRepository) SlugExiste(slug string) (bool, error) {
	var total int64
	if err := r.db.Model(&domain.Loja{}).Where("slug = ?", slug).Count(&total).Error; err != nil {
		return false, err
	}
	return total > 0, nil
}
