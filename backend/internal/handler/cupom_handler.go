package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type CupomHandler struct {
	cupomService *service.CupomService
}

func NewCupomHandler(cupomService *service.CupomService) *CupomHandler {
	return &CupomHandler{cupomService: cupomService}
}

// Validar atende POST /lojas/:slug/cupons/validar — público.
// O cliente chama isso antes de confirmar o pedido pra saber o desconto.
func (h *CupomHandler) Validar(c *gin.Context) {
	lojaID := c.GetUint("loja_id_publico")

	var req struct {
		Codigo   string  `json:"codigo" binding:"required"`
		Subtotal float64 `json:"subtotal" binding:"required,gt=0"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	resultado, err := h.cupomService.Validar(req.Codigo, lojaID, req.Subtotal)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valido":   true,
		"desconto": resultado.Desconto,
		"tipo":     resultado.Cupom.Tipo,
		"valor":    resultado.Cupom.Valor,
	})
}

type cupomRequest struct {
	Codigo            string     `json:"codigo" binding:"required"`
	Tipo              string     `json:"tipo" binding:"required"`
	Valor             float64    `json:"valor" binding:"required,gt=0"`
	Ativo             bool       `json:"ativo"`
	UsoMaximo         *int       `json:"uso_maximo"`
	Validade          *time.Time `json:"validade"`
	ValorMinimoPedido float64    `json:"valor_minimo_pedido"`
}

func (h *CupomHandler) Listar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")
	cupons, err := h.cupomService.Listar(lojaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cupons)
}

func (h *CupomHandler) Criar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")
	var req cupomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	cupom, err := h.cupomService.Criar(lojaID, service.CupomInput{
		Codigo:            req.Codigo,
		Tipo:              req.Tipo,
		Valor:             req.Valor,
		Ativo:             req.Ativo,
		UsoMaximo:         req.UsoMaximo,
		Validade:          req.Validade,
		ValorMinimoPedido: req.ValorMinimoPedido,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, cupom)
}

func (h *CupomHandler) Atualizar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "id inválido"})
		return
	}

	var req cupomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	cupom, err := h.cupomService.Atualizar(uint(id), lojaID, service.CupomInput{
		Codigo:            req.Codigo,
		Tipo:              req.Tipo,
		Valor:             req.Valor,
		Ativo:             req.Ativo,
		UsoMaximo:         req.UsoMaximo,
		Validade:          req.Validade,
		ValorMinimoPedido: req.ValorMinimoPedido,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cupom)
}

func (h *CupomHandler) Deletar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "id inválido"})
		return
	}

	if err := h.cupomService.Deletar(uint(id), lojaID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}