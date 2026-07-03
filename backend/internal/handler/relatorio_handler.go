package handler

import (
	"net/http"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type RelatorioHandler struct {
	relatorioService *service.RelatorioService
	cronSecret       string
}

func NewRelatorioHandler(relatorioService *service.RelatorioService, cronSecret string) *RelatorioHandler {
	return &RelatorioHandler{
		relatorioService: relatorioService,
		cronSecret:       cronSecret,
	}
}

// EnviarSemanal atende POST /relatorio/semanal — chamado pelo cron-job.org
// todo domingo. Protegido por um secret no header pra evitar chamadas não
// autorizadas (qualquer um que soubesse a URL poderia disparar envios).
func (h *RelatorioHandler) EnviarSemanal(c *gin.Context) {
	if h.cronSecret != "" && c.GetHeader("X-Cron-Secret") != h.cronSecret {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": "não autorizado"})
		return
	}

	enviados, erros := h.relatorioService.EnviarRelatoriosSemana(c.Request.Context())

	c.JSON(http.StatusOK, gin.H{
		"enviados": enviados,
		"erros":    erros,
	})
}
