package notification

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/WilliamBreno/cardapio-backend/internal/domain"
	"github.com/mdp/qrterminal/v3"
	"go.mau.fi/whatsmeow"
	waE2E "go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/store"
	"go.mau.fi/whatsmeow/store/sqlstore"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"

	_ "github.com/lib/pq" // driver postgres registrado no database/sql, usado pelo sqlstore
)

// WhatsmeowSender implementa NotificationSender usando o protocolo do
// WhatsApp Web (via whatsmeow) — um único número da plataforma manda as
// mensagens de todas as lojas, cada uma identificada pelo nome no texto.
type WhatsmeowSender struct {
	client *whatsmeow.Client
}

// NewWhatsmeowSender conecta usando uma sessão JÁ pareada anteriormente
// (veja Pair e cmd/whatsapp-pair). Use no startup do serviço principal.
func NewWhatsmeowSender(ctx context.Context, connString string) (*WhatsmeowSender, error) {
	_, deviceStore, err := abrirDeviceStore(ctx, connString)
	if err != nil {
		return nil, err
	}

	if deviceStore.ID == nil {
		return nil, fmt.Errorf("nenhum número pareado ainda — rode antes o comando cmd/whatsapp-pair")
	}

	clientLog := waLog.Stdout("WhatsmeowClient", "ERROR", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)
	if err := client.Connect(); err != nil {
		return nil, fmt.Errorf("conectando sessão existente: %w", err)
	}

	return &WhatsmeowSender{client: client}, nil
}

// Pair faz o pareamento inicial via QR code. Rode uma única vez,
// localmente (não em produção), apontando pra mesma DATABASE_URL de
// produção — depois que a sessão é salva no banco, o serviço principal
// nunca mais pede QR code, mesmo após redeploy.
func Pair(ctx context.Context, connString string) error {
	_, deviceStore, err := abrirDeviceStore(ctx, connString)
	if err != nil {
		return err
	}
	if deviceStore.ID != nil {
		fmt.Println("Esse número já está pareado, nada a fazer.")
		return nil
	}

	clientLog := waLog.Stdout("WhatsmeowClient", "INFO", true)
	client := whatsmeow.NewClient(deviceStore, clientLog)

	qrChan, _ := client.GetQRChannel(ctx)
	if err := client.Connect(); err != nil {
		return fmt.Errorf("conectando pela primeira vez: %w", err)
	}

	for evt := range qrChan {
		if evt.Event == "code" {
			qrterminal.GenerateHalfBlock(evt.Code, qrterminal.L, os.Stdout)
			fmt.Println("Escaneie o QR code acima com o WhatsApp do número da plataforma")
		} else {
			fmt.Println("Status do pareamento:", evt.Event)
		}
	}

	// Depois que o pareamento é confirmado, o WhatsApp ainda troca
	// mensagens internas (sincronização inicial, upload das chaves de
	// criptografia/prekeys). Desconectar rápido demais nesse momento
	// deixa esse processo pela metade e corrompe o estado salvo no
	// banco — foi exatamente isso que causou o erro de chave
	// estrangeira na primeira tentativa. Esperamos um tempo de
	// segurança antes de fechar a conexão.
	fmt.Println("Pareado! Aguardando a sincronização inicial terminar (não feche ainda)...")
	time.Sleep(15 * time.Second)
	fmt.Println("Sincronização concluída.")

	client.Disconnect()
	return nil
}

func abrirDeviceStore(ctx context.Context, connString string) (*sqlstore.Container, *store.Device, error) {
	dbLog := waLog.Stdout("WhatsmeowDB", "ERROR", true)
	container, err := sqlstore.New(ctx, "postgres", connString, dbLog)
	if err != nil {
		return nil, nil, fmt.Errorf("conectando store do whatsmeow: %w", err)
	}
	deviceStore, err := container.GetFirstDevice(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("obtendo device store: %w", err)
	}
	return container, deviceStore, nil
}

func (s *WhatsmeowSender) EnviarConfirmacaoPedido(ctx context.Context, pedido *domain.Pedido, lojaNome string) error {
	return s.enviarTexto(ctx, pedido.ClienteTelefone, montarMensagemCliente(pedido, lojaNome))
}

func (s *WhatsmeowSender) EnviarNotificacaoAdmin(ctx context.Context, pedido *domain.Pedido, lojaNome, telefoneAdmin string) error {
	if telefoneAdmin == "" {
		return fmt.Errorf("loja %q não tem whatsapp configurado", lojaNome)
	}
	return s.enviarTexto(ctx, telefoneAdmin, montarMensagemAdmin(pedido, lojaNome))
}

// enviarTexto resolve o número pelo IsOnWhatsApp antes de mandar a
// mensagem, em vez de montar o destinatário direto a partir do número
// puro. É essa consulta ao servidor da própria WhatsApp que resolve o
// identificador interno (LID) certo — sem isso, o envio falha
// silenciosamente com "no LID found", mesmo pra números válidos.
func (s *WhatsmeowSender) enviarTexto(ctx context.Context, telefone, texto string) error {
	resultados, err := s.client.IsOnWhatsApp(ctx, []string{"+" + telefone})
	if err != nil {
		return fmt.Errorf("verificando número %s no WhatsApp: %w", telefone, err)
	}
	if len(resultados) == 0 || !resultados[0].IsIn {
		return fmt.Errorf("número %s não está registrado no WhatsApp", telefone)
	}

	msg := &waE2E.Message{Conversation: proto.String(texto)}
	if _, err := s.client.SendMessage(ctx, resultados[0].JID, msg); err != nil {
		return fmt.Errorf("enviando mensagem para %s: %w", telefone, err)
	}
	return nil
}

// Close encerra a conexão com o WhatsApp. Chame no shutdown do serviço.
func (s *WhatsmeowSender) Close() {
	s.client.Disconnect()
}