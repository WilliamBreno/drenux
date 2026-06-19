package main

import (
	"log"

	"github.com/WilliamBreno/cardapio-backend/internal/config"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	router := gin.Default()

	// Rota simples só pra confirmar que o servidor está de pé. Útil
	// também depois pro Render usar como health check do serviço.
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	log.Printf("servidor rodando na porta %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("erro ao iniciar servidor: %v", err)
	}
}
