package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/WilliamBreno/cardapio-backend/internal/notification"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"gorm.io/gorm"
)

// PosPagamentoService concentra o que precisa acontecer depois que um
// pedido é confirmado como pago, independente de qual processador
// (Stripe, Mercado Pago) recebeu o dinheiro: descontar estoque, avisar o
// dono quando bate o alerta configurado, e notificar cliente/dono via
// WhatsApp. Extraído do que antes vivia só dentro do StripeService pra
// não duplicar essa lógica quando o Mercado Pago entrou (ver
// docs/plano-melhorias-drenux.md, Fase 5) — repasse de comissão de
// afiliado NÃO está aqui porque hoje só existe via Stripe Transfer,
// específico de cada processador (ver MercadoPagoService.processarPosPagamento).
type PosPagamentoService struct {
	db                 *gorm.DB
	pedidoRepo         *repository.PedidoRepository
	lojaRepo           *repository.LojaRepository
	notificationSender notification.NotificationSender
}

func NewPosPagamentoService(db *gorm.DB, notificationSender notification.NotificationSender) *PosPagamentoService {
	return &PosPagamentoService{
		db:                 db,
		pedidoRepo:         repository.NewPedidoRepository(db),
		lojaRepo:           repository.NewLojaRepository(db),
		notificationSender: notificationSender,
	}
}

// ProcessarPedidoPago desconta o estoque de cada item do pedido (por
// variação, quando houver, senão do produto) e notifica cliente/dono.
// Não devolve erro — é sempre chamado a partir de uma goroutine própria
// do processador de pagamento, então falha aqui só é logada.
func (s *PosPagamentoService) ProcessarPedidoPago(pedidoID uint) {
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

	produtoRepo := repository.NewProdutoRepository(s.db)

	for _, item := range pedido.Itens {
		var restante int
		var erroEstoque error
		var alerta bool
		var nomeItem string

		if item.VariacaoID != nil {
			variacaoRepo := repository.NewVariacaoRepository(s.db)
			restante, erroEstoque = variacaoRepo.SubtrairEstoque(*item.VariacaoID, item.Quantidade)
			if erroEstoque != nil {
				log.Printf("erro ao subtrair estoque da variação %d: %v", *item.VariacaoID, erroEstoque)
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
			restante, erroEstoque = produtoRepo.SubtrairEstoque(item.ProdutoID, item.Quantidade)
			if erroEstoque != nil {
				log.Printf("erro ao subtrair estoque do produto %d: %v", item.ProdutoID, erroEstoque)
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

	s.notificarPagamento(pedido, loja.Nome, loja.WhatsappNumero)
}

func (s *PosPagamentoService) notificarPagamento(pedido *domain.Pedido, lojaNome, whatsappNumero string) {
	if s.notificationSender == nil {
		log.Printf("WhatsApp não conectado — pedido %d foi pago mas a notificação foi pulada", pedido.ID)
		return
	}

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := s.notificationSender.EnviarConfirmacaoPedido(ctx, pedido, lojaNome); err != nil {
			log.Printf("falha ao notificar cliente do pedido %d: %v", pedido.ID, err)
		}
	}()

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := s.notificationSender.EnviarNotificacaoAdmin(ctx, pedido, lojaNome, whatsappNumero); err != nil {
			log.Printf("falha ao notificar admin do pedido %d: %v", pedido.ID, err)
		}
	}()
}
