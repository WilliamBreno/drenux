package handler

import (
	"net/http"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type CategoriaHandler struct {
	categoriaService *service.CategoriaService
}

func NewCategoriaHandler(categoriaService *service.CategoriaService) *CategoriaHandler {
	return &CategoriaHandler{categoriaService: categoriaService}
}

func (h *CategoriaHandler) Listar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	categorias, err := h.categoriaService.Listar(lojaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, categorias)
}

type categoriaRequest struct {
	Nome string `json:"nome" binding:"required"`
}

func (h *CategoriaHandler) Criar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	var req categoriaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	categoria, err := h.categoriaService.Criar(lojaID, req.Nome)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, categoria)
}

func (h *CategoriaHandler) Atualizar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	categoriaID, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "id inválido"})
		return
	}

	var req categoriaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	categoria, err := h.categoriaService.Atualizar(lojaID, categoriaID, req.Nome)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, categoria)
}

func (h *CategoriaHandler) Deletar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	categoriaID, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "id inválido"})
		return
	}

	if err := h.categoriaService.Deletar(lojaID, categoriaID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
