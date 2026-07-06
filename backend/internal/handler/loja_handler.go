package handler

import (
	"log"
	"net/http"

	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type LojaHandler struct {
	lojaService      *service.LojaService
	distanciaService *service.DistanciaService
}

func NewLojaHandler(lojaService *service.LojaService, distanciaService *service.DistanciaService) *LojaHandler {
	return &LojaHandler{
		lojaService:      lojaService,
		distanciaService: distanciaService,
	}
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
	TaxaEntregaBase         float64 `json:"taxa_entrega_base"`
	TaxaEntregaPorKm        float64 `json:"taxa_entrega_por_km"`
	ValorMinimoPedido       float64 `json:"valor_minimo_pedido"`
	Tema                    string  `json:"tema"`
	Endereco                string  `json:"endereco"`
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

	// Se o dono escolheu o modo "por_km" e informou um endereço, geocodifica
	// pra descobrir a latitude/longitude — é isso que o cálculo de frete
	// usa como ponto de partida. Se a geocodificação falhar, não travamos
	// o salvamento das outras configurações — só avisamos no log e deixa
	// lat/lng como 0 (o endpoint de cotação já rejeita cotações nesse caso,
	// com uma mensagem clara pro dono configurar de novo).
	var latitude, longitude float64
	if req.TaxaEntregaTipo == "por_km" && req.Endereco != "" {
		coordenada, err := h.distanciaService.Geocodificar(req.Endereco)
		if err != nil {
			log.Printf("aviso: não foi possível geocodificar endereço da loja %d: %v", lojaID, err)
		} else {
			latitude = coordenada.Latitude
			longitude = coordenada.Longitude
		}
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
		TaxaEntregaBase:         req.TaxaEntregaBase,
		TaxaEntregaPorKm:        req.TaxaEntregaPorKm,
		ValorMinimoPedido:       req.ValorMinimoPedido,
		Tema:                    req.Tema,
		Endereco:                req.Endereco,
		Latitude:                latitude,
		Longitude:               longitude,
	}

	if err := h.lojaService.AtualizarConfiguracoes(lojaID, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sucesso": true})
}