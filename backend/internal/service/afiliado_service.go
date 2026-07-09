package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stripe/stripe-go/v86"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AfiliadoService struct {
	db           *gorm.DB
	jwtSecret    string
	afiliadoRepo *repository.AfiliadoRepository
	stripeClient *stripe.Client
}

func NewAfiliadoService(db *gorm.DB, jwtSecret, stripeSecretKey string) *AfiliadoService {
	return &AfiliadoService{
		db:           db,
		jwtSecret:    jwtSecret,
		afiliadoRepo: repository.NewAfiliadoRepository(db),
		stripeClient: stripe.NewClient(stripeSecretKey),
	}
}

// Login confere email/senha do afiliado e devolve um token JWT próprio,
// separado do token de dono de loja (claim "afiliado_id" em vez de
// "usuario_id"/"loja_id").
func (s *AfiliadoService) Login(email, senha string) (string, error) {
	afiliado, err := s.afiliadoRepo.BuscarPorEmail(email)
	if err != nil {
		return "", errors.New("email ou senha inválidos")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(afiliado.SenhaHash), []byte(senha)); err != nil {
		return "", errors.New("email ou senha inválidos")
	}
	return s.gerarToken(afiliado.ID)
}

func (s *AfiliadoService) gerarToken(afiliadoID uint) (string, error) {
	claims := jwt.MapClaims{
		"afiliado_id": afiliadoID,
		"exp":         time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.jwtSecret))
}

// DashboardAfiliado agrega o que o painel do afiliado precisa mostrar:
// lojas indicadas, total já ganho, e se a conta Stripe já foi conectada.
type DashboardAfiliado struct {
	Lojas           []domain.Loja `json:"lojas"`
	TotalGanho      float64       `json:"total_ganho"`
	StripeConectado bool          `json:"stripe_conectado"`
}

func (s *AfiliadoService) Dashboard(afiliadoID uint) (*DashboardAfiliado, error) {
	afiliado, err := s.afiliadoRepo.BuscarPorID(afiliadoID)
	if err != nil {
		return nil, errors.New("afiliado não encontrado")
	}
	lojas, err := s.afiliadoRepo.ListarLojasIndicadas(afiliadoID)
	if err != nil {
		return nil, err
	}
	total, err := s.afiliadoRepo.SomarComissoes(afiliadoID)
	if err != nil {
		return nil, err
	}
	return &DashboardAfiliado{
		Lojas:           lojas,
		TotalGanho:      total,
		StripeConectado: afiliado.StripeAccountID != "",
	}, nil
}

// IniciarOnboarding cria (se ainda não existir) a conta Stripe Connect
// Express do afiliado e devolve o link de onboarding — mesmo padrão já
// usado pelas lojas em StripeService.IniciarOnboarding.
func (s *AfiliadoService) IniciarOnboarding(ctx context.Context, afiliadoID uint, returnURL, refreshURL string) (string, error) {
	afiliado, err := s.afiliadoRepo.BuscarPorID(afiliadoID)
	if err != nil {
		return "", errors.New("afiliado não encontrado")
	}

	accountID := afiliado.StripeAccountID
	if accountID == "" {
		accountParams := &stripe.AccountCreateParams{
			Type:    stripe.String(string(stripe.AccountTypeExpress)),
			Country: stripe.String("BR"),
		}
		account, err := s.stripeClient.V1Accounts.Create(ctx, accountParams)
		if err != nil {
			return "", fmt.Errorf("criando conta Stripe do afiliado: %w", err)
		}
		accountID = account.ID
		if err := s.afiliadoRepo.AtualizarStripeAccountID(afiliadoID, accountID); err != nil {
			return "", fmt.Errorf("salvando conta Stripe do afiliado: %w", err)
		}
	}

	linkParams := &stripe.AccountLinkCreateParams{
		Account:    stripe.String(accountID),
		Type:       stripe.String("account_onboarding"),
		ReturnURL:  stripe.String(returnURL),
		RefreshURL: stripe.String(refreshURL),
	}
	link, err := s.stripeClient.V1AccountLinks.Create(ctx, linkParams)
	if err != nil {
		return "", fmt.Errorf("gerando link de onboarding do afiliado: %w", err)
	}
	return link.URL, nil
}