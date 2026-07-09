package handler

import (
	"io"
	"log"
	"net/http"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type StripeHandler struct {
	stripeService *service.StripeService
	frontendURL   string
}

func NewStripeHandler(stripeService *service.StripeService, frontendURL string) *StripeHandler {
	return &StripeHandler{stripeService: stripeService, frontendURL: frontendURL}
}

// IniciarOnboarding atende POST /admin/stripe/onboarding — protegida.
// Devolve uma URL de uso único pra redirecionar o dono da loja pro
// fluxo hospedado da Stripe, onde ele preenche os dados da própria conta.
func (h *StripeHandler) IniciarOnboarding(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	// Volta pra tela de configurações do painel depois (sucesso ou link
	// expirado — os dois casos usam o mesmo destino).
	returnURL := h.frontendURL + "/admin/configuracoes"

	url, err := h.stripeService.IniciarOnboarding(c.Request.Context(), lojaID, returnURL, returnURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

// Status atende GET /admin/stripe/status — protegida. Diz se a loja já
// iniciou a conexão com a Stripe.
func (h *StripeHandler) Status(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	conectado, err := h.stripeService.StatusOnboarding(lojaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"stripe_conectado": conectado})
}

type checkoutParams struct {
	ID uint `uri:"id" binding:"required"`
}

// Checkout atende POST /pedidos/:id/checkout — rota pública. O cliente
// final (sem login) gera a sessão de pagamento pro pedido que acabou de
// criar.
func (h *StripeHandler) Checkout(c *gin.Context) {
	var params checkoutParams
	if err := c.ShouldBindUri(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "id inválido"})
		return
	}

	url, err := h.stripeService.CriarCheckout(c.Request.Context(), params.ID, h.frontendURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

// CheckoutFrete atende POST /solicitacoes/:id/checkout — rota pública. O
// cliente paga só o frete de uma entrega de itens que já tem guardados.
func (h *StripeHandler) CheckoutFrete(c *gin.Context) {
	var params checkoutParams
	if err := c.ShouldBindUri(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "id inválido"})
		return
	}

	url, err := h.stripeService.CriarCheckoutFrete(c.Request.Context(), params.ID, h.frontendURL)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

// Webhook atende POST /webhooks/stripe — chamado pela própria Stripe,
// não por um navegador. Por isso lê o corpo bruto da requisição em vez
// de usar o binding JSON do Gin: a verificação de assinatura precisa dos
// bytes exatos que a Stripe enviou, sem nenhuma transformação.
func (h *StripeHandler) Webhook(c *gin.Context) {
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "não foi possível ler o corpo da requisição"})
		return
	}

	signature := c.GetHeader("Stripe-Signature")

	if err := h.stripeService.ProcessarWebhook(payload, signature); err != nil {
		// Logamos no servidor mas não detalhamos o erro pro chamador —
		// não queremos dar pista pra quem tentar forjar requisições.
		log.Printf("erro processando webhook Stripe: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"erro": "evento inválido"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}
