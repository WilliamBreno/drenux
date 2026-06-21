package handler

import (
	"net/http"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type CatalogoHandler struct {
	catalogoService *service.CatalogoService
}

func NewCatalogoHandler(catalogoService *service.CatalogoService) *CatalogoHandler {
	return &CatalogoHandler{catalogoService: catalogoService}
}

// BuscarCardapio atende GET /lojas/:slug — rota pública, sem autenticação.
// É o que o cliente final acessa pra ver o cardápio de uma loja.
func (h *CatalogoHandler) BuscarCardapio(c *gin.Context) {
	slug := c.Param("slug")

	cardapio, err := h.catalogoService.BuscarCardapioPorSlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"loja": gin.H{
			"nome":              cardapio.Loja.Nome,
			"slug":              cardapio.Loja.Slug,
			"permite_mesmo_dia": cardapio.Loja.PermiteMesmoDia,
			"logo_url":          cardapio.Loja.LogoURL,
		},
		"categorias": cardapio.Categorias,
		"produtos":   cardapio.Produtos,
	})
}