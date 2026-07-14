package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/notification"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"github.com/stripe/stripe-go/v86"
	"gorm.io/gorm"
)

// TaxaPlataformaPercentual é a taxa que a plataforma retém de cada
// pedido pago (8%), aplicada no checkout via application_fee_amount.
const TaxaPlataformaPercentual = 8.0

// ComissaoAfiliadoPercentual é o repasse automático pro afiliado que
// indicou a loja, quando existir.
const ComissaoAfiliadoPercentual = 3.01

// valoresMensalidadePlano define o preço mensal (em reais) de cada plano
// pago. O plano Start não entra aqui — não tem mensalidade.
var valoresMensalidadePlano = map[string]float64{
	"pro":   129.0,
	"scale": 349.0,
}

type StripeService struct {
	client             *stripe.Client
	secretKey          string
	webhookSecret      string
	db                 *gorm.DB
	lojaRepo           *repository.LojaRepository
	pedidoRepo         *repository.PedidoRepository
	solicitacaoRepo    *repository.SolicitacaoEntregaRepository
	afiliadoRepo       *repository.AfiliadoRepository
	assinaturaRepo     *repository.AssinaturaPendenteRepository
	notificationSender notification.NotificationSender
	emailSender        *notification.EmailSender
	frontendURL        string
}

func NewStripeService(secretKey, webhookSecret string, db *gorm.DB, notificationSender notification.NotificationSender, emailSender *notification.EmailSender, frontendURL string) *StripeService {
	return &StripeService{
		client:             stripe.NewClient(secretKey),
		secretKey:          secretKey,
		webhookSecret:      webhookSecret,
		db:                 db,
		lojaRepo:           repository.NewLojaRepository(db),
		pedidoRepo:         repository.NewPedidoRepository(db),
		solicitacaoRepo:    repository.NewSolicitacaoEntregaRepository(db),
		afiliadoRepo:       repository.NewAfiliadoRepository(db),
		assinaturaRepo:     repository.NewAssinaturaPendenteRepository(db),
		notificationSender: notificationSender,
		emailSender:        emailSender,
		frontendURL:        frontendURL,
	}
}

// IniciarOnboarding garante que a loja tem uma conta Stripe Connect tipo
// Express — cria uma na primeira vez, reaproveita se já existir — e
// devolve um link de onboarding de uso único.
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

func (s *StripeService) StatusOnboarding(lojaID uint) (bool, error) {
	loja, err := s.lojaRepo.BuscarPorID(lojaID)
	if err != nil {
		return false, errors.New("loja não encontrada")
	}
	return loja.StripeAccountID != "", nil
}

// CriarCheckout monta uma sessão de pagamento Stripe Checkout pra um
// pedido específico, direcionada pra conta Connect da loja.
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

	// Comissão da plataforma varia por plano da loja — Start continua
	// nos 8% de sempre; Pro/Scale usam a taxa reduzida acordada.
	taxaPercentual := TaxaPlataformaPercentual
	switch loja.Plano {
	case "pro":
		taxaPercentual = 4.0
	case "scale":
		taxaPercentual = 1.5
	}
	taxaPlataforma := int64(math.Round(pedido.Total * 100 * taxaPercentual / 100))

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

	if err := s.pedidoRepo.AtualizarStripeSessionID(pedido.ID, session.ID); err != nil {
		fmt.Printf("aviso: não foi possível salvar stripe_session_id do pedido %d: %v\n", pedido.ID, err)
	}

	return session.URL, nil
}

