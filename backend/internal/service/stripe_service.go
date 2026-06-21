package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"strconv"
	"time"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/notification"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"github.com/stripe/stripe-go/v86"
	"gorm.io/gorm"
)

// TaxaPlataformaPercentual é a taxa que a plataforma retém de cada
// pedido pago (6%), aplicada no checkout via application_fee_amount.
const TaxaPlataformaPercentual = 6.0

type StripeService struct {
	client              *stripe.Client
	webhookSecret       string
	lojaRepo            *repository.LojaRepository
	pedidoRepo          *repository.PedidoRepository
	notificationSender  notification.NotificationSender
}

func NewStripeService(secretKey, webhookSecret string, db *gorm.DB, notificationSender notification.NotificationSender) *StripeService {
	return &StripeService{
		client:             stripe.NewClient(secretKey),
		webhookSecret:      webhookSecret,
		lojaRepo:           repository.NewLojaRepository(db),
		pedidoRepo:         repository.NewPedidoRepository(db),
		notificationSender: notificationSender,
	}
}

// IniciarOnboarding garante que a loja tem uma conta Stripe Connect tipo
// Express — cria uma na primeira vez, reaproveita se já existir — e
// devolve um link de onboarding de uso único pra redirecionar o dono da
// loja pro fluxo hospedado da própria Stripe.
func (s *StripeService) IniciarOnboarding(ctx context.Context, lojaID uint, returnURL, refreshURL string) (string, error) {
	loja, err := s.lojaRepo.BuscarPorID(lojaID)
	if err != nil {
		return "", errors.New("loja não encontrada")
	}

	accountID := loja.StripeAccountID
	if accountID == "" {
		accountParams := &stripe.AccountCreateParams{
			Type:    stripe.String(string(stripe.AccountTypeExpress)),
			Country: stripe.String("BR"),
		}
		account, err := s.client.V1Accounts.Create(ctx, accountParams)
		if err != nil {
			return "", fmt.Errorf("criando conta Stripe: %w", err)
		}
		accountID = account.ID

		if err := s.lojaRepo.AtualizarStripeAccountID(lojaID, accountID); err != nil {
			return "", fmt.Errorf("salvando conta Stripe: %w", err)
		}
	}

	linkParams := &stripe.AccountLinkCreateParams{
		Account:    stripe.String(accountID),
		Type:       stripe.String("account_onboarding"),
		ReturnURL:  stripe.String(returnURL),
		RefreshURL: stripe.String(refreshURL),
	}
	link, err := s.client.V1AccountLinks.Create(ctx, linkParams)
	if err != nil {
		return "", fmt.Errorf("gerando link de onboarding: %w", err)
	}

	return link.URL, nil
}

// StatusOnboarding diz se a loja já iniciou a conexão com a Stripe (tem
// um stripe_account_id salvo). Não confirma se a verificação terminou —
// isso a gente confere consultando a conta de verdade na Stripe, num
// passo futuro.
func (s *StripeService) StatusOnboarding(lojaID uint) (bool, error) {
	loja, err := s.lojaRepo.BuscarPorID(lojaID)
	if err != nil {
		return false, errors.New("loja não encontrada")
	}
	return loja.StripeAccountID != "", nil
}

