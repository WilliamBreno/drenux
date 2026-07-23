package handler

import (
	"net/http"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type SubcategoriaHandler struct {
	subcategoriaService *service.SubcategoriaService
}

func NewSubcategoriaHandler(subcategoriaService *service.SubcategoriaService) *SubcategoriaHandler {
	return &SubcategoriaHandler{subcategoriaService: subcategoriaService}
}

// Listar atende GET /admin/subcategorias — devolve todas as subcategorias
// da loja de uma vez, já que o admin monta a hierarquia completa
// Categoria → Subcategoria → Grupo de Cor de uma tacada só.
func (h *SubcategoriaHandler) Listar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	subcategorias, err := h.subcategoriaService.ListarPorLoja(lojaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, subcategorias)
}

type subcategoriaRequest struct {
	Nome string `json:"nome" binding:"required"`
}

// Criar atende POST /admin/categorias/:categoriaId/subcategorias
func (h *SubcategoriaHandler) Criar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	categoriaID, err := parseCategoriaIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "categoria_id inválido"})
		return
	}

	var req subcategoriaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	subcategoria, err := h.subcategoriaService.Criar(lojaID, categoriaID, req.Nome)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, subcategoria)
}

// Atualizar atende PUT /admin/subcategorias/:id
func (h *SubcategoriaHandler) Atualizar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	subcategoriaID, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "id inválido"})
		return
	}

	var req subcategoriaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	subcategoria, err := h.subcategoriaService.Atualizar(lojaID, subcategoriaID, req.Nome)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, subcategoria)
}

// Deletar atende DELETE /admin/subcategorias/:id
func (h *SubcategoriaHandler) Deletar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	subcategoriaID, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "id inválido"})
		return
	}

	if err := h.subcategoriaService.Deletar(lojaID, subcategoriaID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
