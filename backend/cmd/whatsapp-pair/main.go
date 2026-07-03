// Comando standalone: roda o pareamento inicial do número de WhatsApp da
// plataforma via QR code. Use uma única vez, apontando pra mesma
// DATABASE_URL que o serviço principal usa (a sessão fica salva no
// Postgres compartilhado).
//
// Uso:
//
//	go run ./cmd/whatsapp-pair
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/WilliamBreno/cardapio-backend/internal/notification"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load() // mesmo comportamento do servidor principal: usa .env se existir

	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		fmt.Println("Defina a variável de ambiente DATABASE_URL antes de rodar")
		os.Exit(1)
	}

	if err := notification.Pair(context.Background(), connString); err != nil {
		fmt.Println("Erro ao parear:", err)
		os.Exit(1)
	}

	fmt.Println("Pareado com sucesso! Pode encerrar esse processo (Ctrl+C) e subir o serviço principal normalmente.")
}
