package handler

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// parseIDParam lê o parâmetro :id da URL e converte pra uint.
func parseIDParam(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(id), nil
}

// parseCategoriaIDParam lê o parâmetro :categoriaId da URL.
func parseCategoriaIDParam(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("categoriaId"), 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(id), nil
}

// parseSubcategoriaIDParam lê o parâmetro :subcategoriaId da URL.
func parseSubcategoriaIDParam(c *gin.Context) (uint, error) {
	id, err := strconv.ParseUint(c.Param("subcategoriaId"), 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(id), nil
}