// CriarCheckout monta uma sessão de pagamento Stripe Checkout pra um
// pedido específico, direcionada pra conta Connect da loja, com a taxa
// de plataforma já aplicada via application_fee_amount.
func (s *StripeService) CriarCheckout(ctx context.Context, pedidoID uint, frontendURL string) (string, error) {
	pedido, err := s.pedidoRepo.BuscarPorID(pedidoID)
	if err != nil {
		return "", errors.New("pedido não encontrado")
	}
	if pedido.Status != domain.StatusAguardandoPagamento {
		return "", errors.New("esse pedido já foi pago ou cancelado")
	}

	loja, err := s.lojaRepo.BuscarPorID(pedido.LojaID)
	if err != nil {
		return "", errors.New("loja não encontrada")
	}
	if loja.StripeAccountID == "" {
		return "", errors.New("essa loja ainda não conectou uma conta de pagamento")
	}

	// Depois de pagar (ou cancelar), o cliente volta pro próprio
	// cardápio da loja — sucesso mostra um aviso no topo (?pago=1), sem
	// precisar de uma página dedicada nova.
	successURL := fmt.Sprintf("%s/%s?pago=1", frontendURL, loja.Slug)
	cancelURL := fmt.Sprintf("%s/%s", frontendURL, loja.Slug)

	lineItems := make([]*stripe.CheckoutSessionCreateLineItemParams, 0, len(pedido.Itens))
	for _, item := range pedido.Itens {
		lineItems = append(lineItems, &stripe.CheckoutSessionCreateLineItemParams{
			Quantity: stripe.Int64(int64(item.Quantidade)),
			PriceData: &stripe.CheckoutSessionCreateLineItemPriceDataParams{
				Currency:   stripe.String("brl"),
				UnitAmount: stripe.Int64(int64(math.Round(item.PrecoUnit * 100))),
				ProductData: &stripe.CheckoutSessionCreateLineItemPriceDataProductDataParams{
					Name: stripe.String(item.ProdutoNome),
				},
			},
		})
	}

	// application_fee_amount é em centavos, igual o resto dos valores
	// monetários na API da Stripe.
	taxaPlataforma := int64(math.Round(pedido.Total * 100 * TaxaPlataformaPercentual / 100))

	params := &stripe.CheckoutSessionCreateParams{
		Mode:       stripe.String(string(stripe.CheckoutSessionModePayment)),
		LineItems:  lineItems,
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		PaymentIntentData: &stripe.CheckoutSessionCreatePaymentIntentDataParams{
			ApplicationFeeAmount: stripe.Int64(taxaPlataforma),
			TransferData: &stripe.CheckoutSessionCreatePaymentIntentDataTransferDataParams{
				Destination: stripe.String(loja.StripeAccountID),
			},
		},
		Metadata: map[string]string{
			"pedido_id": strconv.FormatUint(uint64(pedido.ID), 10),
		},
	}

	session, err := s.client.V1CheckoutSessions.Create(ctx, params)
	if err != nil {
		return "", fmt.Errorf("criando sessão de checkout: %w", err)
	}

	// Guarda o ID da sessão pra rastreabilidade. Se isso falhar, não
	// interrompe o fluxo — o cliente já tem a URL de pagamento válida, e
	// o webhook encontra o pedido certo de qualquer forma via metadata.
	if err := s.pedidoRepo.AtualizarStripeSessionID(pedido.ID, session.ID); err != nil {
		fmt.Printf("aviso: não foi possível salvar stripe_session_id do pedido %d: %v\n", pedido.ID, err)
	}

	return session.URL, nil
}

// ProcessarWebhook valida a assinatura do evento (garante que veio
// mesmo da Stripe, não de alguém forjando uma requisição) e, se for uma
// confirmação de pagamento, marca o pedido correspondente como pago.
func (s *StripeService) ProcessarWebhook(payload []byte, signature string) error {
	event, err := stripe.ConstructEvent(payload, signature, s.webhookSecret)
	if err != nil {
		return fmt.Errorf("assinatura do webhook inválida: %w", err)
	}

	if event.Type != "checkout.session.completed" {
		// Outros tipos de evento (a Stripe manda vários) não interessam
		// pra esse fluxo — ignora sem erro.
		return nil
	}

	var session stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
		return fmt.Errorf("lendo dados do evento: %w", err)
	}

	pedidoIDStr, ok := session.Metadata["pedido_id"]
	if !ok {
		return errors.New("evento sem pedido_id nos metadados")
	}

	pedidoID, err := strconv.ParseUint(pedidoIDStr, 10, 64)
	if err != nil {
		return fmt.Errorf("pedido_id inválido nos metadados: %w", err)
	}

	if err := s.pedidoRepo.AtualizarStatus(uint(pedidoID), domain.StatusPago); err != nil {
		return fmt.Errorf("atualizando status do pedido %d: %w", pedidoID, err)
	}

	s.notificarPagamento(uint(pedidoID))

	return nil
}

// notificarPagamento dispara as duas mensagens de WhatsApp em
// goroutines separadas — a Stripe espera resposta rápida do webhook
// (idealmente < 10s), e uma falha ao enviar WhatsApp não deve travar a
// confirmação do pagamento, que já está garantida nesse ponto.
func (s *StripeService) notificarPagamento(pedidoID uint) {
	if s.notificationSender == nil {
		log.Printf("WhatsApp não conectado — pedido %d foi pago mas a notificação foi pulada", pedidoID)
		return
	}

	pedido, err := s.pedidoRepo.BuscarPorID(pedidoID)
	if err != nil {
		log.Printf("não foi possível recarregar pedido %d pra notificar: %v", pedidoID, err)
		return
	}

	loja, err := s.lojaRepo.BuscarPorID(pedido.LojaID)
	if err != nil {
		log.Printf("não foi possível carregar loja do pedido %d pra notificar: %v", pedidoID, err)
		return
	}

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := s.notificationSender.EnviarConfirmacaoPedido(ctx, pedido, loja.Nome); err != nil {
			log.Printf("falha ao notificar cliente do pedido %d: %v", pedido.ID, err)
		}
	}()

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := s.notificationSender.EnviarNotificacaoAdmin(ctx, pedido, loja.Nome, loja.WhatsappNumero); err != nil {
			log.Printf("falha ao notificar admin do pedido %d: %v", pedido.ID, err)
		}
	}()
}