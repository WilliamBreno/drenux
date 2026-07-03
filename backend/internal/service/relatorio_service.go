package service

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/WilliamBreno/cardapio-backend/internal/notification"
	"github.com/WilliamBreno/cardapio-backend/internal/repository"
	"gorm.io/gorm"
)

type RelatorioService struct {
	lojaRepo           *repository.LojaRepository
	pedidoRepo         *repository.PedidoRepository
	notificationSender notification.NotificationSender
}

func NewRelatorioService(db *gorm.DB, notificationSender notification.NotificationSender) *RelatorioService {
	return &RelatorioService{
		lojaRepo:           repository.NewLojaRepository(db),
		pedidoRepo:         repository.NewPedidoRepository(db),
		notificationSender: notificationSender,
	}
}

// EnviarRelatoriosSemana envia o relatório da semana anterior pra todas
// as lojas que têm WhatsApp configurado e tiveram pelo menos 1 pedido
// pago na semana.
func (s *RelatorioService) EnviarRelatoriosSemana(ctx context.Context) (enviados int, erros int) {
	if s.notificationSender == nil {
		log.Println("relatorio: WhatsApp não conectado, pulando envio")
		return
	}

	fusoBrasil, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		fusoBrasil = time.UTC
	}

	agora := time.Now().In(fusoBrasil)
	// Semana anterior: domingo a sábado
	inicioSemana := agora.AddDate(0, 0, -7).Truncate(24 * time.Hour)
	fimSemana := agora.Truncate(24 * time.Hour)

	// Semana retrasada pra comparação
	inicioAnterior := inicioSemana.AddDate(0, 0, -7)
	fimAnterior := inicioSemana

	lojas, err := s.lojaRepo.ListarComWhatsapp()
	if err != nil {
		log.Printf("relatorio: erro ao listar lojas: %v", err)
		return
	}

	for _, loja := range lojas {
		resumo, err := s.pedidoRepo.BuscarResumoSemana(loja.ID, inicioSemana, fimSemana)
		if err != nil || resumo.TotalPedidos == 0 {
			continue // sem pedidos na semana, não manda relatório
		}

		resumoAnterior, _ := s.pedidoRepo.BuscarResumoSemana(loja.ID, inicioAnterior, fimAnterior)

		msg := montarMensagemRelatorio(loja.Nome, resumo, resumoAnterior, inicioSemana, fimSemana)

		ctxEnvio, cancel := context.WithTimeout(ctx, 15*time.Second)
		if err := s.notificationSender.EnviarTextoAdmin(ctxEnvio, loja.WhatsappNumero, msg); err != nil {
			log.Printf("relatorio: erro ao enviar pra loja %d: %v", loja.ID, err)
			erros++
		} else {
			enviados++
		}
		cancel()
	}

	return
}

func montarMensagemRelatorio(
	nomeLoja string,
	semana *repository.ResumoSemana,
	anterior *repository.ResumoSemana,
	inicio, fim time.Time,
) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("📊 *Relatório semanal — %s*\n", nomeLoja))
	sb.WriteString(fmt.Sprintf("%s a %s\n\n",
		inicio.Format("02/01"),
		fim.AddDate(0, 0, -1).Format("02/01/2006"),
	))

	sb.WriteString(fmt.Sprintf("🛒 Pedidos pagos: *%d*\n", semana.TotalPedidos))
	sb.WriteString(fmt.Sprintf("💰 Faturamento: *R$ %.2f*\n", semana.Faturamento))

	if semana.ProdutoTop != "" {
		sb.WriteString(fmt.Sprintf("⭐ Mais vendido: *%s* (%dx)\n", semana.ProdutoTop, semana.QuantidadeTop))
	}

	// Comparação com semana anterior
	if anterior != nil && anterior.TotalPedidos > 0 {
		sb.WriteString("\n")
		if semana.Faturamento >= anterior.Faturamento {
			diff := semana.Faturamento - anterior.Faturamento
			sb.WriteString(fmt.Sprintf("📈 +R$ %.2f comparado à semana anterior", diff))
		} else {
			diff := anterior.Faturamento - semana.Faturamento
			sb.WriteString(fmt.Sprintf("📉 -R$ %.2f comparado à semana anterior", diff))
		}
	}

	return sb.String()
}
