package handler

import (
	"fmt"
	"net/http"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type AfiliadoHandler struct {
	afiliadoService *service.AfiliadoService
	frontendURL     string
}

func NewAfiliadoHandler(afiliadoService *service.AfiliadoService, frontendURL string) *AfiliadoHandler {
	return &AfiliadoHandler{afiliadoService: afiliadoService, frontendURL: frontendURL}
}

type afiliadoLoginRequest struct {
	Email string `json:"email" binding:"required,email"`
	Senha string `json:"senha" binding:"required"`
}

// Login atende POST /afiliados/login — rota pública, separada do login
// de dono de loja (o afiliado não tem uma "loja", tem um painel próprio).
func (h *AfiliadoHandler) Login(c *gin.Context) {
	var req afiliadoLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	token, err := h.afiliadoService.Login(req.Email, req.Senha)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": token})
}

// Dashboard atende GET /afiliado/dashboard — protegida pelo token do
// próprio afiliado (claim "afiliado_id").
func (h *AfiliadoHandler) Dashboard(c *gin.Context) {
	afiliadoID := c.GetUint("afiliado_id")
	dados, err := h.afiliadoService.Dashboard(afiliadoID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, dados)
}

// IniciarOnboarding atende POST /afiliado/stripe/onboarding.
func (h *AfiliadoHandler) IniciarOnboarding(c *gin.Context) {
	afiliadoID := c.GetUint("afiliado_id")
	returnURL := fmt.Sprintf("%s/afiliado/dashboard", h.frontendURL)
	link, err := h.afiliadoService.IniciarOnboarding(c.Request.Context(), afiliadoID, returnURL, returnURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"url": link})
}