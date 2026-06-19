package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// Config centraliza a leitura de variáveis de ambiente. Em vez de
// espalhar os.Getenv pelo código, todo mundo pede uma *Config.
type Config struct {
	Port          string
	DatabaseURL   string
	AdminWhatsapp string
}

func Load() *Config {
	// Em produção (Render) as variáveis já vêm definidas no ambiente, então
	// não tem problema o arquivo .env não existir — só avisamos no log,
	// não derrubamos a aplicação.
	if err := godotenv.Load(); err != nil {
		log.Println("aviso: .env não encontrado, lendo variáveis do ambiente do sistema")
	}

	cfg := &Config{
		Port:          getEnv("PORT", "8080"),
		DatabaseURL:   getEnv("DATABASE_URL", ""),
		AdminWhatsapp: getEnv("ADMIN_WHATSAPP", ""),
	}

	if cfg.DatabaseURL == "" {
		log.Println("aviso: DATABASE_URL não definida (vamos precisar dela já na próxima etapa)")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
