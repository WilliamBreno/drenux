package handler

import (
	"net/http"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type LojaHandler struct {
	lojaService *service.LojaService
}

func NewLojaHandler(lojaService *service.LojaService) *LojaHandler {
	return &LojaHandler{lojaService: lojaService}
}

// Buscar atende GET /admin/loja — devolve as configurações atuais da
// loja do token, pra preencher uma tela de "configurações" no painel.
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
	WhatsappNumero  string `json:"whatsapp_numero" binding:"required"`
	PermiteMesmoDia bool   `json:"permite_mesmo_dia"`
	LogoURL         string `json:"logo_url"`
}

// AtualizarConfiguracoes atende PUT /admin/loja.
func (h *LojaHandler) AtualizarConfiguracoes(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	var req configuracoesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	if err := h.lojaService.AtualizarConfiguracoes(lojaID, req.WhatsappNumero, req.PermiteMesmoDia, req.LogoURL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sucesso": true})
}