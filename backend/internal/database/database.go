package database

import (
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect abre a conexão com o PostgreSQL via GORM e confirma que está
// respondendo de verdade antes de devolver pro resto da aplicação.
func Connect(databaseURL string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		// Warn = só loga avisos, queries lentas e erros — não cada SELECT.
		// Durante debug pontual, troque pra logger.Info pra ver cada query.
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("conectando ao banco: %w", err)
	}

	// gorm.Open não testa a conexão de verdade (é "preguiçoso" — só
	// conecta na primeira query). Pegamos o *sql.DB nativo e damos um
	// Ping pra falhar já no startup se o banco estiver fora do ar, em vez
	// de falhar silenciosamente na primeira requisição de um usuário.
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("obtendo conexão sql nativa: %w", err)
	}

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping no banco falhou: %w", err)
	}

	return db, nil
}