// CriarCheckoutFrete monta uma sessão de pagamento Stripe Checkout pro
// frete de uma SolicitacaoEntrega.
func (s *StripeService) CriarCheckoutFrete(ctx context.Context, solicitacaoID uint, frontendURL string) (string, error) {
	solicitacao, err := s.solicitacaoRepo.BuscarPorID(solicitacaoID)
	if err != nil {
		return "", errors.New("solicitação de entrega não encontrada")
	}
	if solicitacao.Status != domain.StatusSolicitacaoAguardandoPagamento {
		return "", errors.New("essa solicitação já foi paga ou cancelada")
	}

	loja, err := s.lojaRepo.BuscarPorID(solicitacao.LojaID)
	if err != nil {
		return "", errors.New("loja não encontrada")
	}
	if loja.StripeAccountID == "" {
		return "", errors.New("essa loja ainda não conectou uma conta de pagamento")
	}

	successURL := fmt.Sprintf("%s/%s?frete_pago=1", frontendURL, loja.Slug)
	cancelURL := fmt.Sprintf("%s/%s", frontendURL, loja.Slug)

	params := &stripe.CheckoutSessionCreateParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
		LineItems: []*stripe.CheckoutSessionCreateLineItemParams{
			{
				Quantity: stripe.Int64(1),
				PriceData: &stripe.CheckoutSessionCreateLineItemPriceDataParams{
					Currency:   stripe.String("brl"),
					UnitAmount: stripe.Int64(int64(math.Round(solicitacao.ValorFrete * 100))),
					ProductData: &stripe.CheckoutSessionCreateLineItemPriceDataProductDataParams{
						Name: stripe.String("Frete — entrega de itens guardados"),
					},
				},
			},
		},
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		PaymentIntentData: &stripe.CheckoutSessionCreatePaymentIntentDataParams{
			TransferData: &stripe.CheckoutSessionCreatePaymentIntentDataTransferDataParams{
				Destination: stripe.String(loja.StripeAccountID),
			},
		},
		Metadata: map[string]string{
			"solicitacao_id": strconv.FormatUint(uint64(solicitacao.ID), 10),
		},
	}

	session, err := s.client.V1CheckoutSessions.Create(ctx, params)
	if err != nil {
		return "", fmt.Errorf("criando sessão de checkout do frete: %w", err)
	}

	if err := s.solicitacaoRepo.AtualizarStripeSessionID(solicitacao.ID, session.ID); err != nil {
		fmt.Printf("aviso: não foi possível salvar stripe_session_id da solicitação %d: %v\n", solicitacao.ID, err)
	}

	return session.URL, nil
}

// obterOuCriarPriceAssinatura acha (ou cria, na primeira vez) o Price
// recorrente de um plano pago, usando lookup_key como identificador
// estável — evita duplicar Product/Price a cada assinatura nova.
//
// A busca é feita via chamada HTTP direta à API da Stripe (em vez do
// iterador do SDK) — mais simples e previsível que acompanhar a API de
// listagem genérica do client tipado.
func (s *StripeService) obterOuCriarPriceAssinatura(ctx context.Context, plano string) (string, error) {
	lookupKey := fmt.Sprintf("drenux_%s_mensal", plano)

	priceID, err := s.buscarPricePorLookupKey(ctx, lookupKey)
	if err != nil {
		return "", fmt.Errorf("buscando price existente: %w", err)
	}
	if priceID != "" {
		return priceID, nil
	}

	valorMensal, ok := valoresMensalidadePlano[plano]
	if !ok {
		return "", fmt.Errorf("plano %q não tem mensalidade configurada", plano)
	}

	nomeProduto := fmt.Sprintf("Drenux %s%s", strings.ToUpper(plano[:1]), plano[1:])
	product, err := s.client.V1Products.Create(ctx, &stripe.ProductCreateParams{
		Name: stripe.String(nomeProduto),
	})
	if err != nil {
		return "", fmt.Errorf("criando produto Stripe pro plano %s: %w", plano, err)
	}

	price, err := s.client.V1Prices.Create(ctx, &stripe.PriceCreateParams{
		Currency:   stripe.String("brl"),
		UnitAmount: stripe.Int64(int64(math.Round(valorMensal * 100))),
		Recurring: &stripe.PriceCreateRecurringParams{
			Interval: stripe.String("month"),
		},
		Product:   stripe.String(product.ID),
		LookupKey: stripe.String(lookupKey),
	})
	if err != nil {
		return "", fmt.Errorf("criando price Stripe pro plano %s: %w", plano, err)
	}

	return price.ID, nil
}

