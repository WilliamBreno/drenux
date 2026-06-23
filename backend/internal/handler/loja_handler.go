package handler

import (
	"net/http"

	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type LojaHandler struct {
	lojaService *service.LojaService
}

func NewLojaHandler(lojaService *service.LojaService) *LojaHandler {
	return &LojaHandler{lojaService: lojaService}
}

// Buscar atende GET /admin/loja
func (h *LojaHandler) Buscar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")
	loja, err := h.lojaService.Buscar(lojaID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"erro": "loja não encontrada"})
		return
	}
	c.JSON(http.StatusOK, loja)
}

type configuracoesRequest struct {
	WhatsappNumero          string  `json:"whatsapp_numero" binding:"required"`
	LogoURL                 string  `json:"logo_url"`
	ModoPedido              string  `json:"modo_pedido"`
	AntecedenciaMinimaHoras int     `json:"antecedencia_minima_horas"`
	HorarioAbertura         string  `json:"horario_abertura"`
	HorarioFechamento       string  `json:"horario_fechamento"`
	MargemFechamentoMinutos int     `json:"margem_fechamento_minutos"`
	Pausado                 bool    `json:"pausado"`
	MensagemPausa           string  `json:"mensagem_pausa"`
	AceitaRetirada          bool    `json:"aceita_retirada"`
	AceitaEntrega           bool    `json:"aceita_entrega"`
	TaxaEntregaTipo         string  `json:"taxa_entrega_tipo"`
	TaxaEntregaValor        float64 `json:"taxa_entrega_valor"`
	ValorMinimoPedido       float64 `json:"valor_minimo_pedido"`
	Tema                    string  `json:"tema"`
}

// AtualizarConfiguracoes atende PUT /admin/loja
func (h *LojaHandler) AtualizarConfiguracoes(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	var req configuracoesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	modo := req.ModoPedido
	if modo == "" {
		modo = "imediato"
	}

	cfg := repository.ConfiguracoesLoja{
		WhatsappNumero:          req.WhatsappNumero,
		LogoURL:                 req.LogoURL,
		ModoPedido:              modo,
		AntecedenciaMinimaHoras: req.AntecedenciaMinimaHoras,
		HorarioAbertura:         req.HorarioAbertura,
		HorarioFechamento:       req.HorarioFechamento,
		MargemFechamentoMinutos: req.MargemFechamentoMinutos,
		Pausado:                 req.Pausado,
		MensagemPausa:           req.MensagemPausa,
		AceitaRetirada:          req.AceitaRetirada,
		AceitaEntrega:           req.AceitaEntrega,
		TaxaEntregaTipo:         req.TaxaEntregaTipo,
		TaxaEntregaValor:        req.TaxaEntregaValor,
		ValorMinimoPedido:       req.ValorMinimoPedido,
		Tema:                    req.Tema,
	}

	if err := h.lojaService.AtualizarConfiguracoes(lojaID, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sucesso": true})
}