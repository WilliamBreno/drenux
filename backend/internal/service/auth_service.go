package service

import (
	"errors"
	"fmt"
	"time"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db        *gorm.DB
	jwtSecret string
}

func NewAuthService(db *gorm.DB, jwtSecret string) *AuthService {
	return &AuthService{db: db, jwtSecret: jwtSecret}
}

type CadastroInput struct {
	Nome     string
	Email    string
	Senha    string
	NomeLoja string
}

// Cadastrar cria o usuário, a loja dele e as categorias padrão (Salgados,
// Doces) tudo dentro de uma única transação: se qualquer passo falhar,
// nada fica salvo pela metade.
func (s *AuthService) Cadastrar(input CadastroInput) (string, error) {
	senhaHash, err := bcrypt.GenerateFromPassword([]byte(input.Senha), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("gerando hash da senha: %w", err)
	}

	usuario := domain.Usuario{
		Nome:      input.Nome,
		Email:     input.Email,
		SenhaHash: string(senhaHash),
	}
	var loja domain.Loja

	err = s.db.Transaction(func(tx *gorm.DB) error {
		usuarioRepo := repository.NewUsuarioRepository(tx)
		lojaRepo := repository.NewLojaRepository(tx)
		categoriaRepo := repository.NewCategoriaRepository(tx)

		if err := usuarioRepo.Criar(&usuario); err != nil {
			return fmt.Errorf("não foi possível criar o usuário (email já cadastrado?): %w", err)
		}

		slug, err := gerarSlugUnico(lojaRepo, input.NomeLoja)
		if err != nil {
			return fmt.Errorf("gerando slug da loja: %w", err)
		}

		loja = domain.Loja{
			UsuarioID: usuario.ID,
			Nome:      input.NomeLoja,
			Slug:      slug,
		}
		if err := lojaRepo.Criar(&loja); err != nil {
			return fmt.Errorf("criando loja: %w", err)
		}

		categoriasPadrao := []domain.Categoria{
			{LojaID: loja.ID, Nome: "Salgados"},
			{LojaID: loja.ID, Nome: "Doces"},
		}
		if err := categoriaRepo.CriarVarias(categoriasPadrao); err != nil {
			return fmt.Errorf("criando categorias padrão: %w", err)
		}

		return nil
	})
	if err != nil {
		return "", err
	}

	return s.gerarToken(usuario.ID, loja.ID)
}

// Login confere email/senha e devolve um token novo.
//
// De propósito, usamos a mesma mensagem de erro tanto pra "email não
// existe" quanto pra "senha errada" — não queremos dar pista pra quem
// está tentando adivinhar quais emails estão cadastrados.
func (s *AuthService) Login(email, senha string) (string, error) {
	usuarioRepo := repository.NewUsuarioRepository(s.db)
	lojaRepo := repository.NewLojaRepository(s.db)

	usuario, err := usuarioRepo.BuscarPorEmail(email)
	if err != nil {
		return "", errors.New("email ou senha inválidos")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(usuario.SenhaHash), []byte(senha)); err != nil {
		return "", errors.New("email ou senha inválidos")
	}

	loja, err := lojaRepo.BuscarPorUsuarioID(usuario.ID)
	if err != nil {
		return "", errors.New("loja não encontrada para esse usuário")
	}

	return s.gerarToken(usuario.ID, loja.ID)
}

func (s *AuthService) gerarToken(usuarioID, lojaID uint) (string, error) {
	claims := jwt.MapClaims{
		"usuario_id": usuarioID,
		"loja_id":    lojaID,
		"exp":        time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

// gerarSlugUnico tenta o slug "limpo" primeiro; se já existir (duas lojas
// com nome parecido), vai acrescentando um número até achar um livre.
func gerarSlugUnico(lojaRepo *repository.LojaRepository, nomeLoja string) (string, error) {
	base := gerarSlug(nomeLoja)
	slug := base
	contador := 1

	for {
		existe, err := lojaRepo.SlugExiste(slug)
		if err != nil {
			return "", err
		}
		if !existe {
			return slug, nil
		}
		contador++
		slug = fmt.Sprintf("%s-%d", base, contador)
	}
}