// buscarPricePorLookupKey consulta a API da Stripe diretamente via HTTP,
// pedindo só o Price com aquele lookup_key. Devolve "" (sem erro) se
// nenhum Price ainda existir com essa chave.
func (s *StripeService) buscarPricePorLookupKey(ctx context.Context, lookupKey string) (string, error) {
	url := fmt.Sprintf("https://api.stripe.com/v1/prices?lookup_keys[]=%s", lookupKey)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+s.secretKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var resultado struct {
		Data []struct {
			ID string `json:"id"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&resultado); err != nil {
		return "", fmt.Errorf("lendo resposta da Stripe: %w", err)
	}

	if len(resultado.Data) == 0 {
		return "", nil
	}
	return resultado.Data[0].ID, nil
}

// CriarCheckoutAssinatura monta o Checkout Session de assinatura pro
// plano Pro/Scale — é a conta PRINCIPAL da Stripe (não Connect), já que
// é a plataforma cobrando o lojista, não uma loja cobrando cliente.
func (s *StripeService) CriarCheckoutAssinatura(ctx context.Context, plano string) (string, error) {
	if plano != "pro" && plano != "scale" {
		return "", fmt.Errorf("plano inválido: %s", plano)
	}

	priceID, err := s.obterOuCriarPriceAssinatura(ctx, plano)
	if err != nil {
		return "", err
	}

	successURL := fmt.Sprintf("%s/cadastro/finalizar?session_id={CHECKOUT_SESSION_ID}", s.frontendURL)
	cancelURL := fmt.Sprintf("%s/", s.frontendURL)

	params := &stripe.CheckoutSessionCreateParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionCreateLineItemParams{
			{Price: stripe.String(priceID), Quantity: stripe.Int64(1)},
		},
		SuccessURL: stripe.String(successURL),
		CancelURL:  stripe.String(cancelURL),
		Metadata: map[string]string{
			"tipo":  "assinatura_plano",
			"plano": plano,
		},
	}

	session, err := s.client.V1CheckoutSessions.Create(ctx, params)
	if err != nil {
		return "", fmt.Errorf("criando sessão de assinatura: %w", err)
	}

	return session.URL, nil
}

// BuscarAssinaturaPendentePorToken é usado pela tela de "finalizar
// cadastro" pra confirmar que o token é válido e ainda não foi usado.
func (s *StripeService) BuscarAssinaturaPendentePorToken(token string) (*domain.AssinaturaPendente, error) {
	return s.assinaturaRepo.BuscarPorToken(token)
}

// BuscarAssinaturaPendentePorSessionID é usado no redirecionamento
// direto da Stripe (?session_id=...) — o frontend chama isso em loop
// curto até o webhook terminar de processar e o registro aparecer.
func (s *StripeService) BuscarAssinaturaPendentePorSessionID(sessionID string) (*domain.AssinaturaPendente, error) {
	return s.assinaturaRepo.BuscarPorSessionID(sessionID)
}

// ProcessarWebhook valida a assinatura do evento e trata os três casos
// possíveis: pedido normal pago, frete de itens guardados pago, ou
// assinatura de plano (Pro/Scale) confirmada.
func (s *StripeService) ProcessarWebhook(payload []byte, signature string) error {
	event, err := stripe.ConstructEvent(payload, signature, s.webhookSecret)
	if err != nil {
		return fmt.Errorf("assinatura do webhook inválida: %w", err)
	}

	if event.Type != "checkout.session.completed" {
		return nil
	}

	var session stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
		return fmt.Errorf("lendo dados do evento: %w", err)
	}

	// Caso 1: frete de itens guardados
	if solicitacaoIDStr, ok := session.Metadata["solicitacao_id"]; ok {
		solicitacaoID, err := strconv.ParseUint(solicitacaoIDStr, 10, 64)
		if err != nil {
			return fmt.Errorf("solicitacao_id inválido nos metadados: %w", err)
		}
		if err := s.solicitacaoRepo.AtualizarStatus(uint(solicitacaoID), domain.StatusSolicitacaoPaga); err != nil {
			return fmt.Errorf("atualizando status da solicitação %d: %w", solicitacaoID, err)
		}
		go s.notificarFretePago(uint(solicitacaoID))
		return nil
	}

	// Caso 2: assinatura de plano Pro/Scale confirmada
	if tipo, ok := session.Metadata["tipo"]; ok && tipo == "assinatura_plano" {
		return s.processarAssinaturaConfirmada(&session)
	}

	// Caso 3: pedido normal
	pedidoIDStr, ok := session.Metadata["pedido_id"]
	if !ok {
		return errors.New("evento sem pedido_id, solicitacao_id nem tipo de assinatura nos metadados")
	}

	pedidoID, err := strconv.ParseUint(pedidoIDStr, 10, 64)
	if err != nil {
		return fmt.Errorf("pedido_id inválido nos metadados: %w", err)
	}

	if err := s.pedidoRepo.AtualizarStatus(uint(pedidoID), domain.StatusPago); err != nil {
		return fmt.Errorf("atualizando status do pedido %d: %w", pedidoID, err)
	}

	go s.processarPosPagamento(uint(pedidoID))

	return nil
}

// processarAssinaturaConfirmada cria o registro de AssinaturaPendente e
// dispara o email com o link de "finalizar cadastro" — sem prazo de
// expiração, já que o cliente pagou de verdade e o link precisa
// continuar válido até ele completar o cadastro, mesmo dias depois.
func (s *StripeService) processarAssinaturaConfirmada(session *stripe.CheckoutSession) error {
	plano := session.Metadata["plano"]

	email := ""
	if session.CustomerDetails != nil {
		email = session.CustomerDetails.Email
	}
	if email == "" {
		return errors.New("sessão de assinatura sem email do cliente")
	}

	customerID := ""
	if session.Customer != nil {
		customerID = session.Customer.ID
	}
	subscriptionID := ""
	if session.Subscription != nil {
		subscriptionID = session.Subscription.ID
	}

	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return fmt.Errorf("gerando token da assinatura: %w", err)
	}
	token := hex.EncodeToString(tokenBytes)

	assinatura := domain.AssinaturaPendente{
		Email:                email,
		Plano:                plano,
		StripeCustomerID:     customerID,
		StripeSubscriptionID: subscriptionID,
		StripeSessionID:      session.ID,
		Token:                token,
	}
	if err := s.assinaturaRepo.Criar(&assinatura); err != nil {
		return fmt.Errorf("salvando assinatura pendente: %w", err)
	}

	if s.emailSender == nil {
		log.Printf("aviso: email não configurado — assinatura pendente %d criada mas email não enviado. Token: %s", assinatura.ID, token)
		return nil
	}

	link := fmt.Sprintf("%s/cadastro/finalizar?token=%s", s.frontendURL, token)
	if err := s.emailSender.EnviarAssinaturaConfirmada(email, plano, link); err != nil {
		log.Printf("falha ao enviar email de assinatura confirmada: %v", err)
	}

	return nil
}

func (s *StripeService) notificarFretePago(solicitacaoID uint) {
	if s.notificationSender == nil {
		log.Printf("WhatsApp não conectado — frete da solicitação %d foi pago mas a notificação foi pulada", solicitacaoID)
		return
	}

	solicitacao, err := s.solicitacaoRepo.BuscarPorID(solicitacaoID)
	if err != nil {
		log.Printf("não foi possível recarregar solicitação %d pra notificar: %v", solicitacaoID, err)
		return
	}

	loja, err := s.lojaRepo.BuscarPorID(solicitacao.LojaID)
	if err != nil {
		log.Printf("não foi possível carregar loja da solicitação %d pra notificar: %v", solicitacaoID, err)
		return
	}
	if loja.WhatsappNumero == "" {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	texto := fmt.Sprintf(
		"📦 Frete pago — %s\n\nO cliente %s pagou o frete pra receber os itens guardados. Endereço: %s",
		loja.Nome, solicitacao.ClienteNome, solicitacao.EnderecoEntrega,
	)
	if err := s.notificationSender.EnviarTextoAdmin(ctx, loja.WhatsappNumero, texto); err != nil {
		log.Printf("falha ao notificar admin do frete pago (solicitação %d): %v", solicitacaoID, err)
	}
}

func (s *StripeService) processarPosPagamento(pedidoID uint) {
	pedido, err := s.pedidoRepo.BuscarPorID(pedidoID)
	if err != nil {
		log.Printf("não foi possível recarregar pedido %d pós-pagamento: %v", pedidoID, err)
		return
	}

	loja, err := s.lojaRepo.BuscarPorID(pedido.LojaID)
	if err != nil {
		log.Printf("não foi possível carregar loja do pedido %d pós-pagamento: %v", pedidoID, err)
		return
	}

	if loja.AfiliadoID != nil {
		s.transferirComissaoAfiliado(pedido, loja)
	}

	produtoRepo := repository.NewProdutoRepository(s.db)

	var estoqueErr error
	_ = estoqueErr
	for _, item := range pedido.Itens {
		var restante int
		var alerta bool
		var nomeItem string

		if item.VariacaoID != nil {
			variacaoRepo := repository.NewVariacaoRepository(s.db)
			restante, estoqueErr = variacaoRepo.SubtrairEstoque(*item.VariacaoID, item.Quantidade)
			if estoqueErr != nil {
				log.Printf("erro ao subtrair estoque da variação %d: %v", *item.VariacaoID, estoqueErr)
				continue
			}
			if restante < 0 {
				continue
			}
			v, emAlerta := variacaoRepo.BuscarEstoqueAlerta(*item.VariacaoID)
			if emAlerta {
				alerta = true
				nomeItem = fmt.Sprintf("%s (%s)", item.ProdutoNome, v.Nome)
			}
		} else {
			restante, estoqueErr = produtoRepo.SubtrairEstoque(item.ProdutoID, item.Quantidade)
			if estoqueErr != nil {
				log.Printf("erro ao subtrair estoque do produto %d: %v", item.ProdutoID, estoqueErr)
				continue
			}
			if restante < 0 {
				continue
			}
			_, emAlerta := produtoRepo.BuscarEstoqueAlerta(item.ProdutoID)
			if emAlerta {
				alerta = true
				nomeItem = item.ProdutoNome
			}
		}

		if alerta && s.notificationSender != nil && loja.WhatsappNumero != "" {
			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			aviso := fmt.Sprintf("⚠️ Alerta de estoque — %s\n\nO produto *%s* chegou a %d unidade(s) restante(s).", loja.Nome, nomeItem, restante)
			if restante == 0 {
				aviso = fmt.Sprintf("⚠️ Estoque esgotado — %s\n\nO produto *%s* acabou e foi marcado como indisponível automaticamente.", loja.Nome, nomeItem)
			}
			if err := s.notificationSender.EnviarNotificacaoAdmin(ctx, pedido, aviso, loja.WhatsappNumero); err != nil {
				log.Printf("falha ao enviar alerta de estoque: %v", err)
			}
			cancel()
		}
	}

	s.notificarPagamento(pedidoID)
}

func (s *StripeService) transferirComissaoAfiliado(pedido *domain.Pedido, loja *domain.Loja) {
	if loja.AfiliadoID == nil {
		return
	}

	afiliado, err := s.afiliadoRepo.BuscarPorID(*loja.AfiliadoID)
	if err != nil {
		log.Printf("aviso: afiliado %d não encontrado pro pedido %d: %v", *loja.AfiliadoID, pedido.ID, err)
		return
	}
	if afiliado.StripeAccountID == "" {
		log.Printf("aviso: afiliado %d ainda não conectou conta Stripe — repasse do pedido %d pulado por enquanto", afiliado.ID, pedido.ID)
		return
	}

	// Proporção fixa: o afiliado sempre fica com ~37,6% da taxa cobrada
	// da loja indicada, qualquer que seja o plano dela (Start/Pro/Scale).
	taxaPercentual := TaxaPlataformaPercentual
	switch loja.Plano {
	case "pro":
		taxaPercentual = 4.0
	case "scale":
		taxaPercentual = 1.5
	}
	const proporcaoAfiliado = 0.376

	valorComissao := pedido.Total * taxaPercentual / 100 * proporcaoAfiliado
	valorCentavos := int64(math.Round(valorComissao * 100))
	if valorCentavos <= 0 {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	params := &stripe.TransferCreateParams{
		Amount:      stripe.Int64(valorCentavos),
		Currency:    stripe.String(string(stripe.CurrencyBRL)),
		Destination: stripe.String(afiliado.StripeAccountID),
	}
	transfer, err := s.client.V1Transfers.Create(ctx, params)
	if err != nil {
		log.Printf("falha ao repassar comissão de afiliado pro pedido %d: %v", pedido.ID, err)
		return
	}

	if err := s.pedidoRepo.AtualizarComissaoAfiliado(pedido.ID, valorComissao, transfer.ID); err != nil {
		log.Printf("aviso: não foi possível salvar registro de comissão do pedido %d: %v", pedido.ID, err)
	}
}

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