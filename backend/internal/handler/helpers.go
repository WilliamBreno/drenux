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