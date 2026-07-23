package handler

import (
	"log"
	"net/http"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type MercadoPagoHandler struct {
	mercadoPagoService *service.MercadoPagoService
	frontendURL        string
	cronSecret         string
}

func NewMercadoPagoHandler(mercadoPagoService *service.MercadoPagoService, frontendURL, cronSecret string) *MercadoPagoHandler {
	return &MercadoPagoHandler{
		mercadoPagoService: mercadoPagoService,
		frontendURL:        frontendURL,
		cronSecret:         cronSecret,
	}
}

// IniciarOnboarding atende GET /admin/mercadopago/onboarding — protegida.
// Devolve a URL de autorização OAuth do Mercado Pago; o frontend
// redireciona o dono da loja pra lá.
func (h *MercadoPagoHandler) IniciarOnboarding(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	url, err := h.mercadoPagoService.IniciarOnboarding(lojaID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

// Status atende GET /admin/mercadopago/status — protegida.
func (h *MercadoPagoHandler) Status(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	conectado, err := h.mercadoPagoService.StatusOnboarding(lojaID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"mercadopago_conectado": conectado})
}

// Callback atende GET /admin/mercadopago/callback — rota pública (fora do
// grupo /admin autenticado): é o próprio Mercado Pago que redireciona o
// navegador do dono pra cá depois da autorização, sem nenhum header
// nosso. A identidade da loja vem do "state" assinado (ver
// MercadoPagoService.IniciarOnboarding), não de um token de sessão.
func (h *MercadoPagoHandler) Callback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")

	destino := h.frontendURL + "/admin/configuracoes"

	if erroOAuth := c.Query("error"); erroOAuth != "" {
		c.Redirect(http.StatusFound, destino+"?mercadopago_erro=1")
		return
	}
	if code == "" || state == "" {
		c.Redirect(http.StatusFound, destino+"?mercadopago_erro=1")
		return
	}

	if _, err := h.mercadoPagoService.ProcessarCallback(c.Request.Context(), code, state); err != nil {
		log.Printf("erro processando callback do Mercado Pago: %v", err)
		c.Redirect(http.StatusFound, destino+"?mercadopago_erro=1")
		return
	}

	c.Redirect(http.StatusFound, destino+"?mercadopago_conectado=1")
}

type checkoutMercadoPagoParams struct {
	ID uint `uri:"id" binding:"required"`
}

// Checkout atende POST /pedidos/:id/checkout — rota pública, no lugar do
// StripeHandler.Checkout que atendia essa rota antes (ver Fase 5.2 do
// roadmap: só a chamada foi trocada, o código da Stripe continua no
// repositório, só não é mais chamado por essa rota).
func (h *MercadoPagoHandler) Checkout(c *gin.Context) {
	var params checkoutMercadoPagoParams
	if err := c.ShouldBindUri(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "id inválido"})
		return
	}

	url, err := h.mercadoPagoService.CriarCheckout(c.Request.Context(), params.ID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

// Webhook atende POST /webhooks/mercadopago — chamado pelo próprio
// Mercado Pago. O ID do pagamento vem via query string (?data.id=... ou
// ?id=..., dependendo do formato da notificação — v1 "topic/id" e v2
// "type/data.id" convivem na API do Mercado Pago).
func (h *MercadoPagoHandler) Webhook(c *gin.Context) {
	tipo := c.Query("type")
	if tipo == "" {
		tipo = c.Query("topic")
	}
	if tipo != "" && tipo != "payment" {
		c.JSON(http.StatusOK, gin.H{"received": true}) // outros tipos de evento não nos interessam ainda
		return
	}

	dataID := c.Query("data.id")
	if dataID == "" {
		dataID = c.Query("id")
	}
	if dataID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "notificação sem id de pagamento"})
		return
	}

	signature := c.GetHeader("x-signature")
	requestID := c.GetHeader("x-request-id")
	if err := h.mercadoPagoService.ValidarAssinaturaWebhook(signature, requestID, dataID); err != nil {
		log.Printf("erro validando assinatura do webhook Mercado Pago: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"erro": "notificação inválida"})
		return
	}

	if err := h.mercadoPagoService.ProcessarNotificacaoPagamento(c.Request.Context(), dataID); err != nil {
		log.Printf("erro processando notificação de pagamento %s do Mercado Pago: %v", dataID, err)
		c.JSON(http.StatusBadRequest, gin.H{"erro": "não foi possível processar a notificação"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

// RenovarTokens atende POST /mercadopago/renovar-tokens — chamado por um
// cron externo (mesmo padrão de /relatorio/semanal), protegido pelo
// mesmo header X-Cron-Secret.
func (h *MercadoPagoHandler) RenovarTokens(c *gin.Context) {
	if h.cronSecret != "" && c.GetHeader("X-Cron-Secret") != h.cronSecret {
		c.JSON(http.StatusUnauthorized, gin.H{"erro": "não autorizado"})
		return
	}

	renovadas, erros := h.mercadoPagoService.RenovarTokensExpirando(c.Request.Context())

	c.JSON(http.StatusOK, gin.H{
		"renovadas": renovadas,
		"erros":     erros,
	})
}
