package handler

import (
	"net/http"

	"github.com/WilliamBreno/cardapio-backend/internal/service"
	"github.com/gin-gonic/gin"
)

type PlanoHandler struct {
	stripeService *service.StripeService
}

func NewPlanoHandler(stripeService *service.StripeService) *PlanoHandler {
	return &PlanoHandler{stripeService: stripeService}
}

type checkoutAssinaturaRequest struct {
	Plano string `json:"plano" binding:"required,oneof=pro scale"`
}

// CriarCheckout atende POST /planos/checkout — rota pública, chamada
// quando o cliente clica em "Escolher Pro/Scale" na página de planos.
func (h *PlanoHandler) CriarCheckout(c *gin.Context) {
	var req checkoutAssinaturaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	url, err := h.stripeService.CriarCheckoutAssinatura(c.Request.Context(), req.Plano)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}

// VerificarToken atende GET /planos/verificar-token?token=XXX — usado
// pela tela "/cadastro/finalizar" pra confirmar que o pagamento já foi
// feito e pré-preencher email/plano antes do cliente completar o
// cadastro.
func (h *PlanoHandler) VerificarToken(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "token não informado"})
		return
	}

	assinatura, err := h.stripeService.BuscarAssinaturaPendentePorToken(token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"erro": "link inválido ou já utilizado"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"email": assinatura.Email,
		"plano": assinatura.Plano,
		"token": assinatura.Token,
	})
}

type mudarPlanoRequest struct {
	Plano string `json:"plano" binding:"required,oneof=start pro scale"`
}

// VerificarSessao atende GET /planos/verificar-sessao?session_id=XXX —
// usado no redirecionamento direto da Stripe, logo após o pagamento.
// Pode retornar 404 nos primeiros segundos (webhook ainda processando)
// — o frontend tenta de novo por um tempo curto antes de desistir.
func (h *PlanoHandler) VerificarSessao(c *gin.Context) {
	sessionID := c.Query("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"erro": "session_id não informado"})
		return
	}

	assinatura, err := h.stripeService.BuscarAssinaturaPendentePorSessionID(sessionID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"erro": "ainda processando o pagamento, tenta de novo em instantes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"email": assinatura.Email,
		"plano": assinatura.Plano,
		"token": assinatura.Token,
	})
}

// MudarPlano atende POST /admin/plano/mudar — protegida, chamada pelo
// dono da loja na tela "Meu Plano".
func (h *PlanoHandler) MudarPlano(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	var req mudarPlanoRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	resultado, err := h.stripeService.MudarPlano(c.Request.Context(), lojaID, req.Plano)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"checkout_url": resultado.CheckoutURL,
		"imediato":     resultado.Imediato,
	})
}

// CancelarMudancaAgendada atende DELETE /admin/plano/agendamento —
// desfaz um downgrade agendado, mantendo a loja no plano atual.
func (h *PlanoHandler) CancelarMudancaAgendada(c *gin.Context) {
	lojaID := c.GetUint("loja_id")

	if err := h.stripeService.CancelarMudancaAgendada(lojaID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erro": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sucesso": true})
}