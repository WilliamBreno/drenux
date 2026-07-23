package handler

import (
	"net/http"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type GrupoCorHandler struct {
	grupoCorService *service.GrupoCorService
}

func NewGrupoCorHandler(grupoCorService *service.GrupoCorService) *GrupoCorHandler {
	return &GrupoCorHandler{grupoCorService: grupoCorService}
}

// Listar atende GET /admin/grupos-cor — devolve todos os grupos de cor da
// loja de uma vez, pelo mesmo motivo do SubcategoriaHandler.Listar.
func (h *GrupoCorHandler) Listar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	gruposCor, err := h.grupoCorService.ListarPorLoja(lojaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gruposCor)
}

type grupoCorRequest struct {
	Nome string `json:"nome" binding:"required"`
}

// Criar atende POST /admin/subcategorias/:subcategoriaId/grupos-cor
func (h *GrupoCorHandler) Criar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	subcategoriaID, err := parseSubcategoriaIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "subcategoria_id inválido"})
		return
	}

	var req grupoCorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	grupoCor, err := h.grupoCorService.Criar(lojaID, subcategoriaID, req.Nome)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, grupoCor)
}

// Atualizar atende PUT /admin/grupos-cor/:id
func (h *GrupoCorHandler) Atualizar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	grupoCorID, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "id inválido"})
		return
	}

	var req grupoCorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	grupoCor, err := h.grupoCorService.Atualizar(lojaID, grupoCorID, req.Nome)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.JSON(http.StatusOK, grupoCor)
}

// Deletar atende DELETE /admin/grupos-cor/:id
func (h *GrupoCorHandler) Deletar(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	grupoCorID, err := parseIDParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "id inválido"})
		return
	}

	if err := h.grupoCorService.Deletar(lojaID, grupoCorID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
