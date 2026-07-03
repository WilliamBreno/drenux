package repository

import (
	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"gorm.io/gorm"
)

type UsuarioRepository struct {
	db *gorm.DB
}

// NewUsuarioRepository recebe um *gorm.DB — pode ser a conexão principal
// ou uma transação (tx). Como uma transação do GORM também é um *gorm.DB,
// esse mesmo repositório funciona dos dois jeitos sem precisar duplicar
// código.
func NewUsuarioRepository(db *gorm.DB) *UsuarioRepository {
	return &UsuarioRepository{db: db}
}

func (r *UsuarioRepository) Criar(usuario *domain.Usuario) error {
	return r.db.Create(usuario).Error
}

func (r *UsuarioRepository) BuscarPorEmail(email string) (*domain.Usuario, error) {
	var usuario domain.Usuario
	if err := r.db.Where("email = ?", email).First(&usuario).Error; err != nil {
		return nil, err
	}
	return &usuario, nil
}
