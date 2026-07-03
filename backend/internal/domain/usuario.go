package domain

import "time"

// Usuario é o dono de uma loja, com login na área administrativa.
type Usuario struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Nome      string    `gorm:"size:100;not null" json:"nome"`
	Email     string    `gorm:"size:150;not null;unique" json:"email"`
	SenhaHash string    `gorm:"size:255;not null" json:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// TableName fixa o nome da tabela explicitamente, em vez de depender da
// pluralização automática do GORM (que segue regras de inglês e erra com
// algumas palavras em português — foi exatamente o que aconteceu com
// Categoria).
func (Usuario) TableName() string {
	return "usuarios"
}
