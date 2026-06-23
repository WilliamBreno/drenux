package notification

import (
	"context"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
)

// NotificationSender é o ponto de troca entre provedores de WhatsApp.
// Hoje implementado com whatsmeow (whatsmeow_sender.go). Quando migrar
// pra Meta Cloud API, crie uma nova implementação dessa mesma interface
// e troque a injeção de dependência no main.go — nenhum outro lugar do
// código precisa mudar.
type NotificationSender interface {
	// EnviarConfirmacaoPedido avisa o cliente que o pagamento foi
	// confirmado, usando o telefone salvo no próprio pedido.
	EnviarConfirmacaoPedido(ctx context.Context, pedido *domain.Pedido, lojaNome string) error

	// EnviarNotificacaoAdmin avisa o dono da loja que um pedido foi
	// pago. telefoneAdmin vem de Loja.WhatsappNumero — cada loja tem o
	// seu, por isso não é fixo na implementação.
	EnviarNotificacaoAdmin(ctx context.Context, pedido *domain.Pedido, lojaNome, telefoneAdmin string) error

	// EnviarTextoAdmin envia uma mensagem de texto livre pro dono da loja.
	// Usado pelo relatório semanal e alertas de estoque personalizados.
	EnviarTextoAdmin(ctx context.Context, telefoneAdmin, texto string) error
}